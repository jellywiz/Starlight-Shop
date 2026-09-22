import Link from 'next/link'

import { AvailabilityBadge } from '@/components/site/AvailabilityBadge'
import { CopyButton } from '@/components/site/CopyButton'
import { InstagramLink } from '@/components/site/InstagramLink'
import { Price } from '@/components/site/Price'
import { ProductGallery } from '@/components/site/ProductGallery'
import { ProductGrid } from '@/components/site/ProductGrid'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { canonicalProductUrl, deliveryFeesPath } from '@/lib/catalog/links'
import { catalogPath } from '@/lib/catalog/params'
import type { CatalogItem, ProductDetail } from '@/lib/catalog/types'
import { jsonLdScript } from '@/lib/site/metadata'
import type { PublicShopSettings } from '@/lib/shop'

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

/**
 * The product page body (spec section 2), shared by the public page and the owner's
 * preview of the latest saved revision.
 */
export function ProductView({
  product,
  related,
  settings,
  locale,
  dict,
  preview,
}: {
  product: ProductDetail
  related: CatalogItem[]
  settings: PublicShopSettings
  locale: Locale
  dict: Dictionary
  preview: boolean
}) {
  const canonical = canonicalProductUrl(locale, product.slug)
  return (
    <article className="flex flex-col gap-10">
      {preview ? (
        <p
          role="status"
          className="rounded-xl bg-surface-3 px-4 py-2 text-sm font-semibold text-heading ring-1 ring-accent-soft/40 ring-inset"
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
          <p className="text-sm font-medium tracking-wide text-accent-soft uppercase">
            <Link
              href={catalogPath(locale, { category: product.category.slug })}
              className="hover:underline"
            >
              {product.category.name}
            </Link>
          </p>
          <h1 className="text-2xl font-bold leading-tight text-heading-strong sm:text-4xl">
            {product.name}
          </h1>
          {/* Pricing block: the product price only — never a delivery fee or total. */}
          <div className="panel-lilac flex flex-wrap items-center gap-3 px-5 py-4">
            <Price amount={product.priceIqd} dict={dict} className="text-3xl text-heading" />
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
