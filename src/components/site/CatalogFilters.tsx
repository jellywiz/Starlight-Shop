'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionary'
import { parseIqd } from '@/lib/catalog/dinar'
import { MAX_QUERY_LENGTH, type CatalogError, type RawCatalogParams } from '@/lib/catalog/params'
import type { CatalogFilters as FilterOptions } from '@/lib/catalog/types'

type Props = {
  locale: Locale
  dict: Dictionary
  options: FilterOptions
  raw: RawCatalogParams
  errors: CatalogError[]
  /** "Show 12 products" for the phone filter screen; null when there are no results to count. */
  showResultsLabel: string | null
}

const DEBOUNCE_MS = 300

/** What the form shows; every field is a string exactly as the visitor sees it. */
type FieldValues = {
  q: string
  category: string
  min: string
  max: string
  availability: string
  sort: string
}

const FIELD_NAMES = ['q', 'category', 'min', 'max', 'availability', 'sort'] as const

/** What Clear all shows: every field empty (availability "all"). */
const EMPTY_FIELDS: FieldValues = {
  q: '',
  category: '',
  min: '',
  max: '',
  availability: 'all',
  sort: '',
}

function fieldsFromRaw(raw: RawCatalogParams): FieldValues {
  return {
    q: raw.q,
    category: raw.category,
    min: raw.min,
    max: raw.max,
    availability: raw.availability || 'all',
    sort: raw.sort,
  }
}

/** The sort the form shows when none is in the URL: relevance while searching, else newest. */
function effectiveSort(values: FieldValues): string {
  return values.sort || (values.q.trim() ? 'relevance' : 'newest')
}

/**
 * The price fields are checked in the browser before anything is applied, with the same
 * rules as the server (parseIqd). While a value is unfinished or the range is reversed
 * (typing a maximum one digit at a time passes through "1", "10", …), the results on screen
 * stay as they are and a hint explains what to fix, instead of the grid disappearing.
 */
function priceProblem(values: FieldValues): CatalogError | null {
  const min = values.min.trim() ? parseIqd(values.min, { allowZero: true }) : null
  const max = values.max.trim() ? parseIqd(values.max, { allowZero: true }) : null
  if (min && !min.ok) {
    return { code: 'INVALID_PRICE_MIN', field: 'min' }
  }
  if (max && !max.ok) {
    return { code: 'INVALID_PRICE_MAX', field: 'max' }
  }
  if (min?.ok && max?.ok && min.amount > max.amount) {
    return { code: 'INVALID_PRICE_RANGE', field: 'range' }
  }
  return null
}

/** Builds the canonical catalog URL, dropping empty values, defaults and the page. */
function catalogUrl(values: FieldValues, locale: Locale): string {
  const params = new URLSearchParams()
  const q = values.q.trim()
  for (const key of FIELD_NAMES) {
    const trimmed = values[key].trim()
    if (!trimmed) {
      continue
    }
    if (key === 'availability' && trimmed === 'all') {
      continue
    }
    if (key === 'sort' && (trimmed === 'newest' || trimmed === 'relevance')) {
      // Defaults are omitted; relevance applies automatically when searching.
      if ((q && trimmed === 'relevance') || (!q && trimmed === 'newest')) {
        continue
      }
    }
    params.append(key, trimmed)
  }
  const qs = params.toString()
  return `/${locale}/products${qs ? `?${qs}` : ''}`
}

/**
 * Filter form (spec section 3). Works without JavaScript as a plain GET form; with
 * JavaScript, changes are applied after a 300 ms debounce through client navigation,
 * which lets React cancel superseded renders so stale results never replace newer ones.
 */
