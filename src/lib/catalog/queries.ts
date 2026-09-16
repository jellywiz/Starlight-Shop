import config from '@payload-config'
import { getPayload, type Payload, type Where } from 'payload'

import { pickTranslation } from '@/hooks/localized'
import { LOCALES, LOCALE_META, type Locale } from '@/i18n/config'
import type { Category, ShopSetting, User } from '@/payload-types'
import {
  type PublicShopSettings,
  SHOP_DEFAULTS,
  instagramHandleFromUrl,
  isInstagramProfileUrl,
} from '@/lib/shop'

import { escapeLike, tokenize } from './normalize'
import type { CatalogQuery } from './params'
import { toCatalogItem, toDeliveryCity, toProductDetail, toPublicImage } from './projection'
import { sortByRelevance } from './ranking'
import {
  CatalogUnavailableError,
  CategoryUnavailableError,
  type CatalogFilters,
  type CatalogItem,
  type CatalogResult,
  type DeliveryCity,
  type ProductDetail,
} from './types'

/**
 * Server-side catalog layer (spec sections 9 and 10). Every public read goes through
 * Payload's access control (`overrideAccess: false`) with an explicit publication filter
 * and `draft: false`; `context.catalogRead` unlocks the derived search fields needed
 * for ranking. Database failures surface as CatalogUnavailableError (HTTP 503).
 */

export async function getPayloadClient(): Promise<Payload> {
  return getPayload({ config })
}

const PUBLISHED: Where = { _status: { equals: 'published' } }

const CATALOG_READ_ARGS = {
  draft: false as const,
  overrideAccess: false as const,
  context: { catalogRead: true },
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof CategoryUnavailableError) {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    // Log the error class, never request contents (spec section 12).
    console.error(`[catalog] dependency failure: ${message.slice(0, 200)}`)
    throw new CatalogUnavailableError(error)
  }
}

function sortFor(query: CatalogQuery): string[] {
  switch (query.sort) {
    case 'price-asc':
      return ['priceIqd', 'id']
    case 'price-desc':
      return ['-priceIqd', '-id']
    case 'newest':
    case 'relevance':
    default:
      return ['-publishedAt', '-id']
  }
}

function relationId(value: unknown): number | null {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'object' && value !== null && typeof (value as Category).id === 'number') {
    return (value as Category).id
  }
  return null
}

/**
 * Resolves a category slug to an ACTIVE category id. A missing or inactive category is a
 * distinct client error (CATEGORY_UNAVAILABLE), never an empty or unrelated result.
 */
async function resolveActiveCategory(payload: Payload, slug: string): Promise<number> {
  const category = await payload.find({
    collection: 'categories',
    where: { and: [{ slug: { equals: slug } }, { isActive: { equals: true } }] },
    depth: 0,
    limit: 1,
    overrideAccess: false,
  })
  if (category.totalDocs === 0) {
    throw new CategoryUnavailableError(slug)
  }
  return category.docs[0].id
}

async function buildWhere(payload: Payload, query: CatalogQuery): Promise<Where> {
  const and: Where[] = [PUBLISHED]

  if (query.category) {
    const id = await resolveActiveCategory(payload, query.category)
    and.push({ category: { equals: id } })
  }
  if (query.minIqd !== null) {
    and.push({ priceIqd: { greater_than_equal: query.minIqd } })
  }
  if (query.maxIqd !== null) {
    and.push({ priceIqd: { less_than_equal: query.maxIqd } })
  }
  if (query.availability !== 'all') {
    and.push({ isAvailable: { equals: query.availability === 'available' } })
  }
  // Every token must appear somewhere in the searchable content (names + descriptions).
  for (const token of tokenize(query.normalizedQ)) {
    and.push({ searchText: { contains: escapeLike(token) } })
  }
  return { and }
}

