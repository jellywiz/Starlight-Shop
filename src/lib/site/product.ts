import type { Metadata } from 'next'

import type { Locale } from '@/i18n/config'
import { type Dictionary, t } from '@/i18n/dictionary'
import { canonicalProductUrl } from '@/lib/catalog/links'
import type { ProductDetail } from '@/lib/catalog/types'
import { SITE_NAME, pageMetadata } from '@/lib/site/metadata'

/** Shape of a generated product address (src/hooks/slugs.ts). */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Metadata of a product page; previews are never indexed. */
export function productMetadata(
  locale: Locale,
  dict: Dictionary,
  product: ProductDetail,
  preview: boolean,
): Metadata {
  const description =
    product.description.trim().slice(0, 160) ||
    t(dict.meta.productDescriptionFallback, { name: product.name })
  const cover = product.photos[0]
  return {
    ...pageMetadata({
      locale,
      title: product.name,
      description,
      path: `products/${product.slug}`,
      image: cover
        ? { url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }
        : null,
      noindex: preview,
    }),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: product.name,
      description,
      url: canonicalProductUrl(locale, product.slug),
      images: cover
        ? [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }]
        : undefined,
    },
  }
}
