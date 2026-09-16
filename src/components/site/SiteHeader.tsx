import Link from 'next/link'
import { Suspense } from 'react'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { deliveryFeesPath } from '@/lib/catalog/links'
import type { PublicShopSettings } from '@/lib/shop'

import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileMenu } from './MobileMenu'
import { ThemeToggle } from './ThemeToggle'

function SearchIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

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
            src="/brand/logo-mark-192.png"
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
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form
          action={`/${locale}/products`}
          method="get"
          role="search"
          className="ms-auto hidden min-w-0 flex-1 items-center sm:flex sm:max-w-xs"
        >
          <label htmlFor="header-search" className="sr-only">
            {dict.catalog.searchLabel}
          </label>
          <div className="relative w-full">
            <input
              id="header-search"
              type="search"
              name="q"
              maxLength={120}
              placeholder={dict.catalog.searchPlaceholder}
              className="w-full min-w-0 rounded-full bg-surface-2 py-2 ps-4 pe-11 text-sm text-ink ring-1 ring-line ring-inset placeholder:text-ink-muted focus:bg-surface focus:ring-2 focus:ring-focus focus:outline-none"
            />
            <button
              type="submit"
              className="absolute end-1 top-1/2 -translate-y-1/2 rounded-full bg-primary p-1.5 text-on-primary hover:bg-primary-hover"
              aria-label={dict.catalog.searchButton}
            >
              <SearchIcon className="h-4 w-4 fill-none stroke-current stroke-2" />
            </button>
          </div>
        </form>
        <div className="ms-auto flex items-center gap-1 sm:ms-2">
          <Link
            href={`/${locale}/products`}
            className="rounded-full p-2 text-emphasis hover:bg-surface-2 sm:hidden"
            aria-label={dict.nav.search}
          >
            <SearchIcon className="h-6 w-6 fill-none stroke-current stroke-2" />
          </Link>
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
