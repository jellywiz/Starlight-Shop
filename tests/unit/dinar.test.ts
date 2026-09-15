import { describe, expect, it } from 'vitest'

import { MAX_IQD, formatIqd, formatIqdAmount, isValidIqd, parseIqd } from '@/lib/catalog/dinar'

describe('parseIqd (whole Iraqi dinars)', () => {
  it('parses whole amounts with optional grouping and currency labels', () => {
    expect(parseIqd('25000')).toEqual({ ok: true, amount: 25000 })
    expect(parseIqd(' 25,000 ')).toEqual({ ok: true, amount: 25000 })
    expect(parseIqd('IQD 25,000')).toEqual({ ok: true, amount: 25000 })
    expect(parseIqd('25,000 دینار')).toEqual({ ok: true, amount: 25000 })
    expect(parseIqd('25,000 د.ع')).toEqual({ ok: true, amount: 25000 })
    expect(parseIqd('999999999')).toEqual({ ok: true, amount: MAX_IQD })
  })

  it('accepts Arabic-Indic and extended Arabic-Indic digits', () => {
    expect(parseIqd('٢٥٠٠٠')).toEqual({ ok: true, amount: 25000 })
    expect(parseIqd('۲۵٬۰۰۰')).toEqual({ ok: true, amount: 25000 })
  })

  it('rejects fractions, negatives, invalid strings and overflow', () => {
    expect(parseIqd('25000.5')).toMatchObject({ ok: false, reason: 'fraction' })
    expect(parseIqd('25000٫5')).toMatchObject({ ok: false, reason: 'fraction' })
    expect(parseIqd('-5')).toMatchObject({ ok: false, reason: 'negative' })
    expect(parseIqd('abc')).toMatchObject({ ok: false, reason: 'invalid' })
    expect(parseIqd('1e5')).toMatchObject({ ok: false, reason: 'invalid' })
    expect(parseIqd('Infinity')).toMatchObject({ ok: false, reason: 'invalid' })
    expect(parseIqd('')).toMatchObject({ ok: false, reason: 'invalid' })
    expect(parseIqd('1000000000')).toMatchObject({ ok: false, reason: 'too_large' })
  })

  it('treats zero as an error for prices but accepts it for fees and filters', () => {
    expect(parseIqd('0')).toMatchObject({ ok: false, reason: 'zero' })
    expect(parseIqd('0', { allowZero: true })).toEqual({ ok: true, amount: 0 })
    expect(parseIqd('٠', { allowZero: true })).toEqual({ ok: true, amount: 0 })
  })
})

describe('isValidIqd', () => {
  it('validates stored integers strictly', () => {
    expect(isValidIqd(25000)).toBe(true)
    expect(isValidIqd(MAX_IQD)).toBe(true)
    expect(isValidIqd(0)).toBe(false)
    expect(isValidIqd(0, { allowZero: true })).toBe(true)
    expect(isValidIqd(-1, { allowZero: true })).toBe(false)
    expect(isValidIqd(25000.5)).toBe(false)
    expect(isValidIqd(Number.NaN)).toBe(false)
    expect(isValidIqd(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidIqd(MAX_IQD + 1)).toBe(false)
    expect(isValidIqd('25000')).toBe(false)
  })
})

describe('formatting', () => {
  it('groups with ASCII digits and never shows fraction digits', () => {
    expect(formatIqdAmount(25000)).toBe('25,000')
    expect(formatIqdAmount(0)).toBe('0')
    expect(formatIqdAmount(999999999)).toBe('999,999,999')
  })

  it('applies translated currency templates around the same digits', () => {
    expect(formatIqd(25000)).toBe('IQD 25,000')
    expect(formatIqd(25000, 'IQD {amount}')).toBe('IQD 25,000')
    expect(formatIqd(25000, '{amount} دینار')).toBe('25,000 دینار')
    expect(formatIqd(25000, '{amount} د.ع')).toBe('25,000 د.ع')
  })
})
