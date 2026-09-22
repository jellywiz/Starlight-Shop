import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import type { CatalogItem } from '@/lib/catalog/types'

import { ProductCard } from './ProductCard'

export function ProductGrid({
  items,
  locale,
  dict,
  eagerCount = 0,
  layout = 'full',
}: {
  items: CatalogItem[]
  locale: Locale
  dict: Dictionary
  eagerCount?: number
  layout?: 'full' | 'catalog'
}) {
  const sizes =
    layout === 'catalog'
      ? '(min-width: 1152px) 262px, (min-width: 1024px) calc((100vw - 368px) / 3), (min-width: 768px) calc((100vw - 352px) / 2), (min-width: 640px) calc((100vw - 64px) / 2), (min-width: 360px) calc((100vw - 48px) / 2), calc(100vw - 32px)'
      : '(min-width: 1280px) 264px, (min-width: 1152px) 358px, (min-width: 768px) calc((100vw - 80px) / 3), (min-width: 640px) calc((100vw - 64px) / 2), (min-width: 360px) calc((100vw - 48px) / 2), calc(100vw - 32px)'
  return (
    <ul
      className={`grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 ${layout === 'catalog' ? 'lg:grid-cols-3' : 'md:grid-cols-3 xl:grid-cols-4'}`}
      role="list"
    >
      {items.map((item, index) => (
        <li key={item.id}>
          <ProductCard
            item={item}
            locale={locale}
            dict={dict}
            priority={index < eagerCount}
            sizes={sizes}
          />
        </li>
      ))}
    </ul>
  )
}
