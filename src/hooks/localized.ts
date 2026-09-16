import { LOCALES, type Locale } from '@/i18n/config'

/**
 * A translated value: one entry per language, as stored in a translated group field
 * (see src/fields/translated.ts). Missing or empty entries mean "not written yet".
 */
export type Translations = Partial<Record<Locale, string | null | undefined>>

export function isTranslations(value: unknown): value is Translations {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The complete translations a save will leave behind: the stored group with the incoming
 * (possibly partial) group merged on top. `undefined` entries in the incoming data mean
 * "not sent" and keep the stored value; `null`/'' are explicit clears.
 */
export function mergeTranslations(existing: unknown, incoming: unknown): Translations {
  const merged: Translations = isTranslations(existing) ? { ...existing } : {}
  if (isTranslations(incoming)) {
    for (const locale of LOCALES) {
      if (incoming[locale] !== undefined) {
        merged[locale] = incoming[locale]
      }
    }
  }
  return merged
}

/**
 * Trims every language in place and returns the group. Single-line values also have
 * inner whitespace collapsed; multi-line text keeps its line breaks.
 */
export function trimTranslations(
  value: unknown,
  options: { multiline?: boolean } = {},
): Translations | undefined {
  if (!isTranslations(value)) {
    return undefined
  }
  for (const locale of LOCALES) {
    const v = value[locale]
    if (typeof v === 'string') {
      value[locale] = options.multiline ? v.trim() : v.trim().replace(/\s+/g, ' ')
    }
  }
  return value
}

/** Non-empty values in language order (ckb, ar, en). */
export function translationValues(map: Translations | undefined): string[] {
  if (!map) {
    return []
  }
  return LOCALES.map((l) => map[l]).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  )
}

/** Languages whose value is missing, blank or longer than `maxLength`. */
export function missingLocales(
  map: Translations | undefined,
  options: { maxLength?: number } = {},
): Locale[] {
  return LOCALES.filter((l) => {
    const v = map?.[l]
    if (typeof v !== 'string' || v.trim().length === 0) {
      return true
    }
    return options.maxLength !== undefined && v.length > options.maxLength
  })
}

/**
 * The value for a page language. Published content is complete in every language; the
 * fallback to another language only matters for owner previews of unfinished drafts.
 */
export function pickTranslation(value: unknown, locale: Locale): string | null {
  if (!isTranslations(value)) {
    return null
  }
  const own = value[locale]
  if (typeof own === 'string' && own.trim()) {
    return own.trim()
  }
  return translationValues(value)[0] ?? null
}

/**
 * Title shown in admin lists, relationship pickers and breadcrumbs: the English name and
 * the Kurdish name together, so both readings of a record are recognisable at a glance.
 */
export function adminTitleFrom(value: unknown, fallback: string): string {
  if (!isTranslations(value)) {
    return fallback
  }
  const parts = [value.en, value.ckb]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
  if (parts.length > 0) {
    return parts.join(' · ')
  }
  const ar = typeof value.ar === 'string' ? value.ar.trim() : ''
  return ar || fallback
}
