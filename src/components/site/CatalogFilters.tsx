'use client'

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
import { MAX_QUERY_LENGTH, type CatalogError, type RawCatalogParams } from '@/lib/catalog/params'
import type { CatalogFilters as FilterOptions } from '@/lib/catalog/types'

type Props = {
  locale: Locale
  dict: Dictionary
  options: FilterOptions
  raw: RawCatalogParams
  errors: CatalogError[]
}

const DEBOUNCE_MS = 300

/** Builds the canonical catalog URL from a form, dropping empty values and the page. */
function urlFromForm(form: HTMLFormElement, locale: Locale): string {
  const data = new FormData(form)
  const params = new URLSearchParams()
  for (const [key, value] of data.entries()) {
    if (typeof value !== 'string') {
      continue
    }
    const trimmed = value.trim()
    if (!trimmed || key === 'page') {
      continue
    }
    if (key === 'availability' && trimmed === 'all') {
      continue
    }
    if (key === 'sort' && (trimmed === 'newest' || trimmed === 'relevance')) {
      // Defaults are omitted; relevance applies automatically when searching.
      const q = String(data.get('q') ?? '').trim()
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
}: Props & { idPrefix: string; onApplied?: () => void; showSearch: boolean }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pending, startTransition] = useTransition()
  const errorFor = (field: string) => errors.find((e) => e.field === field)
  const id = (name: string) => `${idPrefix}-${name}`

  const navigate = useCallback(
    (replace: boolean) => {
      const form = formRef.current
      if (!form) {
        return
      }
      const url = urlFromForm(form, locale)
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

  const scheduleNavigate = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
    }
    timer.current = setTimeout(() => navigate(true), DEBOUNCE_MS)
  }, [navigate])

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    },
    [],
  )

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (timer.current) {
      clearTimeout(timer.current)
    }
    navigate(false)
    onApplied?.()
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={`/${locale}/products`}
      onSubmit={onSubmit}
      className="flex flex-col gap-5"
      aria-describedby={errors.length ? id('errors') : undefined}
    >
      {errors.length > 0 ? (
        <div
          id={id('errors')}
          role="alert"
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
              defaultValue={raw.q}
              maxLength={MAX_QUERY_LENGTH}
              placeholder={dict.catalog.searchPlaceholder}
              className="input"
              onInput={scheduleNavigate}
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
          defaultValue={raw.category}
          className="input mt-1"
          onChange={scheduleNavigate}
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

      <fieldset>
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
              defaultValue={raw.min}
              className="input mt-1"
              onInput={scheduleNavigate}
              aria-invalid={Boolean(errorFor('min'))}
              aria-describedby={errorFor('min') ? id('min-error') : undefined}
            />
            {errorFor('min') ? (
              <p id={id('min-error')} className="mt-1 text-xs text-danger-700">
                {dict.errors[errorFor('min')!.code]}
              </p>
            ) : null}
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
              defaultValue={raw.max}
              className="input mt-1"
              onInput={scheduleNavigate}
              aria-invalid={Boolean(errorFor('max'))}
              aria-describedby={errorFor('max') ? id('max-error') : undefined}
            />
            {errorFor('max') ? (
              <p id={id('max-error')} className="mt-1 text-xs text-danger-700">
                {dict.errors[errorFor('max')!.code]}
              </p>
            ) : null}
          </div>
        </div>
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
                defaultChecked={(raw.availability || 'all') === value}
                onChange={scheduleNavigate}
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
          defaultValue={raw.sort || (raw.q ? 'relevance' : 'newest')}
          className="input mt-1"
          onChange={scheduleNavigate}
        >
          {raw.q ? <option value="relevance">{dict.catalog.sortRelevance}</option> : null}
          <option value="newest">{dict.catalog.sortNewest}</option>
          <option value="price-asc">{dict.catalog.sortPriceAsc}</option>
          <option value="price-desc">{dict.catalog.sortPriceDesc}</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary">
          {dict.catalog.applyFilters}
        </button>
        <a href={`/${locale}/products`} className="btn-secondary" onClick={() => onApplied?.()}>
          {dict.catalog.clearFilters}
        </a>
        <span className="text-sm text-ink-soft" aria-live="polite">
          {pending ? dict.common.updating : ''}
        </span>
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
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {open ? <FilterForm {...props} idPrefix="mobile" onApplied={close} showSearch /> : null}
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
        <FilterForm {...props} idPrefix="desktop" showSearch />
      </aside>
    </>
  )
}
