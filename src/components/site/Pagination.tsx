import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import { type Dictionary, t } from '@/i18n/dictionary'
import { type CatalogQuery, catalogPath } from '@/lib/catalog/params'

export function Pagination({
  locale,
  dict,
  query,
  totalPages,
}: {
  locale: Locale
  dict: Dictionary
  query: CatalogQuery
  totalPages: number
}) {
  if (totalPages <= 1) {
    return null
  }
  const page = query.page
  const href = (p: number) => catalogPath(locale, { ...query, page: p })
  return (
    <nav
      aria-label={dict.catalog.pagination}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-plum-700/10 pt-5"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="btn-secondary">
          {dict.catalog.previousPage}
        </Link>
      ) : (
        <span className="btn-secondary opacity-50" aria-disabled="true">
          {dict.catalog.previousPage}
        </span>
      )}
      <p className="text-sm text-ink-soft" aria-current="page">
        {t(dict.catalog.pageOf, { page, total: totalPages }, locale)}
      </p>
      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className="btn-secondary">
          {dict.catalog.nextPage}
        </Link>
      ) : (
        <span className="btn-secondary opacity-50" aria-disabled="true">
          {dict.catalog.nextPage}
        </span>
      )}
    </nav>
  )
}
