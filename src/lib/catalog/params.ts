import { isLocale, type Locale } from '@/i18n/config'

import { parseIqd } from './dinar'
import { normalizeForSearch } from './normalize'

/** Catalog contract constants (spec sections 3 and 10). */
export const PAGE_SIZE = 24
export const MAX_PAGE_SIZE = 48
export const MAX_QUERY_LENGTH = 120

export const SORT_OPTIONS = ['relevance', 'newest', 'price-asc', 'price-desc'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const AVAILABILITY_OPTIONS = ['all', 'available', 'unavailable'] as const
export type AvailabilityOption = (typeof AVAILABILITY_OPTIONS)[number]

export type CatalogErrorCode =
  | 'INVALID_LOCALE'
  | 'QUERY_TOO_LONG'
  | 'INVALID_PRICE_MIN'
  | 'INVALID_PRICE_MAX'
  | 'INVALID_PRICE_RANGE'
  | 'INVALID_AVAILABILITY'
  | 'INVALID_SORT'
  | 'INVALID_PAGE'
  | 'INVALID_LIMIT'
  | 'INVALID_CATEGORY'

export type CatalogError = { code: CatalogErrorCode; field: string }

export type CatalogQuery = {
  locale: Locale
  /** Original trimmed query text for display. */
  q: string
  /** Normalized query used for matching; empty when there is no search. */
  normalizedQ: string
  category: string | null
  /** Inclusive whole-dinar bounds. */
  minIqd: number | null
  maxIqd: number | null
  availability: AvailabilityOption
  sort: SortOption
  page: number
  limit: number
}

/** Raw values as they appear in the URL, kept so a form can re-render what was typed. */
export type RawCatalogParams = {
  q: string
  category: string
  min: string
  max: string
  availability: string
  sort: string
  page: string
  limit: string
}

export type ParsedCatalogParams =
  | { ok: true; query: CatalogQuery; raw: RawCatalogParams }
  | { ok: false; errors: CatalogError[]; raw: RawCatalogParams; locale: Locale }

const SLUG_PARAM_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>

function readAll(source: ParamSource, key: string): string[] {
  if (source instanceof URLSearchParams) {
    return source.getAll(key)
  }
  const value = source[key]
  if (value === undefined) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function readOne(source: ParamSource, key: string): string {
  const all = readAll(source, key)
  return all.length > 0 ? String(all[0]) : ''
}

/**
 * Parses and validates catalog parameters from a URL. Unknown parameters are ignored;
 * defaults are omitted from the canonical form. Validation mirrors the server rules
 * independently of any client-side checks. Whether a syntactically valid category slug
 * names an ACTIVE category is decided by the query layer (CATEGORY_UNAVAILABLE).
 */
export function parseCatalogParams(locale: string, source: ParamSource): ParsedCatalogParams {
  const raw: RawCatalogParams = {
    q: readOne(source, 'q').slice(0, MAX_QUERY_LENGTH + 1),
    category: readOne(source, 'category'),
    min: readOne(source, 'min'),
    max: readOne(source, 'max'),
    availability: readOne(source, 'availability'),
    sort: readOne(source, 'sort'),
    page: readOne(source, 'page'),
    limit: readOne(source, 'limit'),
  }
  const errors: CatalogError[] = []

  if (!isLocale(locale)) {
    return { ok: false, errors: [{ code: 'INVALID_LOCALE', field: 'locale' }], raw, locale: 'ckb' }
  }

  const q = raw.q.trim()
  if (q.length > MAX_QUERY_LENGTH) {
    errors.push({ code: 'QUERY_TOO_LONG', field: 'q' })
  }

  let category: string | null = null
  if (raw.category) {
    if (SLUG_PARAM_RE.test(raw.category) && raw.category.length <= 120) {
      category = raw.category
    } else {
      errors.push({ code: 'INVALID_CATEGORY', field: 'category' })
    }
  }

  let minIqd: number | null = null
  let maxIqd: number | null = null
  if (raw.min.trim() !== '') {
    const parsed = parseIqd(raw.min, { allowZero: true })
    if (parsed.ok) {
      minIqd = parsed.amount
    } else {
      errors.push({ code: 'INVALID_PRICE_MIN', field: 'min' })
    }
  }
  if (raw.max.trim() !== '') {
    const parsed = parseIqd(raw.max, { allowZero: true })
    if (parsed.ok) {
      maxIqd = parsed.amount
    } else {
      errors.push({ code: 'INVALID_PRICE_MAX', field: 'max' })
    }
  }
  if (minIqd !== null && maxIqd !== null && minIqd > maxIqd) {
    errors.push({ code: 'INVALID_PRICE_RANGE', field: 'min' })
  }

  let availability: AvailabilityOption = 'all'
  if (raw.availability) {
    if ((AVAILABILITY_OPTIONS as readonly string[]).includes(raw.availability)) {
      availability = raw.availability as AvailabilityOption
    } else {
      errors.push({ code: 'INVALID_AVAILABILITY', field: 'availability' })
    }
  }

  let sort: SortOption = q ? 'relevance' : 'newest'
  if (raw.sort) {
    if ((SORT_OPTIONS as readonly string[]).includes(raw.sort)) {
      sort = raw.sort as SortOption
      if (sort === 'relevance' && !q) {
        sort = 'newest'
      }
    } else {
      errors.push({ code: 'INVALID_SORT', field: 'sort' })
    }
  }

  let page = 1
  if (raw.page) {
    if (/^\d{1,6}$/.test(raw.page) && Number.parseInt(raw.page, 10) >= 1) {
      page = Number.parseInt(raw.page, 10)
    } else {
      errors.push({ code: 'INVALID_PAGE', field: 'page' })
    }
  }

  let limit = PAGE_SIZE
  if (raw.limit) {
    if (
      /^\d{1,3}$/.test(raw.limit) &&
      Number.parseInt(raw.limit, 10) >= 1 &&
      Number.parseInt(raw.limit, 10) <= MAX_PAGE_SIZE
    ) {
      limit = Number.parseInt(raw.limit, 10)
    } else {
      errors.push({ code: 'INVALID_LIMIT', field: 'limit' })
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, raw, locale }
  }
  return {
    ok: true,
    raw,
    query: {
      locale,
      q,
      normalizedQ: normalizeForSearch(q),
      category,
      minIqd,
      maxIqd,
      availability,
      sort,
      page,
      limit,
    },
  }
}

/**
 * Serializes a query back to URL search params, omitting defaults and empty values so
 * URLs stay canonical and shareable (spec section 3).
 */
export function catalogSearchParams(
  query: Partial<CatalogQuery> & { q?: string },
): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q && query.q.trim()) {
    params.set('q', query.q.trim())
  }
  if (query.category) {
    params.set('category', query.category)
  }
  if (query.minIqd !== null && query.minIqd !== undefined) {
    params.set('min', String(query.minIqd))
  }
  if (query.maxIqd !== null && query.maxIqd !== undefined) {
    params.set('max', String(query.maxIqd))
  }
  if (query.availability && query.availability !== 'all') {
    params.set('availability', query.availability)
  }
  const defaultSort: SortOption = query.q && query.q.trim() ? 'relevance' : 'newest'
  if (query.sort && query.sort !== defaultSort) {
    params.set('sort', query.sort)
  }
  if (query.page && query.page > 1) {
    params.set('page', String(query.page))
  }
  if (query.limit && query.limit !== PAGE_SIZE) {
    params.set('limit', String(query.limit))
  }
  return params
}

export function catalogPath(locale: Locale, query: Partial<CatalogQuery> & { q?: string }): string {
  const params = catalogSearchParams(query).toString()
  return `/${locale}/products${params ? `?${params}` : ''}`
}
