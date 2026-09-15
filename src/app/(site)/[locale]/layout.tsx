import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { DEFAULT_LOCALE, LOCALE_META, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { getShopSettings } from '@/lib/catalog/queries'
import { siteUrl } from '@/lib/env'
import { SITE_NAME, jsonLdScript, organizationJsonLd } from '@/lib/site/metadata'

import { notoSans, notoSansArabic } from '../fonts'
import '../globals.css'

// Catalog pages always render on demand so prices, availability, delivery fees and
// publication state are never served stale (spec section 11).
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { children: ReactNode; params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE
  const dict = getDictionary(locale)
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${SITE_NAME} — ${dict.meta.homeTitle}`, template: `%s · ${SITE_NAME}` },
    description: dict.meta.homeDescription,
    applicationName: SITE_NAME,
    icons: {
      icon: [
        { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/brand/logo-mark-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#482044',
  width: 'device-width',
  initialScale: 1,
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params
  // An unsupported locale still gets a usable shell; the page below renders the 404.
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE
  const meta = LOCALE_META[locale]
  const dict = getDictionary(locale)
  const { settings } = await getShopSettings(locale)

  return (
    <html
      lang={meta.htmlLang}
      dir={meta.dir}
      className={`${notoSans.variable} ${notoSansArabic.variable}`}
    >
      <head>
        {/* Without JavaScript the mobile filter drawer cannot open: show the inline form instead. */}
        <noscript>
          <style>{`.filters-desktop{display:block}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main-content" className="skip-link">
          {dict.nav.skipToContent}
        </a>
        <SiteHeader locale={locale} dict={dict} settings={settings} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10"
          tabIndex={-1}
        >
          {children}
        </main>
        <SiteFooter locale={locale} dict={dict} settings={settings} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(
              organizationJsonLd({
                name: settings.publicName,
                instagramUrl: settings.instagramUrl,
              }),
            ),
          }}
        />
      </body>
    </html>
  )
}
