import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogUnavailable } from '@/components/site/CatalogUnavailable'
import { DeliveryFees } from '@/components/site/DeliveryFees'
import { InstagramLink } from '@/components/site/InstagramLink'
import { LinkDot } from '@/components/site/LinkPending'
import { HeroSlideshow } from '@/components/site/HeroSlideshow'
import { ProductGrid } from '@/components/site/ProductGrid'
import { SparkleIcon, Sparkles } from '@/components/site/Sparkles'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { catalogPath } from '@/lib/catalog/params'
import { heroPieces } from '@/lib/site/hero'
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
import { settle } from '@/lib/settle'
import { SITE_NAME, pageMetadata } from '@/lib/site/metadata'

// The delivery selector reads `?city=` on the server so it works without JavaScript, which
// keeps this page dynamic; its data loads in parallel and the shared readers are cached.
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
    // Already contains the shop name, so the layout's "· Starlight Jewellery" is skipped.
    title: `${SITE_NAME} — ${dict.meta.homeTitle}`,
    absoluteTitle: true,
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

  // Everything the page needs is requested at once: the settings, the catalogue parts
  // and the delivery fees are independent, and each round trip to the database is paid
  // in full on the serverless host. Delivery fees fail independently of products
  // (spec section 8).
  const [{ settings }, catalog, delivery] = await Promise.all([
    getShopSettings(locale),
    settle(Promise.all([getFeaturedProducts(locale), getCatalogFilters(locale)])),
    settle(listDeliveryCities(locale)),
  ])

  let featured: CatalogItem[] = []
  let filters: CatalogFilters = { categories: [] }
  let unavailable = false
  if (catalog.ok) {
    ;[featured, filters] = catalog.value
  } else if (catalog.error instanceof CatalogUnavailableError) {
    unavailable = true
  } else {
    throw catalog.error
  }

  let cities: DeliveryCity[] = []
  let citiesFailed = false
  if (delivery.ok) {
    cities = delivery.value
  } else if (delivery.error instanceof CatalogUnavailableError) {
    citiesFailed = true
  } else {
    throw delivery.error
  }
  const requestedCity = cityParam(sp)
  const initialCity =
    requestedCity !== null ? (cities.find((c) => c.id === requestedCity) ?? null) : null
  const initialNotListed = requestedCity !== null && !citiesFailed && initialCity === null

  const pieces = heroPieces(featured)

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      {/* The featured pieces, one at a time, give the first screen a shoppable focal point.
          On phones the slideshow comes first and the text is cut to a title and one button,
          so the visitor sees jewellery straight away and products are a short scroll down. */}
      <section className="home-hero relative overflow-hidden rounded-[2rem] px-4 py-5 text-heading sm:px-10 sm:py-12">
        <Sparkles
          count={10}
          seed={11}
          className="text-accent-muted/50"
          minSize={5}
          maxSize={20}
          avoidTopStart
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative grid items-center gap-5 sm:gap-8 md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_300px]">
          <div className="max-w-2xl text-center sm:text-start">
            <p className="mb-4 hidden items-center gap-2 text-sm font-medium text-accent sm:flex">
              <SparkleIcon className="h-4 w-4" />
              {dict.footer.tagline}
            </p>
            <h1 className="mx-auto max-w-xl text-2xl font-bold leading-tight sm:mx-0 sm:text-4xl lg:text-5xl">
              {dict.home.heroTitle}
            </h1>
            <p className="mt-4 hidden max-w-prose text-base leading-relaxed text-ink-soft sm:block sm:text-lg">
              {dict.home.heroLead}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 sm:mt-8">
              <Link
                href={`/${locale}/products`}
                className="btn-primary w-full px-6 py-3 text-base sm:w-auto"
              >
                {dict.home.browseProducts}
                <LinkDot />
              </Link>
              {/* On phones Instagram is reached from every product page and the contact
                  block further down; the first screen keeps a single button. */}
              <InstagramLink
                href={settings.instagramUrl}
                label={dict.home.instagramAction}
                dict={dict}
                className="btn-secondary hidden px-6 py-3 text-base sm:inline-flex"
              />
            </div>
          </div>
          {pieces.length ? (
            <div className="order-first md:order-none">
              <HeroSlideshow
                pieces={pieces}
                locale={locale}
                dict={dict}
                sizes="(min-width: 1024px) 276px, (min-width: 768px) 236px, (min-width: 380px) 276px, calc(100vw - 104px)"
              />
            </div>
          ) : null}
        </div>
      </section>

      {unavailable ? <CatalogUnavailable dict={dict} settings={settings} /> : null}

      {filters.categories.length > 0 ? (
        <section aria-labelledby="home-categories">
          <h2 id="home-categories" className="section-title">
            {dict.home.categoriesHeading}
          </h2>
          {/* One swipeable row on phones (no extra height per category), wrapping above. */}
          <ul
            className="category-list -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:px-0"
            role="list"
          >
            {filters.categories.map((category) => (
              <li key={category.slug} className="shrink-0">
                <Link
                  href={catalogPath(locale, { category: category.slug })}
                  className="category-tile inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-heading ring-1 ring-line-soft transition-shadow hover:shadow-card-hover sm:px-5 sm:py-4"
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
              <LinkDot />
            </Link>
          </div>
          <div className="mt-5">
            <ProductGrid items={featured} locale={locale} dict={dict} eagerCount={2} />
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
          count={5}
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
            count={4}
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
