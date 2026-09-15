import { describe, expect, it } from 'vitest'

import {
  SEGMENT_SEPARATOR,
  buildNormalizedName,
  buildSearchText,
  escapeLike,
  normalizeForSearch,
  normalizeText,
  splitSegments,
  tokenize,
} from '@/lib/catalog/normalize'

/**
 * Native-speaker test table (spec section 3). Each row documents a substitution that
 * IS made and, just as importantly, the distinctions that are preserved. Review with a
 * Sorani/Arabic speaker before extending the substitution tables.
 */
describe('normalizeForSearch', () => {
  it('collapses whitespace, folds case and applies NFKC', () => {
    expect(normalizeText('  Hikvision   DS-2CD2043G2-I ')).toBe('hikvision ds-2cd2043g2-i')
    expect(normalizeForSearch('ＤＳ－２ＣＤ')).toBe('ds-2cd')
    expect(normalizeForSearch('Résumé')).toBe('resume')
  })

  it('unifies Arabic kaf with Kurdish/Persian keheh and yeh variants', () => {
    // كامیرا typed with Arabic kaf vs Kurdish keheh
    expect(normalizeForSearch('كامێرا')).toBe(normalizeForSearch('کامێرا'))
    // Arabic yeh vs Farsi yeh
    expect(normalizeForSearch('علي')).toBe(normalizeForSearch('علی'))
    // alef maksura folds the same way
    expect(normalizeForSearch('على')).toBe(normalizeForSearch('علی'))
  })

  it('folds alef hamza forms, teh marbuta and heh doachashmee', () => {
    expect(normalizeForSearch('أربيل')).toBe(normalizeForSearch('اربيل'))
    expect(normalizeForSearch('إنترنت')).toBe(normalizeForSearch('انترنت'))
    expect(normalizeForSearch('كاميرة')).toBe(normalizeForSearch('كاميره'))
    expect(normalizeForSearch('ھەولێر')).toBe(normalizeForSearch('هەولێر'))
  })

  it('removes Arabic diacritics, tatweel and zero-width characters', () => {
    expect(normalizeForSearch('كَامِيرَا')).toBe(normalizeForSearch('كاميرا'))
    expect(normalizeForSearch('كاميــــرا')).toBe(normalizeForSearch('كاميرا'))
    expect(normalizeForSearch('کامێ‌را')).toBe(normalizeForSearch('کامێرا'))
  })

  it('normalizes Arabic-Indic and extended Arabic-Indic digits', () => {
    expect(normalizeForSearch('٢٠٤٣')).toBe('2043')
    expect(normalizeForSearch('۲۰۴۳')).toBe('2043')
    expect(normalizeForSearch('DS-٢CD٢٠٤٣')).toBe('ds-2cd2043')
  })

  it('preserves distinct Sorani letters', () => {
    // reh vs rreh
    expect(normalizeForSearch('ڕەش')).not.toBe(normalizeForSearch('رەش'))
    // lam vs llam
    expect(normalizeForSearch('گوڵ')).not.toBe(normalizeForSearch('گول'))
    // heh vs ae (e vowel)
    expect(normalizeForSearch('هەولێر')).not.toBe(normalizeForSearch('ەەولێر'))
    // waw vs oe, yeh vs ee
    expect(normalizeForSearch('کۆ')).not.toBe(normalizeForSearch('کو'))
    expect(normalizeForSearch('دێ')).not.toBe(normalizeForSearch('دی'))
    // yeh with hamza (Kurdish glottal) stays distinct from plain yeh
    expect(normalizeForSearch('ئێوارە')).not.toBe(normalizeForSearch('یێوارە'))
  })

  it('builds searchable text from every name and description translation', () => {
    const text = buildSearchText({
      names: ['Star necklace', 'ملوانکەی ئەستێرە', 'قلادة نجمة'],
      descriptions: ['Handmade necklace with a star pendant'],
    })
    expect(text).toContain('star necklace')
    expect(text).toContain(normalizeForSearch('قلادة نجمة'))
    expect(text).toContain('handmade necklace with a star pendant')
    expect(text.split(SEGMENT_SEPARATOR)).toHaveLength(4)
  })

  it('builds the normalized-name field as separate segments per translation', () => {
    const value = buildNormalizedName(['Star Necklace', 'ملوانکەی ئەستێرە', 'Star Necklace'])
    expect(splitSegments(value)).toEqual(['star necklace', normalizeForSearch('ملوانکەی ئەستێرە')])
    expect(splitSegments('')).toEqual([])
  })

  it('tokenizes and escapes LIKE metacharacters', () => {
    expect(tokenize('  star  necklace 4 ')).toEqual(['star', 'necklace', '4'])
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b')
  })
})
