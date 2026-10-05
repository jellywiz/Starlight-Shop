'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import type { Locale } from '@/i18n/config'
import { formatIqd } from '@/lib/catalog/dinar'
import type { CatalogItem, CatalogResult } from '@/lib/catalog/types'

export type SearchLabels = {
  search: string
  placeholder: string
  button: string
  suggestions: string
  searchFor: string
  noMatches: string
  close: string
  loading: string
  /** Currency template, e.g. "IQD {amount}". */
  currencyFormat: string
}

const MIN_QUERY = 2
const DEBOUNCE_MS = 200
const LIMIT = 6

export function SearchIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

type Suggestions =
  | { state: 'idle' }
  | { state: 'loading'; items: CatalogItem[] }
  | { state: 'ready'; items: CatalogItem[] }
  | { state: 'failed' }

/**
 * The header's search (spec section 2). On a computer the field sits in the header; on a
 * phone the magnifier opens it across the header, focused, so a visitor types straight
 * away instead of landing on the catalogue and opening its filters. While they type,
 * matching pieces appear underneath (from the public catalogue API, the same ranking as
 * the catalogue) and open with a tap, an arrow key or Enter; Enter without a choice runs
 * the full search. Without JavaScript the form is a plain search of the catalogue.
 */
export function SiteSearch({ locale, labels }: { locale: Locale; labels: SearchLabels }) {
  const router = useRouter()
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestions>({ state: 'idle' })
  const [listOpen, setListOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLAnchorElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controller = useRef<AbortController | null>(null)

  const trimmed = query.trim()
  const items =
    suggestions.state === 'loading' || suggestions.state === 'ready' ? suggestions.items : []
  // The last row runs the full search; it is always there once something is typed.
  const rows = trimmed.length >= MIN_QUERY ? items.length + 1 : 0
  const showList = listOpen && trimmed.length >= MIN_QUERY

  const catalogueUrl = (q: string) => `/${locale}/products?q=${encodeURIComponent(q)}`

  const close = () => {
    setListOpen(false)
    setActive(-1)
  }
  const closeOverlay = () => {
    close()
    setOpen(false)
  }

  // Fetch suggestions a moment after the visitor stops typing; stale answers are dropped.
  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current)
    }
    controller.current?.abort()
    if (trimmed.length < MIN_QUERY) {
      return
    }
    timer.current = setTimeout(async () => {
      const abort = new AbortController()
      controller.current = abort
      setSuggestions((s) => ({ state: 'loading', items: 'items' in s ? s.items : [] }))
      try {
        const params = new URLSearchParams({
          locale,
          q: trimmed,
          sort: 'relevance',
          limit: String(LIMIT),
        })
        const response = await fetch(`/api/catalog?${params}`, { signal: abort.signal })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const result = (await response.json()) as CatalogResult
        if (!abort.signal.aborted) {
          setSuggestions({ state: 'ready', items: result.items.slice(0, LIMIT) })
          setActive(-1)
        }
      } catch {
        if (!abort.signal.aborted) {
          setSuggestions({ state: 'failed' })
        }
      }
    }, DEBOUNCE_MS)
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [trimmed, locale])

  // A tap or click anywhere else closes the list (and the phone overlay).
  useEffect(() => {
    if (!listOpen && !open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setListOpen(false)
        setActive(-1)
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [listOpen, open])

  const openOverlay = () => {
    setOpen(true)
    // The field is in the page already (hidden); focus it once it is shown.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const go = (href: string) => {
    closeOverlay()
    router.push(href)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (active >= 0 && active < items.length) {
      go(`/${locale}/products/${items[active].slug}`)
      return
    }
    if (trimmed) {
      go(catalogueUrl(trimmed))
    }
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (showList) {
        close()
      } else if (open) {
        closeOverlay()
        triggerRef.current?.focus()
      }
      return
    }
    if (rows === 0) {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setListOpen(true)
      setActive((a) => (a + 1) % rows)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setListOpen(true)
      setActive((a) => (a <= 0 ? rows - 1 : a - 1))
    }
  }

  const optionId = (index: number) => `${id}-option-${index}`

  return (
    <div
      ref={rootRef}
      className={`site-search ms-auto flex min-w-0 items-center sm:flex-1 sm:max-w-xs${open ? ' site-search--open' : ''}`}
    >
      {/* Phone: the magnifier. A link to the catalogue until JavaScript takes over. */}
      <Link
        ref={triggerRef}
        href={`/${locale}/products`}
        className="rounded-full p-2 text-emphasis hover:bg-surface-2 sm:hidden"
        aria-label={labels.search}
        aria-expanded={open}
        aria-controls={`${id}-form`}
        onClick={(event) => {
          event.preventDefault()
          openOverlay()
        }}
      >
        <SearchIcon className="h-6 w-6 fill-none stroke-current stroke-2" />
      </Link>
      <form
        id={`${id}-form`}
        action={`/${locale}/products`}
        method="get"
        role="search"
        className="site-search__form"
        onSubmit={onSubmit}
      >
        <button
          type="button"
          className="site-search__close rounded-full p-2 text-emphasis hover:bg-surface-2 sm:hidden"
          aria-label={labels.close}
          onClick={() => {
            closeOverlay()
            triggerRef.current?.focus()
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 fill-none stroke-current stroke-2 rtl:-scale-x-100"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <label htmlFor={`${id}-input`} className="sr-only">
          {labels.search}
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id={`${id}-input`}
            type="search"
            name="q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setListOpen(true)
            }}
            onFocus={() => setListOpen(true)}
            onKeyDown={onKeyDown}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={labels.placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            className="w-full min-w-0 rounded-full bg-surface-2 py-2 ps-4 pe-11 text-base text-ink ring-1 ring-line ring-inset placeholder:text-ink-muted focus:bg-surface focus:ring-2 focus:ring-focus focus:outline-none sm:text-sm"
          />
          <button
            type="submit"
            className="absolute end-1 top-1/2 -translate-y-1/2 rounded-full bg-primary p-1.5 text-on-primary hover:bg-primary-hover"
            aria-label={labels.button}
          >
            <SearchIcon className="h-4 w-4 fill-none stroke-current stroke-2" />
          </button>
          <div
            id={listId}
            role="listbox"
            aria-label={labels.suggestions}
            hidden={!showList}
            className="site-search__list"
          >
            {items.map((item, index) => (
              <Link
                key={item.id}
                id={optionId(index)}
                role="option"
                aria-selected={active === index}
                href={`/${locale}/products/${item.slug}`}
                className={`site-search__option${active === index ? ' site-search__option--active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={(event) => {
                  event.preventDefault()
                  go(`/${locale}/products/${item.slug}`)
                }}
              >
                <span className="site-search__thumb">
                  {item.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover.sources[0]?.url ?? item.cover.src}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-heading">
                    {item.name}
                  </span>
                  <span className="block text-xs text-ink-soft">{item.category.name}</span>
                </span>
                <bdi
                  dir="ltr"
                  className="ltr-isolate shrink-0 text-sm font-semibold tabular-nums text-ink"
                >
                  {formatIqd(item.priceIqd, labels.currencyFormat)}
                </bdi>
              </Link>
            ))}
            {rows > 0 ? (
              <Link
                id={optionId(items.length)}
                role="option"
                aria-selected={active === items.length}
                href={catalogueUrl(trimmed)}
                className={`site-search__option site-search__option--all${active === items.length ? ' site-search__option--active' : ''}`}
                onMouseEnter={() => setActive(items.length)}
                onClick={(event) => {
                  event.preventDefault()
                  go(catalogueUrl(trimmed))
                }}
              >
                <SearchIcon className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {labels.searchFor.replace('{query}', trimmed)}
                </span>
              </Link>
            ) : null}
            {suggestions.state === 'ready' && items.length === 0 ? (
              <p className="px-3 py-2 text-xs text-ink-soft">{labels.noMatches}</p>
            ) : null}
            <p className="sr-only" aria-live="polite">
              {suggestions.state === 'loading' ? labels.loading : ''}
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
