import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import type { CatalogItem } from '@/lib/catalog/types'

import { AvailabilityBadge } from './AvailabilityBadge'
import { Price } from './Price'
import { ResponsiveImage } from './ResponsiveImage'

/**
 * Catalogue card: photo on white with contain sizing (jewellery edges stay visible),
 * category, name, dinar price and the availability label. No delivery fee or total is
 * ever shown inside a card (spec section 2).
 */
export function ProductCard({
  item,
  locale,
  dict,
  priority = false,
  sizes,
}: {
  item: CatalogItem
  locale: Locale
  dict: Dictionary
  priority?: boolean
  sizes: string
}) {
  const href = `/${locale}/products/${item.slug}`
  return (
    <article className="product-card card card-hover group flex h-full flex-col overflow-hidden">
      {/* The photo's link is an overlay rather than a wrapper, so the "try again" button
          shown when a photo fails is never nested inside a link. */}
      <div className="relative bg-white">
        <div className="aspect-square w-full">
          {item.cover ? (
            <ResponsiveImage
              image={item.cover}
              sizes={sizes}
              labels={{ failed: dict.product.photoFailed, retry: dict.product.retryPhoto }}
              priority={priority}
              className="h-full w-full object-contain p-3 transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-2 text-sm text-ink-muted">
              {dict.product.noPhoto}
            </div>
          )}
        </div>
        <Link href={href} className="absolute inset-0" tabIndex={-1} aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-line-soft p-3 sm:p-4">
        <p className="text-xs font-medium tracking-wide text-accent-soft uppercase">
          {item.category.name}
        </p>
        <h3 className="text-base font-semibold leading-snug">
          <Link href={href} className="hover:text-accent focus-visible:underline">
            {item.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <Price amount={item.priceIqd} dict={dict} className="text-lg text-heading" />
          <AvailabilityBadge available={item.isAvailable} dict={dict} />
        </div>
      </div>
    </article>
  )
}
