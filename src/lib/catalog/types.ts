import type { Locale } from '@/i18n/config'

/** One responsive image with pregenerated variants (spec section 11). */
export type PublicImage = {
  /** URL of the largest variant that is not larger than 1280px, falling back to the original. */
  src: string
  width: number
  height: number
  alt: string
  /** Candidates for srcset, ascending by width. */
  sources: { url: string; width: number }[]
}

export type PublicCategory = {
  name: string
  slug: string
}

/** Card item returned by listProducts and /api/catalog (spec section 10). */
export type CatalogItem = {
  id: number
  slug: string
  name: string
  category: PublicCategory
  priceIqd: number
  currency: 'IQD'
  isAvailable: boolean
  cover: PublicImage | null
}

export type ProductDetail = CatalogItem & {
  description: string
  photos: PublicImage[]
  publishedAt: string | null
  updatedAt: string
}

export type CatalogResult = {
  items: CatalogItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type FilterOption = {
  slug: string
  name: string
}

/** Categories offered in navigation and filters: active AND with a published product. */
export type CatalogFilters = {
  categories: FilterOption[]
}

/** Public delivery city record (spec section 8 and 10). */
export type DeliveryCity = {
  id: number
  name: string
  feeIqd: number
  currency: 'IQD'
}

export type LocalizedName = Record<Locale, string>

/** Thrown when the database or storage dependency is unavailable (HTTP 503). */
export class CatalogUnavailableError extends Error {
  readonly code = 'CATALOG_UNAVAILABLE' as const

  constructor(cause?: unknown) {
    super('Catalog unavailable')
    this.name = 'CatalogUnavailableError'
    this.cause = cause
  }
}

/**
 * Thrown when a category filter names a category that is missing or inactive (HTTP 400,
 * spec sections 3 and 10). The UI shows a translated state with a Clear category action
 * instead of silently listing unrelated products.
 */
export class CategoryUnavailableError extends Error {
  readonly code = 'CATEGORY_UNAVAILABLE' as const

  constructor(readonly slug: string) {
    super(`Category unavailable: ${slug}`)
    this.name = 'CategoryUnavailableError'
  }
}
