import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
  ValidationFieldError,
} from 'payload'
import { APIError, ValidationError } from 'payload'

import { LOCALES, type Locale, isLocale, DEFAULT_LOCALE } from '@/i18n/config'
import { isValidIqd } from '@/lib/catalog/dinar'
import { buildNormalizedName, buildSearchText } from '@/lib/catalog/normalize'
import { isValidSlug, slugify } from '@/lib/slug'
import {
  type LocaleMap,
  localeValues,
  mergeLocalizedField,
  missingLocales,
  readAllLocales,
} from '@/hooks/localized'

export const LOCALE_LABELS: Record<Locale, string> = {
  ckb: 'Sorani Kurdish (ckb)',
  ar: 'Arabic (ar)',
  en: 'English (en)',
}

/** Field limits from the product data contract (spec section 5). */
export const LIMITS = {
  name: 160,
  description: 5000,
  photosMin: 1,
  photosMax: 8,
  altText: 200,
} as const

type AnyDoc = Record<string, unknown>

export function requestLocale(req: PayloadRequest): Locale {
  const locale = req.locale
  return isLocale(locale) ? locale : DEFAULT_LOCALE
}

export function relationId(value: unknown): number | string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return typeof value === 'number' || typeof value === 'string' ? value : null
}

function relationIds(value: unknown): Array<number | string> {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(relationId).filter((v): v is number | string => v !== null)
}

/**
 * Builds the complete all-locales picture of the product that WOULD be stored if this
 * request succeeds: the stored document (all locales) with the incoming request-locale
 * data merged on top.
 */
async function mergedProduct(args: {
  data: AnyDoc
  id?: number | string
  req: PayloadRequest
}): Promise<{ doc: AnyDoc; name: LocaleMap; description: LocaleMap }> {
  const { data, id, req } = args
  const locale = requestLocale(req)
  const existing = id !== undefined ? await readAllLocales(req, 'products', id) : null
  const doc: AnyDoc = { ...(existing ?? {}), ...data }
  const name = mergeLocalizedField(existing?.name, data.name, locale)
  const description = mergeLocalizedField(existing?.description, data.description, locale)
  return { doc, name, description }
}

