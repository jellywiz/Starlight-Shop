'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { DEFAULT_LOCALE, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'

/** Translated 404 with a catalog link (spec section 2). */
export default function NotFound() {
  const params = useParams<{ locale?: string }>()
  const locale = isLocale(params?.locale) ? params.locale : DEFAULT_LOCALE
  const dict = getDictionary(locale)
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <p className="text-6xl font-bold text-plum-200" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold text-heading">{dict.notFound.heading}</h1>
      <p className="mt-2 text-ink-soft">{dict.notFound.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/${locale}/products`} className="btn-primary">
          {dict.notFound.goToCatalog}
        </Link>
        <Link href={`/${locale}`} className="btn-secondary">
          {dict.notFound.goHome}
        </Link>
      </div>
    </div>
  )
}
