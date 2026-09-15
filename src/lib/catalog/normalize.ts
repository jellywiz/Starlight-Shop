/**
 * Search normalization (spec section 3).
 *
 * Two levels are defined:
 *  - `normalizeText`: Unicode compatibility normalization, whitespace collapse and case
 *    folding. Applied to everything that is indexed or compared.
 *  - `normalizeForSearch`: additionally removes Arabic diacritics and tatweel, folds
 *    Arabic-Indic / Persian digits to ASCII, and unifies common keyboard variants such as
 *    Arabic kaf (ك) and Kurdish/Persian keheh (ک). Applied to BOTH the stored searchable
 *    text and the incoming query, never to displayed text.
 *
 * Deliberately NOT folded: distinct Sorani letters such as reh (ر) and rreh (ڕ), lam (ل)
 * and llam (ڵ), heh (ه) and ae (ە), waw (و) and oe (ۆ), yeh (ی) and ee (ێ). Folding them
 * would merge different words. Any new substitution must first be covered by the
 * native-speaker test cases in tests/unit/normalize.test.ts.
 */

/** Combining marks used as Arabic diacritics (harakat, shadda, sukun, Quranic marks). */
const ARABIC_DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g

/** Tatweel (kashida, U+0640) is purely typographic. */
const TATWEEL = /\u0640/g

/** Zero-width joiner/non-joiner and BOM sometimes typed by Kurdish/Persian keyboards. */
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g

/** Latin combining diacritics after NFD decomposition (é -> e). */
const LATIN_COMBINING = /[\u0300-\u036F]/g

const DIGIT_MAP: Record<string, string> = {
  // Arabic-Indic digits U+0660..U+0669
  '\u0660': '0',
  '\u0661': '1',
  '\u0662': '2',
  '\u0663': '3',
  '\u0664': '4',
  '\u0665': '5',
  '\u0666': '6',
  '\u0667': '7',
  '\u0668': '8',
  '\u0669': '9',
  // Extended Arabic-Indic digits U+06F0..U+06F9 (Persian/Kurdish keyboards)
  '\u06F0': '0',
  '\u06F1': '1',
  '\u06F2': '2',
  '\u06F3': '3',
  '\u06F4': '4',
  '\u06F5': '5',
  '\u06F6': '6',
  '\u06F7': '7',
  '\u06F8': '8',
  '\u06F9': '9',
}

/**
 * Keyboard-variant unification for search only. Each entry is a documented decision:
 *  - ك (U+0643 Arabic kaf) -> ک (U+06A9 keheh): Arabic keyboards type kaf, Kurdish
 *    keyboards type keheh; the same letter for search purposes.
 *  - ي (U+064A Arabic yeh) and ى (U+0649 alef maksura) -> ی (U+06CC Farsi yeh): same
 *    reasoning; Arabic text typed on Kurdish keyboards and vice versa.
 *  - أ إ آ ٱ -> ا (U+0627): hamza/wasla forms of alef are frequently omitted when typing.
 *  - ة (U+0629 teh marbuta) -> ه (U+0647 heh): commonly typed as heh in Arabic; Kurdish
 *    never uses teh marbuta, so Kurdish words are unaffected.
 *  - ھ (U+06BE heh doachashmee) -> ه (U+0647 heh): older Sorani keyboards use ھ for h.
 * Presentation forms (U+FB50..U+FDFF, U+FE70..U+FEFF) are already folded by NFKC.
 */
const VARIANT_MAP: Record<string, string> = {
  '\u0643': '\u06A9', // ك -> ک
  '\u064A': '\u06CC', // ي -> ی
  '\u0649': '\u06CC', // ى -> ی
  '\u0623': '\u0627', // أ -> ا
  '\u0625': '\u0627', // إ -> ا
  '\u0622': '\u0627', // آ -> ا
  '\u0671': '\u0627', // ٱ -> ا
  '\u0629': '\u0647', // ة -> ه
  '\u06BE': '\u0647', // ھ -> ه
}

const VARIANT_RE = new RegExp(`[${Object.keys(VARIANT_MAP).join('')}]`, 'g')
const DIGIT_RE = new RegExp(`[${Object.keys(DIGIT_MAP).join('')}]`, 'g')

/** Unicode normalization, whitespace collapse and case folding. */
export function normalizeText(input: string): string {
  return input.normalize('NFKC').replace(ZERO_WIDTH, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Full search normalization for indexed content and queries. Never used for display. */
export function normalizeForSearch(input: string): string {
  const base = normalizeText(input)
  return base
    .normalize('NFD')
    .replace(LATIN_COMBINING, '')
    .normalize('NFC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(DIGIT_RE, (d) => DIGIT_MAP[d] ?? d)
    .replace(VARIANT_RE, (c) => VARIANT_MAP[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Splits a normalized query into non-empty tokens. */
export function tokenize(normalizedQuery: string): string[] {
  return normalizedQuery.split(' ').filter((t) => t.length > 0)
}

/** Separator between stored segments; it never appears inside a normalized token. */
export const SEGMENT_SEPARATOR = ' | '

/**
 * Builds the hidden searchable text stored on a product: every translation of the name
 * followed by every translation of the description (spec section 5). Queries are matched
 * token by token against this text; every token must appear somewhere in it.
 */
export function buildSearchText(parts: { names: string[]; descriptions: string[] }): string {
  const segments = [...parts.names, ...parts.descriptions]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => normalizeForSearch(s))
  // De-duplicate while keeping order.
  return Array.from(new Set(segments)).join(SEGMENT_SEPARATOR)
}

/**
 * Builds the hidden normalized-name field: every translation of the name, normalized,
 * as separate segments so ranking can test "exact name" and "name prefix" per language.
 */
export function buildNormalizedName(names: string[]): string {
  const segments = names
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => normalizeForSearch(s))
  return Array.from(new Set(segments)).join(SEGMENT_SEPARATOR)
}

/** Splits a stored segmented field back into its normalized segments. */
export function splitSegments(value: string | null | undefined): string[] {
  if (!value) {
    return []
  }
  return value.split(SEGMENT_SEPARATOR).filter((s) => s.length > 0)
}

/** Escapes characters that have meaning in SQL LIKE patterns (backslash escape). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}
