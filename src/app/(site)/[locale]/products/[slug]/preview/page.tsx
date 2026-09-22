import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { CatalogUnavailable } from '@/components/site/CatalogUnavailable'
import { ProductView } from '@/components/site/ProductView'
import { isOwnerUser } from '@/access'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { getProductPreview, getRelatedProducts, getShopSettings } from '@/lib/catalog/queries'
import { CatalogUnavailableError } from '@/lib/catalog/types'
import { settle } from '@/lib/settle'
import { SLUG_RE, productMetadata } from '@/lib/site/product'
import type { User } from '@/payload-types'

/**
 * The owner's preview of a product's latest saved revision (draft or published), opened
 * from the admin's preview button. Always rendered fresh — it reads the admin cookie and
 * is never cached or indexed — which is why it lives apart from the public page.
 */
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; slug: string }> }

async function owner(): Promise<User | null> {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    return isOwnerUser(user) ? (user as User) : null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) {
    return {}
  }
  const dict = getDictionary(locale)
  const user = await owner()
  const product = user && SLUG_RE.test(slug) ? await getProductPreview(slug, locale, user) : null
  if (!product) {
    return { title: dict.meta.notFoundTitle, robots: { index: false } }
  }
  return productMetadata(locale, dict, product, true)
}

export default async function ProductPreviewPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale) || !SLUG_RE.test(slug)) {
    notFound()
  }
  const dict = getDictionary(locale)
  const user = await owner()
  if (!user) {
    // Not the owner: the public page is the only version there is.
    redirect(`/${locale}/products/${slug}`)
  }
  const { settings } = await getShopSettings(locale)
  const loaded = await settle(getProductPreview(slug, locale, user))
  if (!loaded.ok) {
    if (loaded.error instanceof CatalogUnavailableError) {
      return <CatalogUnavailable dict={dict} settings={settings} />
    }
    throw loaded.error
  }
  const product = loaded.value
  if (!product) {
    notFound()
  }
  const related = await settle(getRelatedProducts(product, locale))
  return (
    <ProductView
      product={product}
      related={related.ok ? related.value : []}
      settings={settings}
      locale={locale}
      dict={dict}
      preview
    />
  )
}