/** Errors that prevent publication (spec section 5 "Publishing validation"). */
async function publicationErrors(args: {
  doc: AnyDoc
  name: LocaleMap
  description: LocaleMap
  req: PayloadRequest
}): Promise<ValidationFieldError[]> {
  const { doc, name, description, req } = args
  const errors: ValidationFieldError[] = []

  for (const locale of missingLocales(name, { maxLength: LIMITS.name })) {
    errors.push({
      path: 'name',
      message: `Name is missing or too long in ${LOCALE_LABELS[locale]}.`,
    })
  }
  for (const locale of missingLocales(description, { maxLength: LIMITS.description })) {
    errors.push({
      path: 'description',
      message: `Description is missing or too long in ${LOCALE_LABELS[locale]}.`,
    })
  }
  if (!isValidSlug(doc.slug)) {
    errors.push({
      path: 'slug',
      message:
        'A Latin URL slug is required before publishing. It is filled automatically from the English name; enter one by hand if the English name has no Latin letters.',
    })
  }

  const categoryId = relationId(doc.category)
  if (categoryId === null) {
    errors.push({ path: 'category', message: 'Choose exactly one active category.' })
  } else {
    const category = await req.payload.findByID({
      collection: 'categories',
      id: categoryId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!category) {
      errors.push({ path: 'category', message: 'The selected category no longer exists.' })
    } else if (!category.isActive) {
      errors.push({
        path: 'category',
        message: 'The selected category is inactive. Activate it or choose another category.',
      })
    }
  }

  const photoIds = relationIds(doc.photos)
  if (photoIds.length < LIMITS.photosMin || photoIds.length > LIMITS.photosMax) {
    errors.push({
      path: 'photos',
      message: `Add between ${LIMITS.photosMin} and ${LIMITS.photosMax} photos. The first photo is the cover.`,
    })
  } else {
    const media = await req.payload.find({
      collection: 'media',
      where: { id: { in: photoIds } },
      locale: 'all',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const byId = new Map(media.docs.map((m) => [String(m.id), m]))
    photoIds.forEach((photoId, index) => {
      const m = byId.get(String(photoId))
      if (!m) {
        errors.push({ path: 'photos', message: `Photo ${index + 1} no longer exists.` })
        return
      }
      const alt = m.altText as unknown as LocaleMap
      const missing = missingLocales(alt, { maxLength: LIMITS.altText })
      if (missing.length > 0) {
        errors.push({
          path: 'photos',
          message: `Photo ${index + 1} (${m.filename}) is missing alt text in ${missing.map((l) => LOCALE_LABELS[l]).join(', ')}. Edit the image in Media.`,
        })
      }
    })
  }

  if (!isValidIqd(doc.priceIqd)) {
    errors.push({
      path: 'priceIqd',
      message: 'Enter a positive whole Iraqi dinar price (1 to 999,999,999).',
    })
  }
  if (typeof doc.isAvailable !== 'boolean') {
    errors.push({ path: 'isAvailable', message: 'Choose Available or Unavailable explicitly.' })
  }
  return errors
}

async function englishName(
  data: AnyDoc,
  id: number | string | undefined,
  req: PayloadRequest,
): Promise<string | null> {
  if (requestLocale(req) === 'en' && typeof data.name === 'string' && data.name.trim()) {
    return data.name.trim()
  }
  if (id === undefined) {
    return null
  }
  const existing = await readAllLocales(req, 'products', id)
  const stored = (existing?.name as LocaleMap | undefined)?.en
  return typeof stored === 'string' && stored.trim() ? stored.trim() : null
}

/**
 * beforeValidate: trims text, derives the slug from the English name the first time one
 * is available (with a numeric suffix when the slug is taken: product names need not be
 * unique) and never changes an existing slug automatically.
 */
export const productBeforeValidate: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (!data) {
    return data
  }
  if (typeof data.name === 'string') {
    data.name = data.name.trim().replace(/\s+/g, ' ')
  }
  if (typeof data.slug === 'string') {
    data.slug = data.slug.trim().toLowerCase()
    if (data.slug === '') {
      delete data.slug
    }
  }

  // Drafts may be incomplete (no price yet) but never invalid: a fractional, negative,
  // non-finite or oversized amount is rejected even on Save Draft (spec section 5).
  if (data.priceIqd !== undefined && data.priceIqd !== null && !isValidIqd(data.priceIqd)) {
    throw new ValidationError({
      collection: 'products',
      errors: [
        {
          path: 'priceIqd',
          message: 'Enter a positive whole Iraqi dinar amount without decimals (1 to 999,999,999).',
        },
      ],
      req,
    })
  }

  const currentSlug = data.slug ?? originalDoc?.slug
  if (!currentSlug) {
    const en = await englishName(data, originalDoc?.id, req)
    const candidate = en ? slugify(en) : ''
    if (candidate) {
      data.slug = await uniqueSlug(req, candidate, originalDoc?.id)
    }
  }

  if (operation === 'create') {
    if (data.featured === undefined) {
      data.featured = false
    }
    if (data.isAvailable === undefined) {
      // Unavailable until the owner deliberately chooses Available (spec section 5).
      data.isAvailable = false
    }
  }
  return data
}

async function uniqueSlug(
  req: PayloadRequest,
  base: string,
  excludeId?: number | string,
): Promise<string> {
  let candidate = base
  for (let i = 2; i < 100; i += 1) {
    const clash = await req.payload.find({
      collection: 'products',
      where: {
        and: [
          { slug: { equals: candidate } },
          ...(excludeId !== undefined ? [{ id: { not_equals: excludeId } }] : []),
        ],
      },
      depth: 0,
      limit: 1,
      draft: true,
      overrideAccess: true,
    })
    if (clash.totalDocs === 0) {
      return candidate
    }
    candidate = `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}

/**
 * beforeChange: computes derived search fields from every translation, enforces the
 * publication contract, stamps publishedAt/updatedBy and remembers the currently
 * published slug so afterChange can create a redirect when it changes.
 */
export const productBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
  context,
}) => {
  const id = originalDoc?.id as number | string | undefined
  const merged = await mergedProduct({ data, id, req })

  data.normalizedName = buildNormalizedName(localeValues(merged.name))
  data.searchText = buildSearchText({
    names: localeValues(merged.name),
    descriptions: localeValues(merged.description),
  })

  if (req.user && req.user.collection === 'users') {
    data.updatedBy = req.user.id
  }

  const publishSpecificLocale = req.query?.publishSpecificLocale
  if (typeof publishSpecificLocale === 'string' && publishSpecificLocale.length > 0) {
    throw new APIError(
      'Publish all languages together. Publishing a single language is disabled to avoid mixed-language pages.',
      400,
      undefined,
      true,
    )
  }

  const publishing =
    data._status === 'published' ||
    (data._status === undefined && originalDoc?._status === 'published')

  if (publishing) {
    const errors = await publicationErrors({ ...merged, req })
    if (errors.length > 0) {
      throw new ValidationError({ collection: 'products', errors, req })
    }
    if (!originalDoc?.publishedAt) {
      data.publishedAt = new Date().toISOString()
    }
  }

  // Remember the slug that the public currently sees, for redirect creation.
  if (operation === 'update' && id !== undefined) {
    const published = await req.payload.findByID({
      collection: 'products',
      id,
      depth: 0,
      draft: false,
      overrideAccess: true,
      disableErrors: true,
    })
    context.previousPublishedSlug =
      published && published._status === 'published' ? published.slug : null
  }
  return data
}

/**
 * afterChange: when a published product's slug changes, keep a permanent redirect from
 * the old slug (spec sections 7 and 15). Redirect loops are prevented by removing any
 * redirect that points from the new slug.
 */
export const productAfterChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'update' || doc._status !== 'published') {
    return doc
  }
  const previousSlug = context.previousPublishedSlug
  if (typeof previousSlug !== 'string' || previousSlug === doc.slug || !doc.slug) {
    return doc
  }
  const { payload } = req
  await payload.delete({
    collection: 'redirects',
    where: { oldSlug: { equals: doc.slug } },
    overrideAccess: true,
    req,
  })
  const existing = await payload.find({
    collection: 'redirects',
    where: { oldSlug: { equals: previousSlug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  if (existing.totalDocs > 0) {
    await payload.update({
      collection: 'redirects',
      id: existing.docs[0].id,
      data: { product: doc.id },
      overrideAccess: true,
      req,
    })
  } else {
    await payload.create({
      collection: 'redirects',
      data: { oldSlug: previousSlug, product: doc.id },
      overrideAccess: true,
      req,
    })
  }
  return doc
}

export { LOCALES }
