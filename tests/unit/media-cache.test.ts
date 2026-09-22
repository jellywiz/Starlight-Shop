import { describe, expect, it } from 'vitest'

import { IMMUTABLE_CACHE, storedObjects } from '@/hooks/mediaCache'

describe('storedObjects', () => {
  it('lists the original and every generated size under the storage prefix', () => {
    const keys = storedObjects(
      {
        filename: 'abc.jpg',
        mimeType: 'image/jpeg',
        sizes: {
          w320: { filename: 'abc-320x320.webp', mimeType: 'image/webp' },
          w640: { filename: 'abc-640x640.webp', mimeType: 'image/webp' },
          // Sizes larger than the original are not generated.
          w1280: { filename: null, mimeType: null },
        },
      },
      'products',
    )
    expect(keys).toEqual([
      { key: 'products/abc.jpg', mimeType: 'image/jpeg' },
      { key: 'products/abc-320x320.webp', mimeType: 'image/webp' },
      { key: 'products/abc-640x640.webp', mimeType: 'image/webp' },
    ])
  })

  it('copes with documents that carry no sizes', () => {
    expect(storedObjects({ filename: 'x.png', mimeType: 'image/png' }, 'products')).toEqual([
      { key: 'products/x.png', mimeType: 'image/png' },
    ])
    expect(storedObjects({ filename: null }, 'products')).toEqual([])
  })

  it('asks browsers to keep photos for a year: names are unique and never rewritten', () => {
    expect(IMMUTABLE_CACHE).toBe('public, max-age=31536000, immutable')
  })
})
