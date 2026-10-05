import Link from 'next/link'
import { Suspense } from 'react'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { deliveryFeesPath } from '@/lib/catalog/links'
import type { PublicShopSettings } from '@/lib/shop'

import { LanguageSwitcher } from './LanguageSwitcher'
import { LinkDot } from './LinkPending'
import { MobileMenu } from './MobileMenu'
import { SiteSearch } from './SiteSearch'
import { ThemeToggle } from './ThemeToggle'

/**
 * Sticky header (spec section 2): logo, Home, Products, Delivery fees, About, Contact,
 * search, the light/dark switch and the language switcher. The logo keeps its own light
 * background and is never mirrored in RTL. No shopping or account icons exist.
 */
export function SiteHeader({
  locale,
  dict,
  settings,
}: {
  locale: Locale
  dict: Dictionary
  settings: PublicShopSettings
}) {
  const items = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/products`, label: dict.nav.products },
    { href: deliveryFeesPath(locale), label: dict.nav.delivery },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ]
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 text-ink backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href={`/${locale}`}
          className="flex shrink-0 items-center gap-2.5"
          aria-label={dict.nav.logoLinkLabel}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark-128.webp"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl"
          />
          <span className="text-lg font-semibold text-heading max-[360px]:sr-only">
            {settings.publicName}
          </span>
        </Link>
        <nav aria-label={dict.nav.mainNavigation} className="ms-3 hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-heading"
                >
                  {item.label}
                  <LinkDot />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SiteSearch
          locale={locale}
          labels={{
            search: dict.catalog.searchLabel,
            placeholder: dict.catalog.searchPlaceholder,
            button: dict.catalog.searchButton,
            suggestions: dict.search.suggestions,
            searchFor: dict.search.searchFor,
            noMatches: dict.search.noMatches,
            close: dict.search.close,
            loading: dict.search.loading,
            currencyFormat: dict.common.currencyFormat,
          }}
        />
        <div className="flex items-center gap-1 sm:ms-2">
          <div className="hidden lg:block">
            <Suspense fallback={<span className="text-sm text-ink-soft">{dict.nav.language}</span>}>
              <LanguageSwitcher current={locale} label={dict.nav.language} />
            </Suspense>
          </div>
          <ThemeToggle
            labels={{ toDark: dict.nav.switchToDark, toLight: dict.nav.switchToLight }}
          />
          <MobileMenu
            items={items}
            openLabel={dict.nav.openMenu}
            closeLabel={dict.nav.closeMenu}
            navLabel={dict.nav.mainNavigation}
          >
            <Suspense fallback={<span className="text-sm text-ink-soft">{dict.nav.language}</span>}>
              <LanguageSwitcher current={locale} label={dict.nav.language} />
            </Suspense>
          </MobileMenu>
        </div>
      </div>
    </header>
  )
}
