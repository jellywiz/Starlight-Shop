/**
 * Latin slugs shared across languages (spec section 2). Slugs are stable identifiers:
 * they are generated once when a record is created and never changed automatically.
 */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const LATIN_FOLD: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  ø: 'o',
  đ: 'd',
  ł: 'l',
}

/**
 * Converts free text to a slug. Non-Latin scripts (Arabic, Kurdish) produce an empty
 * string on purpose: the admin must then enter a Latin slug by hand rather than getting
 * an unreadable transliteration.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[ßæøđł]/g, (c) => LATIN_FOLD[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '')
}

export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length >= 1 && value.length <= 120 && SLUG_RE.test(value)
  )
}

/** Field-level validator usable in Payload `validate`. */
export function validateSlug(value: unknown): string | true {
  if (value === undefined || value === null || value === '') {
    return 'Enter a slug using lowercase Latin letters, digits and hyphens, e.g. hikvision-ds-2cd2043g2-i'
  }
  if (!isValidSlug(value)) {
    return 'Slugs may only contain lowercase Latin letters, digits and single hyphens (no spaces, no Arabic or Kurdish letters).'
  }
  return true
}
