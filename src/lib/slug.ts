/**
 * Latin slugs shared across languages (spec section 2). They are generated from the English
 * name and frozen once a record goes public (see src/hooks/slugs.ts); the owner never
 * edits them.
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
 * string on purpose: a readable fallback is generated instead of an unreadable
 * transliteration.
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

/**
 * Field-level validator usable in Payload `validate`. An empty value is accepted here:
 * whether an address is required at all is decided by the collection hooks (publishing,
 * activation) or by the field's own `required` flag.
 */
export function validateSlug(value: unknown): string | true {
  if (value === undefined || value === null || value === '') {
    return true
  }
  if (!isValidSlug(value)) {
    return 'Slugs may only contain lowercase Latin letters, digits and single hyphens (no spaces, no Arabic or Kurdish letters).'
  }
  return true
}
