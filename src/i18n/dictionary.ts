import type { Locale } from './config'
import { LOCALE_META } from './config'
import { ar } from './dictionaries/ar'
import { ckb } from './dictionaries/ckb'
import { en } from './dictionaries/en'
import { type PluralForms, selectPlural } from './plural'

type DeepString<T> = T extends string
  ? string
  : T extends PluralForms
    ? PluralForms
    : { [K in keyof T]: DeepString<T[K]> }

/** Every language must provide exactly the keys of the English dictionary. */
export type Dictionary = DeepString<typeof en>

const dictionaries: Record<Locale, Dictionary> = { en, ckb, ar }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

type Params = Record<string, string | number>

/** Replaces `{name}` placeholders. Numbers are formatted for the locale. */
export function t(template: string, params: Params = {}, locale?: Locale): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined) {
      return `{${key}}`
    }
    if (typeof value === 'number') {
      return formatNumber(value, locale)
    }
    return value
  })
}

/** Formats a count with the right plural form, e.g. "3 products". */
export function tp(forms: PluralForms, count: number, locale: Locale, params: Params = {}): string {
  const form = selectPlural(forms, count, LOCALE_META[locale].intl)
  return t(form, { count, ...params }, locale)
}

/**
 * Numbers in interface text use the locale's digits (Arabic-Indic for Sorani and
 * Arabic). Dinar amounts never go through here: they are always rendered with ASCII
 * digits and comma grouping (see lib/catalog/dinar.ts) inside a translated label.
 */
export function formatNumber(value: number, locale?: Locale): string {
  if (!locale) {
    return String(value)
  }
  try {
    return new Intl.NumberFormat(LOCALE_META[locale].intl, { useGrouping: true }).format(value)
  } catch {
    return String(value)
  }
}