/** Bounded, paginated public catalog listing. */
export async function listProducts(query: CatalogQuery): Promise<CatalogResult> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const where = await buildWhere(payload, query)
    const args = CATALOG_READ_ARGS

    if (query.sort === 'relevance' && query.normalizedQ) {
      // Bounded in-memory ranking: at catalog scale (about 100 products) every match is
      // fetched once and ordered deterministically.
      const all = await payload.find({
        collection: 'products',
        where,
        depth: 1,
        pagination: false,
        limit: 0,
        sort: ['-publishedAt', '-id'],
        ...args,
      })
      const ranked = sortByRelevance(all.docs, query.normalizedQ)
      const total = ranked.length
      const totalPages = Math.ceil(total / query.limit)
      const start = (query.page - 1) * query.limit
      const items = ranked
        .slice(start, start + query.limit)
        .map((doc) => toCatalogItem(doc, query.locale))
        .filter((item): item is CatalogItem => item !== null)
      return { items, total, page: query.page, pageSize: query.limit, totalPages }
    }

    const result = await payload.find({
      collection: 'products',
      where,
      depth: 1,
      limit: query.limit,
      page: query.page,
      sort: sortFor(query),
      ...args,
    })
    const items = result.docs
      .map((doc) => toCatalogItem(doc, query.locale))
      .filter((item): item is CatalogItem => item !== null)
    return {
      items,
      total: result.totalDocs,
      page: result.page ?? query.page,
      pageSize: query.limit,
      totalPages: result.totalPages,
    }
  })
}

/** Published product detail by slug, or null when unknown/unpublished (HTTP 404). */
export async function getProductBySlug(
  slug: string,
  locale: Locale,
): Promise<ProductDetail | null> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      where: { and: [PUBLISHED, { slug: { equals: slug } }] },
      depth: 1,
      limit: 1,
      ...CATALOG_READ_ARGS,
    })
    const doc = result.docs[0]
    return doc ? toProductDetail(doc, locale) : null
  })
}

/**
 * Latest saved revision (draft or published) for an authenticated owner's preview.
 * Access control is applied with the given user; anonymous callers get null.
 */
export async function getProductPreview(
  slug: string,
  locale: Locale,
  user: User | null,
): Promise<ProductDetail | null> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      depth: 1,
      limit: 1,
      draft: true,
      overrideAccess: false,
      user,
      context: { catalogRead: true },
    })
    const doc = result.docs[0]
    return doc ? toProductDetail(doc, locale) : null
  })
}

/** Up to four published products from the same category, excluding the current one. */
export async function getRelatedProducts(
  product: ProductDetail,
  locale: Locale,
): Promise<CatalogItem[]> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      where: {
        and: [
          PUBLISHED,
          { 'category.slug': { equals: product.category.slug } },
          { id: { not_equals: product.id } },
        ],
      },
      depth: 1,
      limit: 4,
      sort: ['-publishedAt', '-id'],
      ...CATALOG_READ_ARGS,
    })
    return result.docs
      .map((doc) => toCatalogItem(doc, locale))
      .filter((item): item is CatalogItem => item !== null)
  })
}

/** Up to eight explicitly featured published products for the home page. */
export async function getFeaturedProducts(locale: Locale): Promise<CatalogItem[]> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      where: { and: [PUBLISHED, { featured: { equals: true } }] },
      depth: 1,
      limit: 8,
      sort: ['-publishedAt', '-id'],
      ...CATALOG_READ_ARGS,
    })
    return result.docs
      .map((doc) => toCatalogItem(doc, locale))
      .filter((item): item is CatalogItem => item !== null)
  })
}

/**
 * Categories offered in customer navigation and filters: active AND used by at least one
 * published product (spec section 6). Empty categories stay in the admin for future use.
 */
export async function getCatalogFilters(locale: Locale): Promise<CatalogFilters> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const [categories, published] = await Promise.all([
      payload.find({
        collection: 'categories',
        where: { isActive: { equals: true } },
        sort: ['sortOrder', 'id'],
        depth: 0,
        pagination: false,
        limit: 0,
        overrideAccess: false,
      }),
      payload.find({
        collection: 'products',
        where: PUBLISHED,
        depth: 0,
        pagination: false,
        limit: 0,
        draft: false,
        overrideAccess: false,
        select: { category: true },
      }),
    ])
    const used = new Set<number>()
    for (const doc of published.docs) {
      const id = relationId(doc.category)
      if (id !== null) {
        used.add(id)
      }
    }
    return {
      categories: categories.docs
        .filter((c: Category) => used.has(c.id))
        .map((c: Category) => ({
          slug: c.slug,
          name: pickTranslation(c.name, locale) ?? c.slug,
        })),
    }
  })
}

