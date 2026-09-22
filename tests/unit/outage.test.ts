import { beforeAll, describe, expect, it } from 'vitest'

import { isDroppablePath, signDropRequest, verifyDropRequest } from '@/lib/site/outage'

beforeAll(() => {
  process.env.PAYLOAD_SECRET = 'unit-test-secret-that-is-long-enough-for-production-rules'
})

describe('isDroppablePath', () => {
  it('accepts the cached public routes only', () => {
    expect(isDroppablePath('/en/about')).toBe(true)
    expect(isDroppablePath('/ckb/contact')).toBe(true)
    expect(isDroppablePath('/ar/products/pink-heart-necklace')).toBe(true)
    expect(isDroppablePath('/ar/products/item-a1b2c3')).toBe(true)
  })

  it('rejects everything else', () => {
    for (const path of [
      '/en',
      '/en/products',
      '/en/products/',
      '/en/products/x/preview',
      '/de/about',
      '/admin',
      '/api/products',
      '/en/products/Bad Slug',
      '/en/products/..%2F',
      'en/about',
      '/(site)/[locale]',
    ]) {
      expect(isDroppablePath(path), path).toBe(false)
    }
  })
})

describe('drop request signatures', () => {
  it('round-trips for the same path', () => {
    const signature = signDropRequest('/en/about')
    expect(signature).toMatch(/^[0-9a-f]{64}$/)
    expect(verifyDropRequest('/en/about', signature)).toBe(true)
  })

  it('does not transfer to another path and rejects tampered or malformed values', () => {
    const signature = signDropRequest('/en/about')
    expect(verifyDropRequest('/en/contact', signature)).toBe(false)
    expect(
      verifyDropRequest(
        '/en/about',
        signature.replace(/^./, (c) => (c === '0' ? '1' : '0')),
      ),
    ).toBe(false)
    expect(verifyDropRequest('/en/about', '')).toBe(false)
    expect(verifyDropRequest('/en/about', 'not-hex')).toBe(false)
    expect(verifyDropRequest('/en/about', signature.slice(0, 63))).toBe(false)
  })
})
