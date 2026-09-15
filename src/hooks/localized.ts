import type { CollectionSlug, PayloadRequest } from 'payload'

import { LOCALES, type Locale } from '@/i18n/config'

/** A localized value as returned by Payload when reading with `locale: 'all'`. */
export type LocaleMap<T = string> = Partial<Record<Locale, T | null | undefined>>

export type LocalizedRow = {
  id?: string
  [key: string]: unknown
}

/**
 * Reads the current stored state of a document with every locale expanded. Uses
 * `draft: true` so an in-progress draft is the basis for validation, not the last
 * published revision.
 *
 * The hook's `req` is deliberately NOT forwarded: Payload's Local API rewrites
 * `req.locale` to the requested locale ('all'), which would break the locale merge of
 * the surrounding update. The read therefore happens outside the request transaction,
 * which is fine because it only needs the committed state.
 */
export async function readAllLocales(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: number | string,
): Promise<Record<string, unknown> | null> {
  try {
    const doc = await req.payload.findByID({
      collection,
      id,
      locale: 'all',
      depth: 0,
      draft: true,
      overrideAccess: true,
      showHiddenFields: true,
      disableErrors: true,
    })
    return (doc as unknown as Record<string, unknown>) ?? null
  } catch {
    return null
  }
}

export function isLocaleMap(value: unknown): value is LocaleMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  return Object.keys(value).every((k) => (LOCALES as readonly string[]).includes(k))
}

/**
 * Merges the incoming request-locale value of a localized field into the stored
 * all-locales map. `incoming === undefined` means the field was not sent; `null`/'' are
 * explicit clears of the request locale.
 */
export function mergeLocalizedField(
  existing: unknown,
  incoming: unknown,
  locale: Locale,
): LocaleMap {
  const base: LocaleMap = isLocaleMap(existing) ? { ...existing } : {}
  if (incoming !== undefined) {
    base[locale] = incoming as string | null
  }
  return base
}

/**
 * Merges array rows that contain localized sub-fields (specifications). Rows are matched
 * by id; rows missing from the incoming data are removed; new rows start with only the
 * request locale filled in.
 */
export function mergeLocalizedRows(
  existingRows: unknown,
  incomingRows: unknown,
  locale: Locale,
  localizedKeys: string[],
): LocalizedRow[] | undefined {
  if (incomingRows === undefined) {
    return Array.isArray(existingRows) ? (existingRows as LocalizedRow[]) : undefined
  }
  if (!Array.isArray(incomingRows)) {
    return []
  }
  const existingById = new Map<string, LocalizedRow>()
  if (Array.isArray(existingRows)) {
    for (const row of existingRows as LocalizedRow[]) {
      if (row && typeof row.id === 'string') {
        existingById.set(row.id, row)
      }
    }
  }
  return (incomingRows as LocalizedRow[]).map((row) => {
    const existing = row && typeof row.id === 'string' ? existingById.get(row.id) : undefined
    const merged: LocalizedRow = { ...(existing ?? {}), ...row }
    for (const key of localizedKeys) {
      merged[key] = mergeLocalizedField(existing?.[key], row?.[key], locale)
    }
    return merged
  })
}

export function localeValues(map: LocaleMap | undefined): string[] {
  if (!map) {
    return []
  }
  return LOCALES.map((l) => map[l]).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  )
}

export function missingLocales(
  map: LocaleMap | undefined,
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
