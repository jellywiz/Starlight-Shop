import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogFilters } from '@/components/site/CatalogFilters'
import { CatalogUnavailable } from '@/components/site/CatalogUnavailable'
import { FilterChips } from '@/components/site/FilterChips'
import { Pagination } from '@/components/site/Pagination'
import { ProductGrid } from '@/components/site/ProductGrid'
import { isLocale } from '@/i18n/config'
import { getDictionary, tp } from '@/i18n/dictionary'
import { catalogPath, parseCatalogParams } from '@/lib/catalog/params'
import { getCatalogFilters, getShopSettings, listProducts } from '@/lib/catalog/queries'
import {
  type CatalogFilters as FilterOptions,
  type CatalogResult,
  CatalogUnavailableError,
  CategoryUnavailableError,
} from '@/lib/catalog/types'
import { pageMetadata } from '@/lib/site/metadata'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) {
    return {}
  }
  const dict = getDictionary(locale)
  const sp = await searchParams
  const filtered = Object.keys(sp).length > 0
  return {
    ...pageMetadata({
      locale,
      title: dict.meta.productsTitle,
      description: dict.meta.productsDescription,
      path: 'products',
    }),
    // Filtered/search URLs stay shareable but out of the index (spec section 15).
    robots: filtered ? { index: false, follow: true } : undefined,
  }
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }
  const dict = getDictionary(locale)
  const sp = await searchParams
  const parsed = parseCatalogParams(locale, sp)

  let options: FilterOptions = { categories: [] }
  let result: CatalogResult | null = null
  let unavailable = false
  let categoryUnavailable = false
  try {
    options = await getCatalogFilters(locale)
    if (parsed.ok) {
      result = await listProducts(parsed.query)
    }
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      unavailable = true
    } else if (error instanceof CategoryUnavailableError) {
      categoryUnavailable = true
    } else {
      throw error
    }
  }

  const { settings } = unavailable ? await getShopSettings(locale) : { settings: null }

  const countLabel =
    result && parsed.ok
      ? parsed.query.q
        ? tp(dict.catalog.resultsCountFor, result.total, locale, { query: parsed.query.q })
        : tp(dict.catalog.resultsCount, result.total, locale)
      : ''

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-plum-900 sm:text-3xl">{dict.catalog.heading}</h1>
      <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <CatalogFilters
          locale={locale}
          dict={dict}
          options={options}
          raw={parsed.raw}
          errors={parsed.ok ? [] : parsed.errors}
        />
        <section aria-label={dict.catalog.resultsRegion} className="flex min-w-0 flex-col gap-4">
          {unavailable && settings ? <CatalogUnavailable dict={dict} settings={settings} /> : null}

          {parsed.ok && !categoryUnavailable ? (
            <FilterChips locale={locale} dict={dict} query={parsed.query} options={options} />
          ) : null}

          {categoryUnavailable && parsed.ok ? (
            <div role="alert" className="panel-lilac p-6">
              <p className="font-semibold text-plum-900">{dict.catalog.categoryUnavailable}</p>
              <p className="mt-1 text-sm text-ink-soft">{dict.catalog.categoryUnavailableHint}</p>
              <Link
                href={catalogPath(locale, { ...parsed.query, category: null, page: 1 })}
                className="btn-primary mt-4"
              >
                {dict.catalog.clearCategory}
              </Link>
            </div>
          ) : null}

          {!parsed.ok && !unavailable ? (
            <div
              role="alert"
              className="rounded-xl bg-danger-100 p-4 text-danger-700 ring-1 ring-danger-700/20 ring-inset"
            >
              <p className="font-semibold">{dict.errors.formHasErrors}</p>
              <ul className="mt-1 list-disc ps-5 text-sm">
                {parsed.errors.map((error) => (
                  <li key={`${error.code}-${error.field}`}>{dict.errors[error.code]}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result && parsed.ok ? (
            <>
              <p className="text-sm text-ink-soft" aria-live="polite" aria-atomic="true">
                {countLabel}
              </p>
              {result.total === 0 ? (
                <div className="card p-6">
                  <p className="font-semibold">{dict.catalog.noResults}</p>
                  <p className="mt-1 text-sm text-ink-soft">{dict.catalog.noResultsHint}</p>
                  <Link href={`/${locale}/products`} className="btn-secondary mt-4">
                    {dict.catalog.clearFilters}
                  </Link>
                </div>
              ) : result.items.length === 0 ? (
                <div className="card p-6">
                  <p className="font-semibold">{dict.catalog.outOfRange}</p>
                  <Link
                    href={catalogPath(locale, { ...parsed.query, page: 1 })}
                    className="btn-secondary mt-4"
                  >
                    {dict.catalog.goToFirstPage}
                  </Link>
                </div>
              ) : (
                <>
                  <ProductGrid items={result.items} locale={locale} dict={dict} eagerCount={4} />
                  <Pagination
                    locale={locale}
                    dict={dict}
                    query={parsed.query}
                    totalPages={result.totalPages}
                  />
                </>
              )}
              <p className="text-xs text-ink-muted">{dict.common.currencyNote}</p>
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}
