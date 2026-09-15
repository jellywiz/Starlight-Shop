'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { LOCALES, LOCALE_META, type Locale } from '@/i18n/config'

/**
 * Three-language switcher (spec section 4). Keeps the current path (same product) and
 * the current query (valid catalog filters) while swapping the locale segment.
 */
export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname() || `/${current}`
  const searchParams = useSearchParams()
  const query = searchParams?.toString()
  const rest = pathname.replace(/^\/[^/]+/, '')

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      {LOCALES.map((locale) => {
        const href = `/${locale}${rest}${query ? `?${query}` : ''}`
        const active = locale === current
        return (
          <Link
            key={locale}
            href={href}
            lang={LOCALE_META[locale].htmlLang}
            dir={LOCALE_META[locale].dir}
            hrefLang={LOCALE_META[locale].htmlLang}
            aria-current={active ? 'true' : undefined}
            className={`rounded-full px-3 py-1 text-sm ${active ? 'bg-plum-700 font-semibold text-white' : 'text-ink-soft hover:bg-plum-50 hover:text-plum-900'}`}
          >
            {LOCALE_META[locale].label}
          </Link>
        )
      })}
    </nav>
  )
}
