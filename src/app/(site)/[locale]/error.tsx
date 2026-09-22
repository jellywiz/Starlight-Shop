'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'

import { DEFAULT_LOCALE, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import { CATALOG_UNAVAILABLE_DIGEST } from '@/lib/catalog/types'
import { SHOP_DEFAULTS } from '@/lib/shop'

/**
 * Translated error page with the confirmed contact destination (spec section 9). Uses
 * only static data so it renders even when the database is the problem. A
 * CatalogUnavailableError that escapes a per-request page lands here with its digest
 * intact (Next.js strips everything else from server errors), so the outage wording is
 * shown and Try again re-renders the page.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ locale?: string }>()
  const locale = isLocale(params?.locale) ? params.locale : DEFAULT_LOCALE
  const dict = getDictionary(locale)
  const outage = error.digest === CATALOG_UNAVAILABLE_DIGEST

  useEffect(() => {
    // Only the digest reaches the console: no stack traces or request contents.
    console.error(`[site] error ${error.digest ?? ''}`)
  }, [error])

  return (
    <div role="alert" className="mx-auto max-w-xl py-10 text-center">
      <h1 className="text-2xl font-bold text-heading">{dict.unavailable.heading}</h1>
      <p className="mt-2 text-ink-soft">
        {outage ? dict.unavailable.body : dict.errors.unexpected}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          {dict.unavailable.retry}
        </button>
        <a
          href={SHOP_DEFAULTS.instagramUrl}
          className="btn-secondary"
          target="_blank"
          rel="noopener noreferrer external"
        >
          {dict.home.instagramAction}
        </a>
      </div>
      <p className="mt-6">
        <Link href={`/${locale}`} className="link-plum">
          {dict.notFound.goHome}
        </Link>
      </p>
    </div>
  )
}
