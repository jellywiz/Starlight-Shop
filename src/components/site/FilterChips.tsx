import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import { type Dictionary, t } from '@/i18n/dictionary'
import { formatIqdAmount } from '@/lib/catalog/dinar'
import { type CatalogQuery, catalogPath } from '@/lib/catalog/params'
import type { CatalogFilters } from '@/lib/catalog/types'

type Chip = { key: string; label: string; href: string }

/** Removable chips for every active filter plus a Clear-all action (spec section 3). */
export function FilterChips({
  locale,
  dict,
  query,
  options,
}: {
  locale: Locale
  dict: Dictionary
  query: CatalogQuery
  options: CatalogFilters
}) {
  const chips: Chip[] = []
  const without = (patch: Partial<CatalogQuery>) =>
    catalogPath(locale, { ...query, page: 1, ...patch })

  if (query.q) {
    chips.push({
      key: 'q',
      label: t(dict.catalog.searchQueryLabel, { query: query.q }),
      href: without({ q: '', sort: 'newest' }),
    })
  }
  if (query.category) {
    const name = options.categories.find((c) => c.slug === query.category)?.name ?? query.category
    chips.push({
      key: 'category',
      label: t(dict.catalog.categoryChip, { name }),
      href: without({ category: null }),
    })
  }
  if (query.minIqd !== null) {
    chips.push({
      key: 'min',
      label: t(dict.catalog.minChip, { value: formatIqdAmount(query.minIqd) }),
      href: without({ minIqd: null }),
    })
  }
  if (query.maxIqd !== null) {
    chips.push({
      key: 'max',
      label: t(dict.catalog.maxChip, { value: formatIqdAmount(query.maxIqd) }),
      href: without({ maxIqd: null }),
    })
  }
  if (query.availability !== 'all') {
    const value =
      query.availability === 'available'
        ? dict.catalog.availabilityAvailable
        : dict.catalog.availabilityUnavailable
    chips.push({
      key: 'availability',
      label: t(dict.catalog.availabilityChip, { value }),
      href: without({ availability: 'all' }),
    })
  }
  if (chips.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={dict.catalog.activeFilters}>
      <span className="text-sm font-medium text-ink-soft">{dict.catalog.activeFilters}:</span>
      <ul className="flex flex-wrap gap-2" role="list">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              className="chip hover:bg-plum-50"
              aria-label={t(dict.catalog.removeFilter, { filter: chip.label })}
            >
              <span aria-hidden="true">{chip.label}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
                <path d="M5.3 3.9 3.9 5.3 8.6 10l-4.7 4.7 1.4 1.4L10 11.4l4.7 4.7 1.4-1.4L11.4 10l4.7-4.7-1.4-1.4L10 8.6z" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/${locale}/products`} className="link-plum text-sm">
        {dict.catalog.clearAll}
      </Link>
    </div>
  )
}