/** Resolves an old slug through the redirects collection to the current published slug. */
export async function resolveRedirect(oldSlug: string): Promise<string | null> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'redirects',
      where: { oldSlug: { equals: oldSlug } },
      depth: 1,
      limit: 1,
      overrideAccess: false,
      draft: false,
    })
    const target = result.docs[0]?.product
    if (!target || typeof target !== 'object') {
      return null
    }
    if (target._status !== 'published' || !target.slug || target.slug === oldSlug) {
      return null
    }
    return target.slug
  })
}

/** Slugs and update times of every published product, for the sitemap. */
export async function listPublishedProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      where: PUBLISHED,
      depth: 0,
      pagination: false,
      limit: 0,
      sort: ['-publishedAt', '-id'],
      draft: false,
      overrideAccess: false,
      select: { slug: true, updatedAt: true },
    })
    return result.docs
      .filter((d) => typeof d.slug === 'string' && d.slug)
      .map((d) => ({ slug: d.slug as string, updatedAt: d.updatedAt }))
  })
}

/**
 * Active delivery cities in the requested language, ordered by sortOrder, then localized
 * name, then id (spec section 6). Independent of product records. An empty list means
 * the query succeeded and no city is active; failures throw CatalogUnavailableError.
 */
export async function listDeliveryCities(locale: Locale): Promise<DeliveryCity[]> {
  return guard(async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'cities',
      where: { isActive: { equals: true } },
      sort: ['sortOrder', 'id'],
      depth: 0,
      pagination: false,
      limit: 0,
      overrideAccess: false,
    })
    const collator = new Intl.Collator(LOCALE_META[locale].intl)
    const rows = result.docs.map((doc) => ({ doc, city: toDeliveryCity(doc, locale) }))
    return rows
      .filter(
        (row): row is { doc: (typeof rows)[number]['doc']; city: DeliveryCity } =>
          row.city !== null,
      )
      .sort((a, b) => {
        const order = (a.doc.sortOrder ?? 0) - (b.doc.sortOrder ?? 0)
        if (order !== 0) {
          return order
        }
        const byName = collator.compare(a.city.name, b.city.name)
        return byName !== 0 ? byName : a.city.id - b.city.id
      })
      .map((row) => row.city)
  })
}

export type ShopSettingsResult = { settings: PublicShopSettings; fromFallback: boolean }

function fallbackSettings(): PublicShopSettings {
  return {
    publicName: SHOP_DEFAULTS.publicName,
    instagramUrl: SHOP_DEFAULTS.instagramUrl,
    instagramHandle: instagramHandleFromUrl(SHOP_DEFAULTS.instagramUrl),
    aboutText: null,
    logo: null,
    defaultLocale: 'ckb',
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Public shop settings projection: name, logo, introduction and the Instagram
 * destination only (spec section 10). Never throws: when the database is unavailable the
 * confirmed static values are returned so the contact page and Instagram action keep
 * working.
 */
export async function getShopSettings(locale: Locale): Promise<ShopSettingsResult> {
  try {
    const payload = await getPayloadClient()
    const doc = (await payload.findGlobal({
      slug: 'shop-settings',
      depth: 1,
      overrideAccess: false,
    })) as ShopSetting
    const fallback = fallbackSettings()
    const defaultLocale = (LOCALES as readonly string[]).includes(doc.defaultLocale ?? '')
      ? (doc.defaultLocale as Locale)
      : 'ckb'
    const logoImage = doc.logo
      ? toPublicImage(doc.logo, doc.publicName ?? fallback.publicName)
      : null
    const instagramUrl = isInstagramProfileUrl(doc.instagramUrl)
      ? doc.instagramUrl.trim()
      : fallback.instagramUrl
    return {
      fromFallback: false,
      settings: {
        publicName: text(doc.publicName) ?? fallback.publicName,
        instagramUrl,
        instagramHandle: instagramHandleFromUrl(instagramUrl),
        aboutText: text(doc.aboutText?.[locale]),
        logo: logoImage
          ? { url: logoImage.src, width: logoImage.width, height: logoImage.height }
          : null,
        defaultLocale,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[catalog] shop settings unavailable: ${message.slice(0, 200)}`)
    return { settings: fallbackSettings(), fromFallback: true }
  }
}
