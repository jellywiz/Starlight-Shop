import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogFilters } from '@/components/site/CatalogFilters'
import { CatalogUnavailable } from '@/components/site/CatalogUnavailable'
import { FilterChips } from '@/components/site/FilterChips'
import { Pagination } from '@/components/site/Pagination'
import { ProductGrid } from '@/components/site/ProductGrid'
import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary, t, tp } from '@/i18n/dictionary'
import { catalogPath, parseCatalogParams } from '@/lib/catalog/params'
import { getCatalogFilters, getShopSettings, listProducts } from '@/lib/catalog/queries'
import { settle } from '@/lib/settle'
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
  // A category on its own (`?category=necklaces`, first page) is a landing page that
  // search engines may index under its own title (docs/decisions.md "Category pages").
  const category = await indexableCategory(locale, sp)
  if (category) {
    return pageMetadata({
      locale,
      title: category.name,
      description: t(dict.meta.categoryDescription, { category: category.name }, locale),
      path: `products?category=${encodeURIComponent(category.slug)}`,
    })
  }
  const filtered = Object.keys(sp).length > 0
  return {
    ...pageMetadata({
      locale,
      title: dict.meta.productsTitle,
      description: dict.meta.productsDescription,
      path: 'products',
    }),
    // Searches and other filtered URLs stay shareable but out of the index (spec section 15).
    robots: filtered ? { index: false, follow: true } : undefined,
  }
}

/**
 * The category when the URL is exactly `?category=<slug>` and that category is listed
 * (active with published products); null otherwise, or when the catalogue is unreachable.
 */
async function indexableCategory(
  locale: Locale,
  sp: Record<string, string | string[] | undefined>,
): Promise<{ slug: string; name: string } | null> {
  const keys = Object.keys(sp)
  const slug = sp.category
  if (keys.length !== 1 || keys[0] !== 'category' || typeof slug !== 'string') {
    return null
  }
  const filters = await settle(getCatalogFilters(locale))
  return filters.ok ? (filters.value.categories.find((c) => c.slug === slug) ?? null) : null
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
  // The filter options and the results are independent: one round trip, not two.
  const [filters, listing] = await Promise.all([
    settle(getCatalogFilters(locale)),
    settle(parsed.ok ? listProducts(parsed.query) : Promise.resolve(null)),
  ])
  for (const outcome of [filters, listing]) {
    if (outcome.ok) {
      continue
    }
    if (outcome.error instanceof CatalogUnavailableError) {
      unavailable = true
    } else if (outcome.error instanceof CategoryUnavailableError) {
      categoryUnavailable = true
    } else {
      throw outcome.error
    }
  }
  if (filters.ok) {
    options = filters.value
  }
  if (listing.ok && !unavailable) {
    result = listing.value
  }

  const { settings } = unavailable ? await getShopSettings(locale) : { settings: null }

  const countLabel =
    result && parsed.ok
      ? parsed.query.q
        ? tp(dict.catalog.resultsCountFor, result.total, locale, { query: parsed.query.q })
        : tp(dict.catalog.resultsCount, result.total, locale)
      : ''
  const showResultsLabel =
    result && parsed.ok ? tp(dict.catalog.showResults, result.total, locale) : null
  // A category page is titled with the category itself (also what search engines show).
  const currentCategory =
    parsed.ok && parsed.query.category
      ? options.categories.find((c) => c.slug === parsed.query.category)
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-heading sm:text-3xl">
        {currentCategory?.name ?? dict.catalog.heading}
      </h1>
      <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <CatalogFilters
          locale={locale}
          dict={dict}
          options={options}
          raw={parsed.raw}
          errors={parsed.ok ? [] : parsed.errors}
          showResultsLabel={showResultsLabel}
        />
        <section aria-label={dict.catalog.resultsRegion} className="flex min-w-0 flex-col gap-4">
          {unavailable && settings ? <CatalogUnavailable dict={dict} settings={settings} /> : null}

          {parsed.ok && !categoryUnavailable ? (
            <FilterChips locale={locale} dict={dict} query={parsed.query} options={options} />
          ) : null}

          {categoryUnavailable && parsed.ok ? (
            <div role="alert" className="panel-lilac p-6">
              <p className="font-semibold text-heading">{dict.catalog.categoryUnavailable}</p>
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
                  <ProductGrid
                    items={result.items}
                    locale={locale}
                    dict={dict}
                    eagerCount={2}
                    layout="catalog"
                  />
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
