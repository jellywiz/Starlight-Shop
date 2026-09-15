/**
 * Locale contract shared by the public site, the catalog layer and Payload.
 *
 * Route codes: ckb (Sorani Kurdish, Arabic script), ar (Arabic), en (English).
 */
export const LOCALES = ['ckb', 'ar', 'en'] as const

export type Locale = (typeof LOCALES)[number]

/** Recommended default (spec section 1 "Implementation defaults"). */
export const DEFAULT_LOCALE: Locale = 'ckb'

export type TextDirection = 'ltr' | 'rtl'

export const LOCALE_META: Record<
  Locale,
  {
    /** Native label shown in the language switcher. */
    label: string
    /** Value for the html lang attribute. */
    htmlLang: string
    dir: TextDirection
    /** BCP 47 tag used for Intl formatting of dates/counts. */
    intl: string
  }
> = {
  ckb: { label: 'کوردی', htmlLang: 'ckb', dir: 'rtl', intl: 'ckb-IQ' },
  ar: { label: 'العربية', htmlLang: 'ar', dir: 'rtl', intl: 'ar-IQ' },
  en: { label: 'English', htmlLang: 'en', dir: 'ltr', intl: 'en-US' },
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function localeDir(locale: Locale): TextDirection {
  return LOCALE_META[locale].dir
}
