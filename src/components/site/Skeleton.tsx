'use client'

import { useParams } from 'next/navigation'

import { DEFAULT_LOCALE, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'

/**
 * Placeholders shown the instant a visitor taps towards a page that has to be built by
 * the server (home, catalogue, a product page not yet in the cache), so the tap is never
 * silent. Shapes mirror the real pages so the content settles in place; colours are the
 * semantic tokens so light and dark both look right.
 */

export function Bar({ className = '' }: { className?: string }) {
  return <span className={`skeleton-bar ${className}`} />
}

/** A product card's placeholder: a square photo frame and two lines of text. */
export function CardSkeleton() {
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="aspect-square w-full bg-white" />
      <div className="flex flex-col gap-2 border-t border-line-soft p-3 sm:p-4">
        <Bar className="h-3 w-16" />
        <Bar className="h-4 w-3/4" />
        <Bar className="mt-2 h-5 w-24" />
      </div>
    </div>
  )
}

export function GridSkeleton({ count, columns }: { count: number; columns: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 ${columns}`}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/** The accessible name of a loading region, in the page's language. */
export function useLoadingLabel(): string {
  const params = useParams<{ locale?: string }>()
  const locale = isLocale(params?.locale) ? params.locale : DEFAULT_LOCALE
  return getDictionary(locale).common.loading
}

export function LoadingRegion({ testId, children }: { testId: string; children: React.ReactNode }) {
  const label = useLoadingLabel()
  return (
    <div role="status" aria-busy="true" aria-label={label} data-testid={testId}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
