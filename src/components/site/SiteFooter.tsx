import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import { type Dictionary, t } from '@/i18n/dictionary'
import { deliveryFeesPath } from '@/lib/catalog/links'
import type { PublicShopSettings } from '@/lib/shop'

import { InstagramIcon } from './InstagramLink'
import { Sparkles } from './Sparkles'

/** Deep-plum footer with a gentle starfield: shop name, tagline, Instagram and links. */
export function SiteFooter({
  locale,
  dict,
  settings,
}: {
  locale: Locale
  dict: Dictionary
  settings: PublicShopSettings
}) {
  return (
    <footer className="relative mt-16 overflow-hidden bg-plum-900 text-plum-100">
      <Sparkles count={26} seed={41} className="text-star/80" minSize={4} maxSize={14} />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark-128.webp"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-2xl bg-[#fdfdfd] p-1"
          />
          <div>
            <p className="text-base font-semibold text-white">{settings.publicName}</p>
            <p className="mt-1 text-sm text-plum-200">{dict.footer.tagline}</p>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">{dict.contact.instagram}</p>
          <a
            href={settings.instagramUrl}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 ring-inset hover:bg-white/20"
            target="_blank"
            rel="noopener noreferrer external"
            title={dict.common.opensInNewTab}
          >
            <InstagramIcon className="h-5 w-5" />
            <bdi dir="ltr" className="ltr-isolate">
              {settings.instagramHandle}
            </bdi>
            <span className="sr-only"> ({dict.common.opensInNewTab})</span>
          </a>
          <p className="mt-3 text-plum-200">{dict.common.inquiryNote}</p>
        </div>
        <nav aria-label={dict.nav.mainNavigation} className="text-sm">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 md:flex-col">
            <li>
              <Link href={`/${locale}/products`} className="font-medium text-white hover:underline">
                {dict.nav.products}
              </Link>
            </li>
            <li>
              <Link
                href={deliveryFeesPath(locale)}
                className="font-medium text-white hover:underline"
              >
                {dict.nav.delivery}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/about`} className="font-medium text-white hover:underline">
                {dict.nav.about}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/contact`} className="font-medium text-white hover:underline">
                {dict.nav.contact}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-plum-300 sm:px-6">
          {t(dict.footer.rights, { year: String(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  )
}
