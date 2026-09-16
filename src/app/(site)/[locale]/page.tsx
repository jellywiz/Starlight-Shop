import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogUnavailable } from '@/components/site/CatalogUnavailable'
import { DeliveryFees } from '@/components/site/DeliveryFees'
import { InstagramLink } from '@/components/site/InstagramLink'
import { ProductGrid } from '@/components/site/ProductGrid'
import { SparkleIcon, Sparkles } from '@/components/site/Sparkles'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { catalogPath } from '@/lib/catalog/params'
import {
  getCatalogFilters,
  getFeaturedProducts,
  getShopSettings,
  listDeliveryCities,
} from '@/lib/catalog/queries'
import {
  type CatalogFilters,
  type CatalogItem,
  CatalogUnavailableError,
  type DeliveryCity,
} from '@/lib/catalog/types'
import { SITE_NAME, pageMetadata } from '@/lib/site/metadata'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) {
    return {}
  }
  const dict = getDictionary(locale)
  return pageMetadata({
    locale,
    title: `${SITE_NAME} — ${dict.meta.homeTitle}`,
    description: dict.meta.homeDescription,
  })
}

/** Only a valid, currently ACTIVE city id is accepted from the URL (spec section 8). */
function cityParam(sp: Record<string, string | string[] | undefined>): number | null {
  const raw = Array.isArray(sp.city) ? sp.city[0] : sp.city
  if (typeof raw !== 'string' || !/^\d{1,9}$/.test(raw)) {
    return null
  }
  return Number.parseInt(raw, 10)
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }
  const dict = getDictionary(locale)
  const sp = await searchParams
  const { settings } = await getShopSettings(locale)

  let featured: CatalogItem[] = []
  let filters: CatalogFilters = { categories: [] }
  let unavailable = false
  try {
    ;[featured, filters] = await Promise.all([
      getFeaturedProducts(locale),
      getCatalogFilters(locale),
    ])
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      unavailable = true
    } else {
      throw error
    }
  }

  // Delivery fees are fetched independently of products (spec section 8).
  let cities: DeliveryCity[] = []
  let citiesFailed = false
  try {
    cities = await listDeliveryCities(locale)
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      citiesFailed = true
    } else {
      throw error
    }
  }
  const requestedCity = cityParam(sp)
  const initialCity =
    requestedCity !== null ? (cities.find((c) => c.id === requestedCity) ?? null) : null
  const initialNotListed = requestedCity !== null && !citiesFailed && initialCity === null

  return (
    <div className="flex flex-col gap-14">
      {/* Plum gradient hero with sparkles: one heading, one line, two actions, the logo. */}
      <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-plum-950 via-plum-800 to-plum-600 px-6 py-10 text-white shadow-glow sm:px-12 sm:py-16">
        <Sparkles
          count={30}
          seed={11}
          className="text-star"
          minSize={5}
          maxSize={20}
          avoidTopStart
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative grid items-center gap-8 sm:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{dict.home.heroTitle}</h1>
            <p className="mt-4 max-w-prose text-base text-plum-100 sm:text-lg">
              {dict.home.heroLead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/products`} className="btn-on-dark px-6 py-3 text-base">
                {dict.home.browseProducts}
              </Link>
              <InstagramLink
                href={settings.instagramUrl}
                label={dict.home.instagramAction}
                dict={dict}
                className="btn-outline-light px-6 py-3 text-base"
              />
            </div>
          </div>
          {/* The supplied logo, unchanged, on its own light surface (never on purple). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-full-512.png"
            alt=""
            width={192}
            height={192}
            className="hidden h-48 w-48 rounded-3xl bg-[#fdfdfd] object-contain p-2 shadow-card-hover sm:block"
          />
        </div>
      </section>

      {unavailable ? <CatalogUnavailable dict={dict} settings={settings} /> : null}

      {filters.categories.length > 0 ? (
        <section aria-labelledby="home-categories">
          <h2 id="home-categories" className="section-title">
            {dict.home.categoriesHeading}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2.5" role="list">
            {filters.categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={catalogPath(locale, { category: category.slug })}
                  className="chip hover:bg-surface-2"
                >
                  <SparkleIcon className="h-3 w-3 text-accent-muted" />
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section aria-labelledby="home-featured">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="home-featured" className="section-title flex items-center gap-2">
              <SparkleIcon className="h-5 w-5 text-accent-muted" />
              {dict.home.featuredHeading}
            </h2>
            <Link href={`/${locale}/products`} className="link-plum text-sm">
              {dict.common.viewAll}
            </Link>
          </div>
          <div className="mt-5">
            <ProductGrid items={featured} locale={locale} dict={dict} eagerCount={4} />
          </div>
        </section>
      ) : null}

      {/* Delivery fees: clearly separate from every product card (spec section 2). */}
      <section
        id="delivery"
        aria-labelledby="delivery-heading"
        className="panel-lilac relative scroll-mt-24 overflow-hidden p-6 sm:p-8"
      >
        <Sparkles
          count={14}
          seed={23}
          className="text-accent-muted/70"
          minSize={5}
          maxSize={14}
          avoidTopStart
        />
        <div className="relative">
          <h2 id="delivery-heading" className="section-title flex items-center gap-2">
            <SparkleIcon className="h-5 w-5 text-accent-soft" />
            {dict.delivery.heading}
          </h2>
          <p className="mt-2 max-w-prose text-ink-soft">{dict.delivery.intro}</p>
          <DeliveryFees
            locale={locale}
            dict={dict}
            cities={cities}
            loadFailed={citiesFailed}
            initialCityId={initialCity?.id ?? null}
            initialNotListed={initialNotListed}
            instagramUrl={settings.instagramUrl}
          />
        </div>
      </section>

      <section aria-labelledby="home-about" className="grid gap-6 md:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <h2 id="home-about" className="section-title">
            {dict.home.aboutHeading}
          </h2>
          <p className="prose-plain mt-4 leading-relaxed text-ink-soft">
            {settings.aboutText ?? dict.about.fallback}
          </p>
          <Link href={`/${locale}/about`} className="link-plum mt-4 inline-block text-sm">
            {dict.nav.about}
          </Link>
        </div>
        <div className="card relative overflow-hidden p-6 sm:p-8">
          <Sparkles
            count={8}
            seed={5}
            className="text-accent-muted/60"
            minSize={6}
            maxSize={14}
            avoidTopStart
          />
          <div className="relative">
            <h2 className="section-title">{dict.home.contactHeading}</h2>
            <p className="mt-4 text-ink-soft">{dict.common.inquiryNote}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <InstagramLink
                href={settings.instagramUrl}
                label={dict.home.instagramAction}
                dict={dict}
              />
              <bdi dir="ltr" className="ltr-isolate font-medium text-emphasis">
                {settings.instagramHandle}
              </bdi>
            </div>
            <Link href={`/${locale}/contact`} className="link-plum mt-4 inline-block text-sm">
              {dict.nav.contact}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
