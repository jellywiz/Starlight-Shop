'use client'

import { useLinkStatus } from 'next/link'
import { useEffect, useSyncExternalStore } from 'react'

/**
 * Feedback for a tapped link while its page is on its way (spec section 11: no dead taps).
 * The spinner and the dot read Next's link status, so they must be rendered inside the
 * <Link> they describe; each also reports to a shared count so the progress bar at the
 * top of the page (NavigationProgress) runs while any decorated link is pending. Every
 * indicator appears only after a short delay (CSS), so an instant navigation never
 * flashes.
 */

let pendingLinks = 0
const listeners = new Set<() => void>()

function publish() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getPending = () => pendingLinks > 0
const getServerPending = () => false

/** Whether any decorated link is waiting for its page. */
export function useAnyLinkPending(): boolean {
  return useSyncExternalStore(subscribe, getPending, getServerPending)
}

function useReportPending(): boolean {
  const { pending } = useLinkStatus()
  useEffect(() => {
    if (!pending) {
      return
    }
    pendingLinks += 1
    publish()
    return () => {
      pendingLinks -= 1
      publish()
    }
  }, [pending])
  return pending
}

/** A spinner over a card's photo. */
export function LinkSpinner() {
  const pending = useReportPending()
  if (!pending) {
    return null
  }
  return (
    <span className="link-spinner" data-pending="true" aria-hidden="true">
      <span className="link-spinner__ring" />
    </span>
  )
}

/** A small dot after a link's text or in a button. */
export function LinkDot() {
  const pending = useReportPending()
  return (
    <span
      className={`link-dot${pending ? ' link-dot--on' : ''}`}
      data-pending={pending ? 'true' : undefined}
      aria-hidden="true"
    />
  )
}

/** A thin bar along the top of the page while a decorated link is waiting for its page. */
export function NavigationProgress() {
  const pending = useAnyLinkPending()
  return (
    <div
      className={`nav-progress${pending ? ' nav-progress--on' : ''}`}
      data-pending={pending ? 'true' : undefined}
      aria-hidden="true"
    />
  )
}