function FilterForm({
  locale,
  dict,
  options,
  raw,
  errors,
  idPrefix,
  onApplied,
  showSearch,
  showResultsLabel,
  flushOnUnmount = false,
}: Omit<Props, 'showResultsLabel'> & {
  idPrefix: string
  onApplied?: () => void
  showSearch: boolean
  /** Set for the phone screen: its main button reads "Show 12 products". */
  showResultsLabel?: string | null
  /** Apply a change that is still waiting for the debounce when the form goes away. */
  flushOnUnmount?: boolean
}) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The change waiting for the debounce, so closing the phone screen can apply it at once.
  const pendingValues = useRef<FieldValues | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [pending, startTransition] = useTransition()
  const errorFor = (field: string) => errors.find((e) => e.field === field)
  const id = (name: string) => `${idPrefix}-${name}`

  // The fields are controlled so they can follow the URL: `raw` is what the results on
  // the page were computed from, and the form shows it unless the visitor is ahead of it.
  const [values, setValues] = useState<FieldValues>(() => fieldsFromRaw(raw))
  const resultsUrl = catalogUrl(fieldsFromRaw(raw), locale)
  const [shownResultsUrl, setShownResultsUrl] = useState(resultsUrl)
  // URLs this form navigated to whose results have not arrived yet. Their results must
  // not reset the fields (the visitor may have typed more meanwhile); any other results
  // — a removed chip, Clear all, Back/Forward — replace what the form shows.
  const [ownNavigations, setOwnNavigations] = useState<string[]>([])
  if (resultsUrl !== shownResultsUrl) {
    // New results arrived: React's "adjusting state while rendering" pattern.
    setShownResultsUrl(resultsUrl)
    const own = ownNavigations.indexOf(resultsUrl)
    if (own >= 0) {
      setOwnNavigations(ownNavigations.slice(own + 1))
    } else {
      setOwnNavigations([])
      setValues(fieldsFromRaw(raw))
    }
  }

  // Price problems are judged on what the visitor typed, not on the URL (see priceProblem).
  const price = priceProblem(values)
  const minInvalid = price?.field === 'min' || price?.field === 'range'
  const maxInvalid = price?.field === 'max' || price?.field === 'range'

  const navigate = useCallback(
    (next: FieldValues, replace: boolean) => {
      const url = catalogUrl(next, locale)
      setOwnNavigations((list) => [...list, url])
      startTransition(() => {
        if (replace) {
          router.replace(url, { scroll: false })
        } else {
          router.push(url, { scroll: false })
        }
      })
    },
    [locale, router],
  )

  const cancelPending = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    pendingValues.current = null
    setWaiting(false)
  }

  /** Applies a field change and navigates after the debounce (never with a bad price). */
  const update = (patch: Partial<FieldValues>) => {
    const next = { ...values, ...patch }
    setValues(next)
    cancelPending()
    if (priceProblem(next)) {
      // Keep the current results on screen until the price makes sense.
      return
    }
    pendingValues.current = next
    setWaiting(true)
    timer.current = setTimeout(() => {
      timer.current = null
      pendingValues.current = null
      setWaiting(false)
      navigate(next, true)
    }, DEBOUNCE_MS)
  }

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
      // Closing the phone screen right after a change must not lose it.
      if (flushOnUnmount && pendingValues.current) {
        router.replace(catalogUrl(pendingValues.current, locale), { scroll: false })
      }
    },
    [flushOnUnmount, locale, router],
  )

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    cancelPending()
    if (price) {
      document.getElementById(id(price.field === 'max' ? 'max' : 'min'))?.focus()
      return
    }
    if (catalogUrl(values, locale) !== resultsUrl) {
      navigate(values, false)
    }
    onApplied?.()
  }

  const busy = waiting || pending

  return (
    <form
      method="get"
      action={`/${locale}/products`}
      onSubmit={onSubmit}
      aria-busy={busy}
      className={`flex flex-col gap-5${showResultsLabel !== undefined ? ' flex-1' : ''}`}
      aria-describedby={errors.length ? id('errors') : undefined}
    >
      {errors.length > 0 ? (
        // Not an alert: the results area announces the same problem once.
        <div
          id={id('errors')}
          className="rounded-xl bg-danger-100 p-3 text-sm text-danger-700 ring-1 ring-danger-700/20 ring-inset"
        >
          <p className="font-semibold">{dict.errors.formHasErrors}</p>
          <ul className="mt-1 list-disc ps-5">
            {errors.map((error) => (
              <li key={`${error.code}-${error.field}`}>{dict.errors[error.code]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {showSearch ? (
        <div>
          <label htmlFor={id('q')} className="block text-sm font-semibold">
            {dict.catalog.searchLabel}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={id('q')}
              name="q"
              type="search"
              value={values.q}
              maxLength={MAX_QUERY_LENGTH}
              placeholder={dict.catalog.searchPlaceholder}
              className="input"
              onChange={(event) => update({ q: event.target.value })}
              aria-invalid={Boolean(errorFor('q'))}
            />
            <button type="submit" className="btn-primary shrink-0">
              {dict.catalog.searchButton}
            </button>
          </div>
          {errorFor('q') ? (
            <p className="mt-1 text-sm text-danger-700">{dict.errors[errorFor('q')!.code]}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor={id('category')} className="block text-sm font-semibold">
          {dict.catalog.categoryLabel}
        </label>
        <select
          id={id('category')}
          name="category"
          value={values.category}
          className="input mt-1"
          onChange={(event) => update({ category: event.target.value })}
          aria-invalid={Boolean(errorFor('category'))}
        >
          <option value="">{dict.catalog.allCategories}</option>
          {options.categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset aria-describedby={price ? id('price-error') : undefined}>
        <legend className="text-sm font-semibold">{dict.catalog.priceLabel}</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={id('min')} className="block text-xs text-ink-soft">
              {dict.catalog.minPrice}
            </label>
            <input
              id={id('min')}
              name="min"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={values.min}
              className="input mt-1"
              onChange={(event) => update({ min: event.target.value })}
              aria-invalid={minInvalid}
              aria-describedby={price ? id('price-error') : undefined}
            />
          </div>
          <div>
            <label htmlFor={id('max')} className="block text-xs text-ink-soft">
              {dict.catalog.maxPrice}
            </label>
            <input
              id={id('max')}
              name="max"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={values.max}
              className="input mt-1"
              onChange={(event) => update({ max: event.target.value })}
              aria-invalid={maxInvalid}
              aria-describedby={price ? id('price-error') : undefined}
            />
          </div>
        </div>
        {/* Polite, not an alert: it appears while the visitor is still typing. */}
        <p
          id={id('price-error')}
          aria-live="polite"
          data-testid="price-hint"
          className={price ? 'mt-1 text-xs text-danger-700' : 'sr-only'}
        >
          {price ? dict.errors[price.code] : ''}
        </p>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">{dict.catalog.availabilityLabel}</legend>
        <div className="mt-1 flex flex-wrap gap-3 text-sm">
          {(['all', 'available', 'unavailable'] as const).map((value) => (
            <label key={value} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="availability"
                value={value}
                checked={values.availability === value}
                onChange={() => update({ availability: value })}
                className="h-4 w-4 accent-plum-700"
              />
              {value === 'all'
                ? dict.catalog.availabilityAll
                : value === 'available'
                  ? dict.catalog.availabilityAvailable
                  : dict.catalog.availabilityUnavailable}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={id('sort')} className="block text-sm font-semibold">
          {dict.catalog.sortLabel}
        </label>
        <select
          id={id('sort')}
          name="sort"
          value={effectiveSort(values)}
          className="input mt-1"
          onChange={(event) => update({ sort: event.target.value })}
        >
          {values.q.trim() ? <option value="relevance">{dict.catalog.sortRelevance}</option> : null}
          <option value="newest">{dict.catalog.sortNewest}</option>
          <option value="price-asc">{dict.catalog.sortPriceAsc}</option>
          <option value="price-desc">{dict.catalog.sortPriceDesc}</option>
        </select>
      </div>

      <div
        className={
          showResultsLabel !== undefined
            ? // Phone screen: always in reach at the bottom, however long the form is.
              'sticky bottom-0 -mx-4 -mb-4 mt-auto flex items-center gap-3 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
            : 'flex flex-wrap items-center gap-3'
        }
      >
        {/* A link, so it also works without JavaScript; with it, the fields clear at once
            and the results follow through a client-side navigation instead of a reload. */}
        <Link
          href={`/${locale}/products`}
          className="btn-secondary"
          onClick={() => {
            cancelPending()
            setValues(EMPTY_FIELDS)
            onApplied?.()
          }}
        >
          {dict.catalog.clearFilters}
        </Link>
        {showResultsLabel !== undefined ? (
          <button
            type="submit"
            className="btn-primary flex-1"
            data-testid="show-results"
            aria-live="polite"
          >
            {busy ? dict.common.updating : (showResultsLabel ?? dict.catalog.applyFilters)}
          </button>
        ) : (
          <>
            <button type="submit" className="btn-primary order-first">
              {dict.catalog.applyFilters}
            </button>
            <span className="text-sm text-ink-soft" aria-live="polite">
              {busy ? dict.common.updating : ''}
            </span>
          </>
        )}
      </div>
    </form>
  )
}

export function CatalogFilters(props: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const titleId = useId()

  const close = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    const onClose = () => {
      setOpen(false)
      openerRef.current?.focus()
    }
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [])

  const { showResultsLabel, ...formProps } = props

  return (
    <>
      <div className="md:hidden">
        <button
          ref={openerRef}
          type="button"
          className="btn-secondary w-full"
          aria-haspopup="dialog"
          onClick={() => {
            setOpen(true)
            dialogRef.current?.showModal()
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current stroke-2"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {props.dict.catalog.openFilters}
        </button>
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          className="m-0 h-dvh max-h-dvh w-full max-w-none bg-surface p-0 backdrop:bg-plum-950/80 open:flex open:flex-col"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 id={titleId} className="text-lg font-bold">
              {props.dict.catalog.filtersHeading}
            </h2>
            <button type="button" className="rounded-full p-2 hover:bg-surface-2" onClick={close}>
              <span className="sr-only">{props.dict.catalog.closeFilters}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-current stroke-2"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {/* overscroll-contain: scrolling the filters never scrolls the page behind. */}
          <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
            {open ? (
              <FilterForm
                {...formProps}
                idPrefix="mobile"
                onApplied={close}
                showSearch
                showResultsLabel={showResultsLabel}
                flushOnUnmount
              />
            ) : null}
          </div>
        </dialog>
      </div>
      <aside
        className="filters-desktop card hidden self-start p-5 md:block"
        aria-labelledby="desktop-filters-heading"
      >
        <h2 id="desktop-filters-heading" className="mb-4 text-lg font-semibold">
          {props.dict.catalog.filtersHeading}
        </h2>
        <FilterForm {...formProps} idPrefix="desktop" showSearch />
      </aside>
    </>
  )
}
