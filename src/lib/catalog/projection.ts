import { pickTranslation } from '@/hooks/localized'
import type { Locale } from '@/i18n/config'
import type { Category, City as DeliveryCityDoc, Media, Product } from '@/payload-types'

import type { CatalogItem, DeliveryCity, ProductDetail, PublicCategory, PublicImage } from './types'

/**
 * Public projections (spec section 10). Only display data leaves the server: no
 * credentials, draft versions, internal search fields or administrator details.
 */

const MAX_DISPLAY_WIDTH = 1280

type SizeEntry =
  { url?: string | null; width?: number | null; height?: number | null } | undefined | null

function isPopulatedMedia(value: unknown): value is Media {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in (value as object) &&
    'id' in (value as object)
  )
}

export function toPublicImage(media: unknown, fallbackAlt: string): PublicImage | null {
  if (!isPopulatedMedia(media) || !media.url || !media.width || !media.height) {
    return null
  }
  const sizes = (media.sizes ?? {}) as Record<string, SizeEntry>
  const sources: { url: string; width: number; height: number }[] = []
  for (const name of ['w320', 'w640', 'w1280']) {
    const size = sizes[name]
    if (size && size.url && size.width && size.height) {
      sources.push({ url: size.url, width: size.width, height: size.height })
    }
  }
  // The original is the last resort (it may be smaller than every generated size).
  if (media.width <= MAX_DISPLAY_WIDTH || sources.length === 0) {
    if (!sources.some((s) => s.width === media.width)) {
      sources.push({ url: media.url, width: media.width, height: media.height })
    }
  }
  sources.sort((a, b) => a.width - b.width)
  const primary = sources[sources.length - 1]
  const alt =
    typeof media.altText === 'string' && media.altText.trim() ? media.altText.trim() : fallbackAlt
  return {
    src: primary.url,
    width: primary.width,
    height: primary.height,
    alt,
    sources: sources.map(({ url, width }) => ({ url, width })),
  }
}

function isPopulatedCategory(value: unknown): value is Category {
  return (
    typeof value === 'object' &&
    value !== null &&
    'slug' in (value as object) &&
    'name' in (value as object)
  )
}

/** Category label in the page language (published content has every language). */
export function toPublicCategory(value: unknown, locale: Locale): PublicCategory | null {
  if (!isPopulatedCategory(value)) {
    return null
  }
  return { name: pickTranslation(value.name, locale) ?? value.slug, slug: value.slug }
}

/** Converts a populated, published product document to a card item in the page language. */
export function toCatalogItem(doc: Product, locale: Locale): CatalogItem | null {
  const category = toPublicCategory(doc.category, locale)
  const name = pickTranslation(doc.name, locale)
  if (!category || !doc.slug || !name || typeof doc.priceIqd !== 'number') {
    return null
  }
  const photos = Array.isArray(doc.photos) ? doc.photos : []
  const cover = photos.length > 0 ? toPublicImage(photos[0], name) : null
  return {
    id: doc.id,
    slug: doc.slug,
    name,
    category,
    priceIqd: doc.priceIqd,
    currency: 'IQD',
    isAvailable: Boolean(doc.isAvailable),
    cover,
  }
}

export function toProductDetail(doc: Product, locale: Locale): ProductDetail | null {
  const item = toCatalogItem(doc, locale)
  if (!item) {
    return null
  }
  const photos = (Array.isArray(doc.photos) ? doc.photos : [])
    .map((p) => toPublicImage(p, item.name))
    .filter((p): p is PublicImage => p !== null)
  return {
    ...item,
    description: pickTranslation(doc.description, locale) ?? '',
    photos,
    publishedAt: doc.publishedAt ?? null,
    updatedAt: doc.updatedAt,
  }
}

/** Public projection of an active delivery city in the requested language. */
export function toDeliveryCity(doc: DeliveryCityDoc, locale: Locale): DeliveryCity | null {
  const name = pickTranslation(doc.name, locale)
  if (!name || typeof doc.feeIqd !== 'number') {
    return null
  }
  return { id: doc.id, name, feeIqd: doc.feeIqd, currency: 'IQD' }
}
