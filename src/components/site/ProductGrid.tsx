import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import type { CatalogItem } from '@/lib/catalog/types'

import { ProductCard } from './ProductCard'

export function ProductGrid({
  items,
  locale,
  dict,
  eagerCount = 0,
}: {
  items: CatalogItem[]
  locale: Locale
  dict: Dictionary
  eagerCount?: number
}) {
  return (
    <ul
      className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
      role="list"
    >
      {items.map((item, index) => (
        <li key={item.id}>
          <ProductCard item={item} locale={locale} dict={dict} priority={index < eagerCount} />
        </li>
      ))}
    </ul>
  )
}
