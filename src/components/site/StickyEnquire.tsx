'use client'

import { type ReactNode, useEffect, useState } from 'react'

/**
 * On phones and tablets the product page's actions sit under the photo and the title,
 * often below the fold. This bar keeps the price and "Enquire on Instagram" within one
 * tap at the bottom of the screen, and steps aside while the page's own action block
 * (`anchorId`) is on screen so the button is never shown twice. Hidden on large screens
 * by CSS, where the actions are beside the gallery anyway.
 */
export function StickyEnquire({ anchorId, children }: { anchorId: string; children: ReactNode }) {
  // Starts hidden so the server-rendered page never shows two buttons at once.
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const anchor = document.getElementById(anchorId)
    if (!anchor || typeof IntersectionObserver === 'undefined') {
      // An enhancement only: without an observer the page's own button remains.
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      // The bar itself covers the bottom of the viewport: count the block as visible
      // only when it is above the bar.
      { rootMargin: '0px 0px -72px 0px' },
    )
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [anchorId])

  return (
    <div
      className={`sticky-enquire lg:hidden${hidden ? ' sticky-enquire--hidden' : ''}`}
      data-testid="sticky-enquire"
      data-shown={hidden ? 'false' : 'true'}
      aria-hidden={hidden}
      inert={hidden}
    >
      {children}
    </div>
  )
}
