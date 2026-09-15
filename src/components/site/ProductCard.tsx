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
}: {
  item: CatalogItem
  locale: Locale
  dict: Dictionary
  priority?: boolean
}) {
  const href = `/${locale}/products/${item.slug}`
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link href={href} className="block bg-white" tabIndex={-1} aria-hidden="true">
        <div className="aspect-square w-full">
          {item.cover ? (
            <ResponsiveImage
              image={item.cover}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              className="h-full w-full object-contain p-3 transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-plum-50 text-sm text-ink-muted">
              {dict.product.noPhoto}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 border-t border-plum-700/5 p-4">
        <p className="text-xs font-medium tracking-wide text-plum-500 uppercase">
          {item.category.name}
        </p>
        <h3 className="text-base font-semibold leading-snug">
          <Link href={href} className="hover:text-plum-700 focus-visible:underline">
            {item.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <Price amount={item.priceIqd} dict={dict} className="text-lg text-plum-900" />
          <AvailabilityBadge available={item.isAvailable} dict={dict} />
        </div>
      </div>
    </article>
  )
}
