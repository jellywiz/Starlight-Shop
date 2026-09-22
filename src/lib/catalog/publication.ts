import { LOCALES, type Locale } from '@/i18n/config'
import { isValidIqd } from '@/lib/catalog/dinar'

/**
 * What a product needs before it can be published (spec section 5 "Publishing
 * validation"), in a form the browser can evaluate on the live form so the owner sees
 * what is missing before pressing Publish. The server (src/hooks/products.ts) applies the
 * same rules and, in addition, checks that the category is active and every photo still
 * exists — things only the database knows.
 */

export const LOCALE_LABELS: Record<Locale, string> = {
  ckb: 'Sorani Kurdish (ckb)',
  ar: 'Arabic (ar)',
  en: 'English (en)',
}

/** Field limits from the product data contract (spec section 5). */
export const LIMITS = {
  name: 160,
  description: 5000,
  photosMin: 1,
  photosMax: 8,
} as const

export type PublicationValues = {
  name?: Partial<Record<Locale, unknown>> | null
  description?: Partial<Record<Locale, unknown>> | null
  category?: unknown
  photos?: unknown
  priceIqd?: unknown
  isAvailable?: unknown
}

export type PublicationCheck = {
  key: 'name' | 'description' | 'category' | 'photos' | 'price' | 'availability'
  label: string
  /** What is still missing, in the owner's words; empty when the item is complete. */
  missing: string
  ok: boolean
}

const SHORT_LOCALE: Record<Locale, string> = { ckb: 'Kurdish', ar: 'Arabic', en: 'English' }

function filled(value: unknown, maxLength: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function missingLanguages(map: PublicationValues['name'], maxLength: number): Locale[] {
  return LOCALES.filter((locale) => !filled(map?.[locale], maxLength))
}

function isChosen(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false
  }
  if (typeof value === 'object') {
    const id =
      (value as { id?: unknown; value?: unknown }).id ?? (value as { value?: unknown }).value
    return id !== null && id !== undefined && id !== ''
  }
  return true
}

function countPhotos(value: unknown): number {
  return Array.isArray(value) ? value.filter(isChosen).length : 0
}

function languageList(locales: Locale[]): string {
  return locales.map((l) => SHORT_LOCALE[l]).join(', ')
}

/** The checklist for the given (live) values, in the order the form shows the fields. */
export function publicationChecklist(values: PublicationValues): PublicationCheck[] {
  const missingNames = missingLanguages(values.name, LIMITS.name)
  const missingDescriptions = missingLanguages(values.description, LIMITS.description)
  const photos = countPhotos(values.photos)
  const priceOk = isValidIqd(
    typeof values.priceIqd === 'string' && values.priceIqd.trim() !== ''
      ? Number(values.priceIqd)
      : values.priceIqd,
  )
  return [
    {
      key: 'name',
      label: 'Name in all three languages',
      missing: missingNames.length ? `missing in ${languageList(missingNames)}` : '',
      ok: missingNames.length === 0,
    },
    {
      key: 'description',
      label: 'Description in all three languages',
      missing: missingDescriptions.length ? `missing in ${languageList(missingDescriptions)}` : '',
      ok: missingDescriptions.length === 0,
    },
    {
      key: 'category',
      label: 'A category',
      missing: isChosen(values.category) ? '' : 'choose one',
      ok: isChosen(values.category),
    },
    {
      key: 'photos',
      label: `${LIMITS.photosMin}–${LIMITS.photosMax} photos`,
      missing:
        photos < LIMITS.photosMin
          ? 'add at least one photo'
          : photos > LIMITS.photosMax
            ? `remove ${photos - LIMITS.photosMax}`
            : '',
      ok: photos >= LIMITS.photosMin && photos <= LIMITS.photosMax,
    },
    {
      key: 'price',
      label: 'A price in whole dinars',
      missing: priceOk ? '' : 'enter a whole number from 1 to 999,999,999',
      ok: priceOk,
    },
    {
      key: 'availability',
      label: 'Available or unavailable',
      missing: typeof values.isAvailable === 'boolean' ? '' : 'tick or untick Available',
      ok: typeof values.isAvailable === 'boolean',
    },
  ]
}
