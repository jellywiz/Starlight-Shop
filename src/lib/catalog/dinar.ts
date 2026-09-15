/**
 * Iraqi dinar handling (spec section 5 "Price handling"). Amounts are whole dinars stored
 * as plain integers: 25000 is stored as 25000, never multiplied by 100 or 1000. There is
 * no fractional unit in use, so fractional input is rejected outright.
 */

/** Maximum product price and delivery fee: 999,999,999 IQD. */
export const MAX_IQD = 999_999_999

const WHOLE_RE = /^\d{1,15}$/
const CURRENCY_PREFIX_RE = /^(?:iqd|د\.ع\.?|دینار|دينار)\s*/i
const CURRENCY_SUFFIX_RE = /\s*(?:iqd|د\.ع\.?|دینار|دينار)$/i

export type ParsedIqd =
  | { ok: true; amount: number }
  | { ok: false; reason: 'invalid' | 'negative' | 'fraction' | 'too_large' | 'zero' }

/**
 * Parses a user-entered whole dinar amount such as "25000", "25,000" or "٢٥٠٠٠" (Arabic
 * or Kurdish keyboard digits). Rejects negative values, fractions, non-numeric input and
 * amounts above the maximum. Zero is rejected for product prices but accepted for filter
 * bounds and delivery fees via `allowZero`.
 */
export function parseIqd(input: string, options: { allowZero?: boolean } = {}): ParsedIqd {
  const raw = input
    .trim()
    // Fold Arabic-Indic and extended Arabic-Indic digits before strict parsing.
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    // A pasted currency label at either end ("IQD 25,000", "25,000 دینار") is tolerated.
    .replace(CURRENCY_PREFIX_RE, '')
    .replace(CURRENCY_SUFFIX_RE, '')
    // Thousands separators: comma, Arabic thousands separator (U+066C), spaces.
    .replace(/[,٬\s ]/g, '')
    .trim()

  if (raw.startsWith('-') || raw.startsWith('−')) {
    return { ok: false, reason: 'negative' }
  }
  if (/^\d+[.٫]\d*$/.test(raw)) {
    return { ok: false, reason: 'fraction' }
  }
  if (!WHOLE_RE.test(raw)) {
    return { ok: false, reason: 'invalid' }
  }
  const amount = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(amount)) {
    return { ok: false, reason: 'invalid' }
  }
  if (amount > MAX_IQD) {
    return { ok: false, reason: 'too_large' }
  }
  if (amount === 0 && !options.allowZero) {
    return { ok: false, reason: 'zero' }
  }
  return { ok: true, amount }
}

/** Validates a stored whole dinar amount: a finite safe integer within the range. */
export function isValidIqd(value: unknown, options: { allowZero?: boolean } = {}): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isSafeInteger(value) &&
    value >= (options.allowZero ? 0 : 1) &&
    value <= MAX_IQD
  )
}

const groupingFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  useGrouping: true,
})

/**
 * Formats a whole dinar amount with ASCII digits and comma grouping: 25000 -> "25,000".
 * Fraction digits are explicitly zero; the formatter's default precision is never used.
 * The same digits are shown in every language (decision agreed with the owner); the
 * currency label around the number is translated by the caller.
 */
export function formatIqdAmount(amount: number): string {
  return groupingFormatter.format(Math.trunc(amount))
}

/**
 * Applies a translated currency template such as "IQD {amount}" or "{amount} دینار".
 * The number itself is always the ASCII grouped form so it reads identically in every
 * language; callers wrap the result in a left-to-right isolate when needed.
 */
export function formatIqd(amount: number, template = 'IQD {amount}'): string {
  return template.replace('{amount}', formatIqdAmount(amount))
}
