import { describe, expect, it } from 'vitest'

import { catalogPath, catalogSearchParams, parseCatalogParams } from '@/lib/catalog/params'

function parse(locale: string, qs: string) {
  return parseCatalogParams(locale, new URLSearchParams(qs))
}

describe('parseCatalogParams', () => {
  it('applies defaults and normalizes the query', () => {
    const result = parse('en', '')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.query).toMatchObject({
        locale: 'en',
        q: '',
        normalizedQ: '',
        category: null,
        minIqd: null,
        maxIqd: null,
        availability: 'all',
        sort: 'newest',
        page: 1,
        limit: 24,
      })
    }
    const search = parse('ckb', 'q=%20Star%20Necklace%20')
    if (search.ok) {
      expect(search.query.q).toBe('Star Necklace')
      expect(search.query.normalizedQ).toBe('star necklace')
      expect(search.query.sort).toBe('relevance')
    }
  })

  it('parses the documented example URL (spec section 3)', () => {
    const result = parse(
      'en',
      'q=necklace&category=necklaces&min=10000&max=50000&availability=available&sort=price-asc&page=1',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.query).toMatchObject({
        q: 'necklace',
        category: 'necklaces',
        minIqd: 10000,
        maxIqd: 50000,
        availability: 'available',
        sort: 'price-asc',
        page: 1,
      })
    }
  })

  it('normalizes local digits and grouping in price bounds, and ignores unknown parameters', () => {
    const result = parse('ar', 'min=%D9%A1%D9%A0%D9%A0%D9%A0%D9%A0&max=50,000&foo=bar&brand=x')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.query.minIqd).toBe(10000)
      expect(result.query.maxIqd).toBe(50000)
    }
  })

  it('rejects invalid values with stable codes', () => {
    expect(parse('fr', '')).toMatchObject({ ok: false, errors: [{ code: 'INVALID_LOCALE' }] })
    expect(parse('en', 'min=-5')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_PRICE_MIN', field: 'min' }],
    })
    expect(parse('en', 'min=25.5')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_PRICE_MIN', field: 'min' }],
    })
    expect(parse('en', 'max=abc')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_PRICE_MAX', field: 'max' }],
    })
    expect(parse('en', 'max=1e9')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_PRICE_MAX', field: 'max' }],
    })
    expect(parse('en', 'min=30000&max=20000')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_PRICE_RANGE' }],
    })
    expect(parse('en', 'availability=soon')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_AVAILABILITY' }],
    })
    expect(parse('en', 'sort=random')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_SORT' }],
    })
    expect(parse('en', 'page=0')).toMatchObject({ ok: false, errors: [{ code: 'INVALID_PAGE' }] })
    expect(parse('en', 'limit=49')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_LIMIT' }],
    })
    expect(parse('en', 'category=Neck%20laces')).toMatchObject({
      ok: false,
      errors: [{ code: 'INVALID_CATEGORY' }],
    })
    expect(parse('en', `q=${'a'.repeat(121)}`)).toMatchObject({
      ok: false,
      errors: [{ code: 'QUERY_TOO_LONG' }],
    })
  })

  it('keeps raw values so the form can re-render what was typed', () => {
    const result = parse('en', 'min=abc&q=hello')
    expect(result.ok).toBe(false)
    expect(result.raw.min).toBe('abc')
    expect(result.raw.q).toBe('hello')
  })

  it('falls back from relevance to newest when there is no query', () => {
    const result = parse('en', 'sort=relevance')
    expect(result.ok && result.query.sort).toBe('newest')
  })
})

describe('catalogSearchParams', () => {
  it('omits defaults and serializes a canonical URL', () => {
    const params = catalogSearchParams({
      q: 'necklace',
      category: 'necklaces',
      minIqd: 10000,
      maxIqd: 50000,
      availability: 'available',
      sort: 'price-asc',
      page: 2,
      limit: 24,
    })
    expect(params.toString()).toBe(
      'q=necklace&category=necklaces&min=10000&max=50000&availability=available&sort=price-asc&page=2',
    )
    expect(catalogPath('en', {})).toBe('/en/products')
    expect(catalogPath('ckb', { q: 'x', sort: 'relevance' })).toBe('/ckb/products?q=x')
    expect(catalogPath('ar', { sort: 'newest', page: 1 })).toBe('/ar/products')
    expect(catalogPath('ar', { minIqd: 0 })).toBe('/ar/products?min=0')
  })
})
