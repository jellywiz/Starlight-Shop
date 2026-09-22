import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { CopyButton } from '@/components/site/CopyButton'
import { InstagramLink } from '@/components/site/InstagramLink'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { deliveryFeesPath } from '@/lib/catalog/links'
import { getShopSettings } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/site/metadata'

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
    title: dict.meta.contactTitle,
    description: dict.contact.lead,
    path: 'contact',
  })
}

/**
 * Contact page (spec section 8): the Instagram profile as the only contact destination,
 * a visible copyable handle, enquiry instructions and a link to the delivery fees. Keeps
 * working from the static fallback when the database is down. No phone, WhatsApp, map,
 * address or contact form exists.
 */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) {
    notFound()
  }
  const dict = getDictionary(locale)
  const { settings, fromFallback } = await getShopSettings(locale)
  if (fromFallback) {
    await connection()
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-heading sm:text-3xl">{dict.contact.heading}</h1>
      <p className="text-lg text-ink-soft">{dict.contact.lead}</p>
      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-heading">{dict.contact.instagram}</h2>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-ink-soft">
          <span className="font-semibold">{dict.contact.handleLabel}:</span>
          <bdi dir="ltr" className="ltr-isolate select-all text-base font-medium text-emphasis">
            {settings.instagramHandle}
          </bdi>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <InstagramLink
            href={settings.instagramUrl}
            label={dict.contact.openProfile}
            dict={dict}
          />
          <CopyButton
            value={settings.instagramHandle}
            label={dict.contact.copyHandle}
            copiedLabel={dict.contact.copied}
            failedLabel={dict.product.copyFailed}
          />
        </div>
      </div>
      <section aria-labelledby="contact-howto" className="card p-6 sm:p-8">
        <h2 id="contact-howto" className="text-lg font-semibold text-heading">
          {dict.contact.howToHeading}
        </h2>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-ink-soft">
          <li>{dict.contact.step1}</li>
          <li>{dict.contact.step2}</li>
          <li>{dict.contact.step3}</li>
        </ol>
        <p className="mt-4">
          <Link href={deliveryFeesPath(locale)} className="btn-secondary">
            {dict.contact.deliveryLink}
          </Link>
        </p>
      </section>
      <p className="text-sm text-ink-muted">{dict.contact.note}</p>
    </div>
  )
}
