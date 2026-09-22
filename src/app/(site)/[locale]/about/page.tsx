import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { InstagramLink } from '@/components/site/InstagramLink'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { deliveryFeesPath } from '@/lib/catalog/links'
import { getShopSettings } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/site/metadata'
import { dropFromCacheAfterResponse } from '@/lib/site/outage'

// Served from the cache and refreshed when the settings change (see the layout).
// Served from the cache and refreshed when the settings change (see the layout). Nothing
// is rendered at build time (no database there): the empty list makes unknown paths render
// on first request and then stay cached, instead of rendering on every request.
export const revalidate = 86400
export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) {
    return {}
  }
  const dict = getDictionary(locale)
  return pageMetadata({
    locale,
    title: dict.meta.aboutTitle,
    description: dict.meta.homeDescription,
    path: 'about',
  })
}

/** Editable introduction to the handmade jewellery shop (spec section 2). */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }
  const dict = getDictionary(locale)
  const { settings, fromFallback } = await getShopSettings(locale)
  if (fromFallback) {
    // Built-in values keep this page useful during a database outage; the render is
    // dropped from the cache right after it is sent (src/lib/site/outage.ts).
    dropFromCacheAfterResponse(`/${locale}/about`)
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-heading sm:text-3xl">{dict.about.heading}</h1>
      <p className="prose-plain text-lg leading-relaxed text-ink-soft">
        {settings.aboutText ?? dict.about.fallback}
      </p>
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-heading">{dict.home.contactHeading}</h2>
        <p className="mt-2 text-ink-soft">{dict.common.inquiryNote}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <InstagramLink
            href={settings.instagramUrl}
            label={dict.home.instagramAction}
            dict={dict}
          />
          <bdi dir="ltr" className="ltr-isolate font-medium text-emphasis">
            {settings.instagramHandle}
          </bdi>
        </div>
        <p className="mt-4 text-sm">
          <Link href={deliveryFeesPath(locale)} className="link-plum">
            {dict.contact.deliveryLink}
          </Link>
        </p>
      </div>
    </div>
  )
}
