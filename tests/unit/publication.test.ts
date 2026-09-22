import { describe, expect, it } from 'vitest'

import { publicationChecklist } from '@/lib/catalog/publication'

const complete = {
  name: { ckb: 'ملوانکە', ar: 'قلادة', en: 'Necklace' },
  description: { ckb: 'وەسف', ar: 'وصف', en: 'A description' },
  category: 3,
  photos: [12],
  priceIqd: 25000,
  isAvailable: true,
}

describe('publicationChecklist', () => {
  it('is all clear for a complete product', () => {
    const checks = publicationChecklist(complete)
    expect(checks.every((c) => c.ok)).toBe(true)
    expect(checks.map((c) => c.missing)).toEqual(['', '', '', '', '', ''])
  })

  it('names the languages that are missing or too long', () => {
    const checks = publicationChecklist({
      ...complete,
      name: { ckb: 'ملوانکە', ar: '   ', en: 'x'.repeat(161) },
      description: { ckb: 'وەسف' },
    })
    expect(checks[0]).toMatchObject({ ok: false, missing: 'missing in Arabic, English' })
    expect(checks[1]).toMatchObject({ ok: false, missing: 'missing in Arabic, English' })
  })

  it('accepts a category given as an id, an object or a select option', () => {
    for (const category of [3, '3', { id: 3 }, { value: 3 }]) {
      expect(publicationChecklist({ ...complete, category })[2].ok).toBe(true)
    }
    for (const category of [null, undefined, '', { id: null }]) {
      expect(publicationChecklist({ ...complete, category })[2]).toMatchObject({
        ok: false,
        missing: 'choose one',
      })
    }
  })

  it('counts photos within the allowed range', () => {
    expect(publicationChecklist({ ...complete, photos: [] })[3].missing).toBe(
      'add at least one photo',
    )
    expect(publicationChecklist({ ...complete, photos: Array(9).fill(1) })[3].missing).toBe(
      'remove 1',
    )
    expect(publicationChecklist({ ...complete, photos: [{ id: 1 }, 2] })[3].ok).toBe(true)
  })

  it('validates the price as the admin field types it', () => {
    expect(publicationChecklist({ ...complete, priceIqd: '25000' })[4].ok).toBe(true)
    for (const priceIqd of ['', '0', '12.5', -5, 1e12, null]) {
      expect(publicationChecklist({ ...complete, priceIqd })[4].ok).toBe(false)
    }
  })

  it('needs an explicit availability', () => {
    expect(publicationChecklist({ ...complete, isAvailable: false })[5].ok).toBe(true)
    expect(publicationChecklist({ ...complete, isAvailable: undefined })[5].ok).toBe(false)
  })
})
