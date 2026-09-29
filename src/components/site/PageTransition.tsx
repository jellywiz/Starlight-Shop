'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode, ViewTransition } from 'react'

/**
 * Cross-fades the page content when the route changes (a new pathname mounts a new
 * boundary: the old page fades out, the new one fades in) and does nothing when only
 * the search parameters change — the catalogue results following the filters must
 * update in place, because a view transition freezes the page for its duration and
 * would swallow keystrokes. The photo of a tapped product still glides into its
 * gallery through the shared `vt-photo` boundaries inside the pages.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <ViewTransition key={pathname} enter="vt-page-in" exit="vt-page-out" update="none">
      {children}
    </ViewTransition>
  )
}
