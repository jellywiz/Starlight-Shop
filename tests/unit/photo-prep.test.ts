import { describe, expect, it } from 'vitest'

import { formatBytes, needsPreparation, renamed, scaleFor } from '@/lib/photo-prep'

describe('photo preparation rules', () => {
  it('leaves photos that are already within the limits alone', () => {
    expect(needsPreparation(1600, 1200, 900_000)).toBe(false)
  })

  it('reduces photos that are too heavy, too wide or too many pixels', () => {
    expect(needsPreparation(1600, 1200, 3.5 * 1024 * 1024)).toBe(true)
    expect(needsPreparation(4032, 3024, 900_000)).toBe(true)
    expect(needsPreparation(6000, 4000, 900_000, { maxSide: 8000 })).toBe(true) // 24 MP
  })

  it('scales to the longest side, never enlarging', () => {
    expect(scaleFor(4032, 3024)).toBeCloseTo(2000 / 4032, 5)
    expect(scaleFor(1200, 1200)).toBe(1)
    // The pixel limit wins when the side limit alone would not be enough.
    expect(scaleFor(6000, 4000, { maxSide: 8000, maxPixels: 6_000_000 })).toBeCloseTo(0.5, 5)
  })

  it('renames by the encoded type', () => {
    expect(renamed('IMG_0042.HEIC.jpeg', 'image/jpeg')).toBe('IMG_0042.HEIC.jpg')
    expect(renamed('logo.png', 'image/webp')).toBe('logo.webp')
    expect(renamed('', 'image/jpeg')).toBe('photo.jpg')
  })

  it('formats sizes the way the panel shows them', () => {
    expect(formatBytes(532_260)).toBe('520 KB')
    expect(formatBytes(7_824_507)).toBe('7.5 MB')
    expect(formatBytes(10)).toBe('1 KB')
  })
})
