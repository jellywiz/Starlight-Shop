import { beforeAll, describe, expect, it } from 'vitest'

import { parseCatalogParams } from '@/lib/catalog/params'
import {
  getCatalogFilters,
  getFeaturedProducts,
  getProductBySlug,
  getRelatedProducts,
  listProducts,
  resolveRedirect,
} from '@/lib/catalog/queries'
import { CategoryUnavailableError } from '@/lib/catalog/types'

import {
  createCategory,
  createMedia,
  createOwner,
  createProduct,
  resetDatabase,
  testPayload,
} from './helpers'

function query(locale: string, qs: string) {
  const parsed = parseCatalogParams(locale, new URLSearchParams(qs))
  if (!parsed.ok) {
    throw new Error(`invalid query: ${JSON.stringify(parsed.errors)}`)
  }
  return parsed.query
}

describe('catalog layer: search, filters, sorting and pagination (A07, A08, A09)', () => {
  const slugs: Record<string, string> = {}
  let emptyCategorySlug = ''

  beforeAll(async () => {
    const payload = await testPayload()
    await resetDatabase(payload)
    await createOwner(payload)
    const necklaces = await createCategory(
      payload,
      { ckb: 'ملوانکە', ar: 'قلائد', en: 'Necklaces' },
      { sortOrder: 1 },
    )
    const rings = await createCategory(
      payload,
      { ckb: 'ئەڵقە', ar: 'خواتم', en: 'Rings' },
      { sortOrder: 2 },
    )
    // Active but empty: retained in the admin, hidden from navigation and filters.
    const brooches = await createCategory(
      payload,
      { ckb: 'بڕۆش', ar: 'دبابيس', en: 'Brooches' },
      { sortOrder: 3 },
    )
    emptyCategorySlug = brooches.slug as string
    // Inactive category: a saved URL naming it is CATEGORY_UNAVAILABLE.
    await createCategory(
      payload,
      { ckb: 'کۆن', ar: 'قديم', en: 'Retired' },
      {
        sortOrder: 4,
        isActive: false,
      },
    )
    // Shared photo without a description: the site falls back to the product name.
    const media = await createMedia(payload)
    // A described photo: the single description is used in every language.
    const described = await createMedia(payload, { alt: 'Silver ring on a white background' })

    const fixtures = [
      {
        key: 'star',
        names: { ckb: 'ملوانکەی ئەستێرە', ar: 'قلادة نجمة', en: 'Star necklace' },
        descriptions: {
          ckb: 'ملوانکەیەکی دەستکرد لەگەڵ ئاوێزانی ئەستێرە',
          ar: 'قلادة مصنوعة يدويًا مع دلاية نجمة',
          en: 'Handmade necklace with a star pendant',
        },
        category: necklaces.id,
        price: 25000,
        available: true,
        featured: true,
      },
      {
        key: 'moon',
        names: { ckb: 'ملوانکەی مانگ', ar: 'قلادة هلال', en: 'Moon necklace' },
        descriptions: {
          ckb: 'ملوانکەیەکی دەستکرد بە شێوەی مانگ',
          ar: 'قلادة مصنوعة يدويًا على شكل هلال',
          en: 'Handmade crescent moon necklace',
        },
        category: necklaces.id,
        price: 32000,
        available: false,
        featured: true,
      },
      {
        key: 'starMoon',
        names: {
          ckb: 'ملوانکەی ئەستێرە و مانگ',
          ar: 'قلادة نجمة وهلال',
          en: 'Star and moon necklace',
        },
        descriptions: {
          ckb: 'ملوانکەیەکی دەستکرد بە ئەستێرە و مانگ',
          ar: 'قلادة مصنوعة يدويًا بنجمة وهلال',
          en: 'Handmade necklace with a star and a moon',
        },
        category: necklaces.id,
        price: 40000,
        available: true,
        featured: false,
      },
      {
        key: 'ring',
        names: { ckb: 'ئەڵقەی پێچراو', ar: 'خاتم ملتوٍ', en: 'Twist ring' },
        descriptions: {
          ckb: 'ئەڵقەیەکی دەستکرد بە شێوەی پێچراو',
          ar: 'خاتم مصنوع يدويًا بتصميم ملتوٍ',
          en: 'Handmade ring with a twisted band and a tiny star',
        },
        category: rings.id,
        price: 12000,
        available: true,
        featured: false,
      },
      {
        key: 'cheap',
        names: { ckb: 'ئەڵقەی سادە', ar: 'خاتم بسيط', en: 'Plain ring' },
        descriptions: {
          ckb: 'ئەڵقەیەکی سادەی دەستکرد',
          ar: 'خاتم بسيط مصنوع يدويًا',
          en: 'Simple handmade ring',
        },
        category: rings.id,
        price: 9000,
        available: true,
        featured: false,
      },
    ]
    for (const f of fixtures) {
      const product = await createProduct(
        payload,
        {
          names: f.names,
          descriptions: f.descriptions,
          category: f.category,
          photos: [f.key === 'cheap' ? described.id : media.id],
          priceIqd: f.price,
          isAvailable: f.available,
          featured: f.featured,
        },
        { publish: true },
      )
      slugs[f.key] = product.slug as string
    }
    // An unpublished draft must never appear.
    await createProduct(payload, {
      names: { ckb: 'ڕەشنووس', ar: 'مسودة', en: 'Draft only necklace' },
      category: necklaces.id,
      photos: [media.id],
      priceIqd: 100,
    })
  })

  it('lists newest first with a stable total and excludes drafts', async () => {
    const result = await listProducts(query('en', ''))
    expect(result.total).toBe(5)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(24)
    expect(result.totalPages).toBe(1)
    expect(result.items.map((i) => i.slug)).toEqual([
      slugs.cheap,
      slugs.ring,
      slugs.starMoon,
      slugs.moon,
      slugs.star,
    ])
    expect(result.items[0]).toMatchObject({
      currency: 'IQD',
      priceIqd: 9000,
      category: { slug: 'rings', name: 'Rings' },
    })
    expect(result.items[0].cover?.sources.length).toBeGreaterThan(0)
    expect(JSON.stringify(result)).not.toMatch(/searchText|normalizedName|updatedBy|hash|email/)
  })

  it('renders names and category labels in the active language', async () => {
    const ckb = await listProducts(query('ckb', 'q=Star%20necklace'))
    expect(ckb.items[0].name).toBe('ملوانکەی ئەستێرە')
    expect(ckb.items[0].category.name).toBe('ملوانکە')
    const ar = await listProducts(query('ar', 'q=Star%20necklace'))
    expect(ar.items[0].name).toBe('قلادة نجمة')
    expect(ar.items[0].category.name).toBe('قلائد')
  })

  it('describes photos with the product name in the active language unless a description was given', async () => {
    const ckb = await listProducts(query('ckb', 'q=Star%20necklace'))
    expect(ckb.items[0].cover?.alt).toBe('ملوانکەی ئەستێرە')
    const en = await listProducts(query('en', 'q=Star%20necklace'))
    expect(en.items[0].cover?.alt).toBe('Star necklace')
    const detail = await getProductBySlug(slugs.star, 'ar')
    expect(detail?.photos[0]?.alt).toBe('قلادة نجمة')

    // One optional description, shared by all languages.
    for (const locale of ['ckb', 'ar', 'en'] as const) {
      const ring = await getProductBySlug(slugs.cheap, locale)
      expect(ring?.photos[0]?.alt).toBe('Silver ring on a white background')
    }
  })

  it('finds products by any translation of names and descriptions (A07)', async () => {
    const cases: [string, string[]][] = [
      ['Star necklace', [slugs.star, slugs.starMoon]],
      ['قلادة نجمة', [slugs.star, slugs.starMoon]],
      ['ملوانکەی ئەستێرە', [slugs.star, slugs.starMoon]],
      ['ملوانكەی ئەستێرە', [slugs.star, slugs.starMoon]], // Arabic kaf typed on an Arabic keyboard
      ['crescent', [slugs.moon]], // description-only match
      ['twisted band', [slugs.ring]],
      ['star', [slugs.starMoon, slugs.star, slugs.ring]], // name prefixes (newest first) before a description match
      ['necklace star', [slugs.starMoon, slugs.star]], // every token must appear; ties are newest first
      ['nothing-matches-here', []],
    ]
    for (const [q, expected] of cases) {
      const result = await listProducts(query('en', `q=${encodeURIComponent(q)}`))
      expect(
        result.items.map((i) => i.slug),
        `query "${q}"`,
      ).toEqual(expected)
    }
  })

  it('ranks exact names first, then prefixes, then other name matches, then descriptions', async () => {
    const exact = await listProducts(query('en', 'q=moon%20necklace'))
    expect(exact.items[0].slug).toBe(slugs.moon)
    const prefix = await listProducts(query('en', 'q=star'))
    expect(prefix.items.map((i) => i.slug)).toEqual([slugs.starMoon, slugs.star, slugs.ring])
    const inner = await listProducts(query('en', 'q=ring'))
    expect(
      inner.items
        .slice(0, 2)
        .map((i) => i.slug)
        .sort(),
    ).toEqual([slugs.ring, slugs.cheap].sort())
  })

  it('combines category, price and availability with AND and inclusive bounds (A08)', async () => {
    const category = await listProducts(query('en', 'category=necklaces'))
    expect(category.total).toBe(3)
    const priced = await listProducts(query('en', 'category=necklaces&min=25000&max=32000'))
    expect(priced.items.map((i) => i.slug).sort()).toEqual([slugs.star, slugs.moon].sort())
    const available = await listProducts(query('en', 'category=necklaces&availability=available'))
    expect(available.items.map((i) => i.slug).sort()).toEqual([slugs.star, slugs.starMoon].sort())
    const unavailable = await listProducts(query('en', 'availability=unavailable'))
    expect(unavailable.items.map((i) => i.slug)).toEqual([slugs.moon])
    const localDigits = await listProducts(query('ar', 'min=%D9%A4%D9%A0%D9%A0%D9%A0%D9%A0'))
    expect(localDigits.items.map((i) => i.slug)).toEqual([slugs.starMoon])
  })

  it('reports a removed or inactive category as CATEGORY_UNAVAILABLE and an empty one as no results', async () => {
    await expect(listProducts(query('en', 'category=does-not-exist'))).rejects.toBeInstanceOf(
      CategoryUnavailableError,
    )
    await expect(listProducts(query('en', 'category=retired'))).rejects.toBeInstanceOf(
      CategoryUnavailableError,
    )
    const empty = await listProducts(query('en', `category=${emptyCategorySlug}`))
    expect(empty.total).toBe(0)
  })

  it('sorts by price with id tie-breaks and paginates without duplicates (A09)', async () => {
    const asc = await listProducts(query('en', 'sort=price-asc'))
    expect(asc.items.map((i) => i.priceIqd)).toEqual([9000, 12000, 25000, 32000, 40000])
    const desc = await listProducts(query('en', 'sort=price-desc'))
    expect(desc.items.map((i) => i.priceIqd)).toEqual([40000, 32000, 25000, 12000, 9000])

    const page1 = await listProducts(query('en', 'limit=2&page=1'))
    const page2 = await listProducts(query('en', 'limit=2&page=2'))
    const page3 = await listProducts(query('en', 'limit=2&page=3'))
    const page4 = await listProducts(query('en', 'limit=2&page=4'))
    expect(page1.totalPages).toBe(3)
    const all = [...page1.items, ...page2.items, ...page3.items].map((i) => i.slug)
    expect(new Set(all).size).toBe(5)
    expect(page4.items).toEqual([])
    expect(page4.total).toBe(5)

    // Relevance search pagination is also bounded.
    const searchPage = await listProducts(query('en', 'q=necklace&limit=2&page=2'))
    expect(searchPage.items.length).toBe(1)
    expect(searchPage.total).toBe(3)
  })

  it('returns detail, related products, featured products and filters', async () => {
    const detail = await getProductBySlug(slugs.star, 'ar')
    expect(detail).not.toBeNull()
    expect(detail?.name).toBe('قلادة نجمة')
    expect(detail?.photos.length).toBe(1)
    expect(detail?.description).toContain('قلادة مصنوعة يدويًا')
    expect(detail).not.toHaveProperty('specifications')
    expect(detail).not.toHaveProperty('brand')

    const related = await getRelatedProducts(detail!, 'en')
    expect(related.map((r) => r.slug).sort()).toEqual([slugs.moon, slugs.starMoon].sort())

    const featured = await getFeaturedProducts('en')
    expect(featured.map((f) => f.slug).sort()).toEqual([slugs.star, slugs.moon].sort())

    // Only active categories WITH a published product are offered (spec section 6).
    const filters = await getCatalogFilters('ckb')
    expect(filters.categories.map((c) => c.slug)).toEqual(['necklaces', 'rings'])
    expect(filters.categories[0].name).toBe('ملوانکە')

    expect(await getProductBySlug('does-not-exist', 'en')).toBeNull()
    expect(await getProductBySlug('draft-only-necklace', 'en')).toBeNull()
  })

  it('resolves legacy redirects only to published products', async () => {
    const payload = await testPayload()
    const star = await payload.find({
      collection: 'products',
      where: { slug: { equals: slugs.star } },
      overrideAccess: true,
      limit: 1,
    })
    // Addresses no longer change, so redirects only exist from before that rule (or are
    // added through the API); the old address still resolves to the product.
    await payload.create({
      collection: 'redirects',
      data: { oldSlug: 'old-star-address', product: star.docs[0].id },
      overrideAccess: true,
    })
    expect(await resolveRedirect('old-star-address')).toBe(slugs.star)
    expect(await resolveRedirect('never-existed')).toBeNull()
    await payload.update({
      collection: 'products',
      id: star.docs[0].id,
      data: { _status: 'draft' },
      draft: false,
      overrideAccess: true,
    })
    expect(await resolveRedirect('old-star-address')).toBeNull()
  })
})
