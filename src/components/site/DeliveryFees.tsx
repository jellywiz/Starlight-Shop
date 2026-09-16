'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import type { Locale } from '@/i18n/config'
import { type Dictionary, t } from '@/i18n/dictionary'
import { formatIqd } from '@/lib/catalog/dinar'
import type { DeliveryCity } from '@/lib/catalog/types'

import { InstagramLink } from './InstagramLink'

type Props = {
  locale: Locale
  dict: Dictionary
  /** Active cities; an empty list means none are listed yet. */
  cities: DeliveryCity[]
  /** True when the city list could not be loaded (never shown as "free"). */
  loadFailed: boolean
  /** City id from the URL when it names an active city. */
  initialCityId: number | null
  /** True when the URL named a city that is no longer active. */
  initialNotListed: boolean
  instagramUrl: string
}

/**
 * Homepage delivery-fee selector (spec section 8). A labelled select shows one city's
 * saved fee beneath it; the choice is kept in the URL (?city=<id>) so it survives a
 * language switch and works without JavaScript through a plain GET form. No fee is ever
 * added to a product price; no zero is shown unless the owner saved a confirmed 0.
 */
export function DeliveryFees({
  locale,
  dict,
  cities,
  loadFailed,
  initialCityId,
  initialNotListed,
  instagramUrl,
}: Props) {
  const router = useRouter()
  const selectId = useId()
  const resultId = useId()
  const [selectedId, setSelectedId] = useState<number | null>(initialCityId)
  const [notListed, setNotListed] = useState(initialNotListed)

  const selected = cities.find((c) => c.id === selectedId) ?? null

  const onChange = (value: string) => {
    const id = /^\d+$/.test(value) ? Number.parseInt(value, 10) : null
    const city = cities.find((c) => c.id === id) ?? null
    setSelectedId(city ? city.id : null)
    setNotListed(false)
    try {
      // A null state lets Next.js sync useSearchParams (its own internal state objects are
      // skipped), so the language switcher immediately carries the selected city.
      const url = city ? `/${locale}?city=${city.id}#delivery` : `/${locale}#delivery`
      window.history.replaceState(null, '', url)
    } catch {
      // URL state is a convenience; the selection still works in page state.
    }
  }

  const fee = (city: DeliveryCity) =>
    city.feeIqd === 0 ? dict.delivery.free : formatIqd(city.feeIqd, dict.common.currencyFormat)
  // The fee sits in its own left-to-right isolate, so the template is split around it.
  const [feeBefore = '', feeAfter = ''] = dict.delivery.feeFor.split('{fee}')

  if (loadFailed) {
    return (
      <div role="alert" className="mt-5 flex flex-col gap-3">
        <p className="font-medium text-heading">{dict.delivery.loadFailed}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.refresh()}>
            {dict.delivery.retry}
          </button>
          <InstagramLink href={instagramUrl} label={dict.home.instagramAction} dict={dict} />
        </div>
      </div>
    )
  }

  if (cities.length === 0) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <p className="font-medium text-heading">{dict.delivery.none}</p>
        <div>
          <InstagramLink href={instagramUrl} label={dict.home.instagramAction} dict={dict} />
        </div>
      </div>
    )
  }

  return (
    <form
      method="get"
      action={`/${locale}#delivery`}
      className="mt-5 flex flex-col gap-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <label htmlFor={selectId} className="text-sm font-semibold text-heading">
        {dict.delivery.cityLabel}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <select
          id={selectId}
          name="city"
          className="input max-w-xs"
          value={selected ? String(selected.id) : ''}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={resultId}
        >
          <option value="">{dict.delivery.selectPrompt}</option>
          {cities.map((city) => (
            <option key={city.id} value={String(city.id)}>
              {city.name}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit" className="btn-primary">
            {dict.delivery.showFee}
          </button>
        </noscript>
      </div>
      <p
        id={resultId}
        aria-live="polite"
        aria-atomic="true"
        className="min-h-6 text-base text-ink-soft"
      >
        {selected ? (
          <span className="font-semibold text-heading">
            {t(feeBefore, { city: selected.name })}
            <bdi dir="ltr" className="ltr-isolate">
              {fee(selected)}
            </bdi>
            {t(feeAfter, { city: selected.name })}
          </span>
        ) : notListed ? (
          <span>{dict.delivery.notListed}</span>
        ) : (
          <span>{dict.delivery.selectHint}</span>
        )}
      </p>
      <p className="text-sm text-ink-muted">
        {dict.delivery.unlisted}{' '}
        <a
          href={instagramUrl}
          className="link-plum"
          target="_blank"
          rel="noopener noreferrer external"
        >
          {dict.contact.instagram}
        </a>
      </p>
    </form>
  )
}
