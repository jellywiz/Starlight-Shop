'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

type Item = { href: string; label: string }

/**
 * Accessible disclosure menu for narrow screens: button + navigation list. The language
 * switcher is passed as `children` so it stays reachable without crowding the header.
 */
export function MobileMenu({
  items,
  openLabel,
  closeLabel,
  navLabel,
  children,
}: {
  items: Item[]
  openLabel: string
  closeLabel: string
  navLabel: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const pathname = usePathname()
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="rounded-full p-2 text-emphasis hover:bg-surface-2"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? closeLabel : openLabel}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-current stroke-2"
        >
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <nav
        id={id}
        aria-label={navLabel}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-t border-line bg-surface shadow-lg"
      >
        <ul className="flex flex-col p-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-xl px-3 py-3 text-base text-ink hover:bg-surface-2"
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {children ? <div className="border-t border-line px-3 py-3">{children}</div> : null}
      </nav>
    </div>
  )
}
