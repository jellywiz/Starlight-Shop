import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPayload } from 'payload'

import { AvailabilityBadge } from '@/components/site/AvailabilityBadge'
import { CatalogUnavailable } from '@/components/site/CatalogUnavailable'
import { CopyButton } from '@/components/site/CopyButton'
import { InstagramLink } from '@/components/site/InstagramLink'
import { Price } from '@/components/site/Price'
import { ProductGallery } from '@/components/site/ProductGallery'
import { ProductGrid } from '@/components/site/ProductGrid'
import { isOwnerUser } from '@/access'
import { isLocale, type Locale } from '@/i18n/config'
import { type Dictionary, getDictionary, t } from '@/i18n/dictionary'
import { canonicalProductUrl, deliveryFeesPath } from '@/lib/catalog/links'
import { catalogPath } from '@/lib/catalog/params'
import {
  getProductBySlug,
  getProductPreview,
  getRelatedProducts,
  getShopSettings,
  resolveRedirect,
} from '@/lib/catalog/queries'
import { type CatalogItem, CatalogUnavailableError, type ProductDetail } from '@/lib/catalog/types'
import { SITE_NAME, jsonLdScript, pageMetadata } from '@/lib/site/metadata'
import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Admin preview of the latest saved revision; only for an authenticated owner. */
async function previewUser(
  sp: Record<string, string | string[] | undefined>,
): Promise<User | null> {
  if (sp.preview === undefined) {
    return null
  }
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    return isOwnerUser(user) ? (user as User) : null
  } catch {
    return null
  }
}

type Loaded =
  | { product: ProductDetail; preview: boolean }
  | { redirectTo: string }
  | { unavailable: true }
  | null

async function load(
  locale: Locale,
  slug: string,
  sp: Record<string, string | string[] | undefined>,
): Promise<Loaded> {
  if (!SLUG_RE.test(slug)) {
    return null
  }
  try {
    const user = await previewUser(sp)
    if (user) {
      const draft = await getProductPreview(slug, locale, user)
      if (draft) {
        return { product: draft, preview: true }
      }
    }
    const product = await getProductBySlug(slug, locale)
    if (product) {
      return { product, preview: false }
    }
    const target = await resolveRedirect(slug)
    return target ? { redirectTo: `/${locale}/products/${target}` } : null
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      return { unavailable: true }
    }
    throw error
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) {
    return {}
  }
  const dict = getDictionary(locale)
  const loaded = await load(locale, slug, await searchParams)
  if (!loaded || !('product' in loaded)) {
    return { title: dict.meta.notFoundTitle, robots: { index: false } }
  }
  const { product, preview } = loaded
  const description =
    product.description.trim().slice(0, 160) ||
    t(dict.meta.productDescriptionFallback, { name: product.name })
  const cover = product.photos[0]
  return {
    ...pageMetadata({
      locale,
      title: product.name,
      description,
      path: `products/${product.slug}`,
      image: cover
        ? { url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }
        : null,
      noindex: preview,
    }),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: product.name,
      description,
      url: canonicalProductUrl(locale, product.slug),
      images: cover
        ? [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }]
        : undefined,
    },
  }
}

/** Truthful Product structured data: no brand, SKU, model, offers or ratings (spec section 15). */
function productJsonLd(product: ProductDetail, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    category: product.category.name,
    image: product.photos.map((p) => p.src),
    description: product.description,
    url: canonicalProductUrl(locale, product.slug),
  }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) {
    notFound()
  }
  const dict: Dictionary = getDictionary(locale)
  const loaded = await load(locale, slug, await searchParams)
  if (loaded === null) {
    notFound()
  }
  if ('redirectTo' in loaded) {
    permanentRedirect(loaded.redirectTo)
  }
  const { settings } = await getShopSettings(locale)
  if ('unavailable' in loaded) {
    return <CatalogUnavailable dict={dict} settings={settings} />
  }
  const { product, preview } = loaded

  let related: CatalogItem[] = []
  try {
    related = await getRelatedProducts(product, locale)
  } catch {
    related = []
  }

  const canonical = canonicalProductUrl(locale, product.slug)

  return (
    <article className="flex flex-col gap-10">
      {preview ? (
        <p
          role="status"
          className="rounded-xl bg-plum-100 px-4 py-2 text-sm font-semibold text-plum-900 ring-1 ring-plum-500/40 ring-inset"
        >
          Preview — latest saved revision (not necessarily published). Not cached, not indexed.
        </p>
      ) : null}
      <nav aria-label={dict.product.breadcrumb} className="text-sm text-ink-soft">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              {dict.nav.home}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/products`} className="hover:underline">
              {dict.nav.products}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={catalogPath(locale, { category: product.category.slug })}
              className="hover:underline"
            >
              {product.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <ProductGallery photos={product.photos} dict={dict} />
        <div className="flex flex-col gap-5">
          <p className="text-sm font-medium tracking-wide text-plum-500 uppercase">
            <Link
              href={catalogPath(locale, { category: product.category.slug })}
              className="hover:underline"
            >
              {product.category.name}
            </Link>
          </p>
          <h1 className="text-2xl font-bold leading-tight text-plum-950 sm:text-4xl">
            {product.name}
          </h1>
          {/* Pricing block: the product price only — never a delivery fee or total. */}
          <div className="panel-lilac flex flex-wrap items-center gap-3 px-5 py-4">
            <Price amount={product.priceIqd} dict={dict} className="text-3xl text-plum-900" />
            <AvailabilityBadge available={product.isAvailable} dict={dict} />
          </div>
          <p className="text-sm text-ink-soft">{dict.common.currencyNote}</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <InstagramLink
                href={settings.instagramUrl}
                label={dict.product.enquire}
                dict={dict}
                className="btn-instagram px-6 py-3 text-base"
              />
              <CopyButton
                value={canonical}
                label={dict.product.copyLink}
                copiedLabel={dict.product.linkCopied}
                failedLabel={dict.product.copyFailed}
              />
            </div>
            <p className="text-sm text-ink-soft">{dict.product.enquiryHint}</p>
            <p className="text-sm">
              <Link href={deliveryFeesPath(locale)} className="link-plum">
                {dict.nav.delivery}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="product-description" className="card p-6 sm:p-8">
        <h2 id="product-description" className="section-title">
          {dict.product.description}
        </h2>
        <p className="prose-plain mt-4 leading-relaxed text-ink-soft">{product.description}</p>
      </section>

      {related.length > 0 ? (
        <section aria-labelledby="product-related">
          <h2 id="product-related" className="section-title">
            {dict.product.related}
          </h2>
          <div className="mt-5">
            <ProductGrid items={related} locale={locale} dict={dict} />
          </div>
        </section>
      ) : null}

      {!preview ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, locale)) }}
        />
      ) : null}
    </article>
  )
}
