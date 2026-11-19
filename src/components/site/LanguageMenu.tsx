'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { LOCALES, LOCALE_META, type Locale } from '@/i18n/config'

/**
 * Language choice for phones and tablets (below `lg`): a globe button in the header that
 * opens the three languages, so Arabic and English visitors who land on the Kurdish
 * default can switch at once instead of finding it inside the menu. Keeps the current
 * page and its query, like the desktop switcher.
 */
export function LanguageMenu({
  current,
  label,
}: {
  current: Locale
  /** "Language" in the current language; also names the list. */
  label: string
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname() || `/${current}`
  const searchParams = useSearchParams()
  const query = searchParams?.toString()
  const rest = pathname.replace(/^\/[^/]+/, '')

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative lg:hidden" data-language-menu>
      <button
        ref={buttonRef}
        type="button"
        className="flex items-center rounded-full p-1.5 text-emphasis hover:bg-surface-2 sm:p-2"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${LOCALE_META[current].label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-[1.75]"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
        </svg>
      </button>
      <nav
        id={listId}
        aria-label={label}
        hidden={!open}
        className="absolute end-0 top-full z-40 mt-2 min-w-40 rounded-2xl bg-surface p-1.5 shadow-card-hover ring-1 ring-line"
      >
        <ul role="list" className="flex flex-col">
          {LOCALES.map((locale) => {
            const active = locale === current
            return (
              <li key={locale}>
                <Link
                  href={`/${locale}${rest}${query ? `?${query}` : ''}`}
                  lang={LOCALE_META[locale].htmlLang}
                  dir={LOCALE_META[locale].dir}
                  hrefLang={LOCALE_META[locale].htmlLang}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-base ${
                    active
                      ? 'bg-surface-2 font-semibold text-heading'
                      : 'text-ink-soft hover:bg-surface-2 hover:text-heading'
                  }`}
                >
                  {LOCALE_META[locale].label}
                  {active ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 fill-none stroke-current stroke-2"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
