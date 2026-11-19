import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

/**
 * Every public page lives under the site layout `src/app/(site)/[locale]` (the route
 * group is part of the path Next.js keys its cache by). Product pages, About and Contact
 * are served from the cache (docs/decisions.md "Performance"): rendered once, kept by the
 * CDN, and thrown away here the moment any content they show could have changed, so the
 * next visit renders them fresh — nothing is ever served stale. The home page and the
 * catalogue listing render on every request (they depend on the URL); invalidating them
 * too is harmless.
 */
const SITE_LAYOUT = '/(site)/[locale]'

/**
 * Invalidates every cached public page. Coarse on purpose: a category rename changes the
 * breadcrumb of every product in it, a settings change touches every page's header and
 * footer, and a product change alters "More from this category" on its neighbours. The
 * catalogue is small, so re-rendering pages on demand is far cheaper than getting an
 * invalidation rule wrong.
 */
export function revalidatePublicPages(): void {
  try {
    revalidatePath(SITE_LAYOUT, 'layout')
  } catch (error) {
    // Outside a Next.js request (seed script, integration tests) there is no cache to
    // invalidate; the Local API keeps working.
    const message = error instanceof Error ? error.message : String(error)
    if (!/static generation store|request store/i.test(message)) {
      console.error(`[revalidate] ${message}`)
    }
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  // Safe to call before Payload commits the save: Next.js only queues the invalidation
  // here and applies it once the request handler has returned (route-module
  // `resolvePendingRevalidations`, the action handler for server actions), which is after
  // the commit. A visitor can therefore never re-cache the old version in between
  // (verified against Next 16.4 / Payload 3.93; docs/improvements.md P1-2).
  if (!req.context?.disableRevalidate) {
    revalidatePublicPages()
  }
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (!req.context?.disableRevalidate) {
    revalidatePublicPages()
  }
  return doc
}

export const revalidateGlobalAfterChange: GlobalAfterChangeHook = ({ doc, req }) => {
  if (!req.context?.disableRevalidate) {
    revalidatePublicPages()
  }
  return doc
}
