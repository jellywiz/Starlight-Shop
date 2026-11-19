'use client'

import { useEffect, useRef, useState } from 'react'

import { InstagramIcon } from '@/components/site/InstagramLink'

/**
 * Copies synchronously inside the tap, before the browser leaves for Instagram: once the
 * Instagram app or tab takes focus, the asynchronous Clipboard API is often refused.
 */
function copyNow(text: string): boolean {
  const active = document.activeElement as HTMLElement | null
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  // 16px avoids iOS zooming in; off-screen so nothing flashes.
  area.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;font-size:16px'
  document.body.appendChild(area)
  let copied = false
  try {
    area.select()
    area.setSelectionRange(0, text.length)
    copied = document.execCommand('copy')
  } catch {
    copied = false
  } finally {
    area.remove()
    active?.focus({ preventScroll: true })
  }
  return copied
}

/**
 * "Enquire on Instagram" that also puts the product's link on the clipboard, so the
 * visitor only has to paste it into the message (the shop then knows which piece they
 * mean). Still a plain link to the confirmed profile: no message prefilling, no API, no
 * tracking (spec section 8). Without JavaScript it is an ordinary link.
 */
export function EnquireLink({
  href,
  label,
  copyValue,
  copiedLabel,
  opensInNewTab,
  className,
  toastPlacement = 'above',
}: {
  href: string
  label: string
  copyValue: string
  copiedLabel: string
  opensInNewTab: string
  className: string
  toastPlacement?: 'above' | 'below'
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    },
    [],
  )

  const showCopied = () => {
    setCopied(true)
    if (timer.current) {
      clearTimeout(timer.current)
    }
    // Long enough to still be there when the visitor comes back from Instagram.
    timer.current = setTimeout(() => setCopied(false), 8000)
  }

  return (
    <div className="relative">
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer external"
        data-testid="enquire-link"
        onClick={() => {
          if (copyNow(copyValue)) {
            showCopied()
            return
          }
          // Fallback for browsers without execCommand copy; may be refused once focus moves.
          navigator.clipboard?.writeText(copyValue).then(showCopied, () => undefined)
        }}
      >
        <InstagramIcon />
        <span>{label}</span>
        <span className="sr-only"> ({opensInNewTab})</span>
      </a>
      <p
        aria-live="polite"
        aria-atomic="true"
        data-testid="enquire-copied"
        className={
          copied
            ? `absolute end-0 z-10 w-64 max-w-[80vw] rounded-xl bg-surface-3 px-3 py-2 text-sm font-medium text-heading shadow-lg ring-1 ring-accent-soft/40 ring-inset ${
                toastPlacement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
              }`
            : 'sr-only'
        }
      >
        {copied ? copiedLabel : ''}
      </p>
    </div>
  )
}
