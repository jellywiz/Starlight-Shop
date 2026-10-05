import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { PREVIEW_SIZE, blurPreview, isBlurPreview } from '@/lib/media-preview'

async function photo(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#9a6b9b' } })
    .jpeg()
    .toBuffer()
}

describe('blurPreview', () => {
  it('makes a tiny WebP data URL no larger than the preview size', async () => {
    const url = await blurPreview(await photo(1600, 1200))
    expect(isBlurPreview(url)).toBe(true)
    expect(url.length).toBeLessThan(1000)
    const decoded = Buffer.from(url.slice('data:image/webp;base64,'.length), 'base64')
    const meta = await sharp(decoded).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(PREVIEW_SIZE)
    expect(meta.height).toBe(Math.round((PREVIEW_SIZE * 1200) / 1600))
  })

  it('never enlarges a photo smaller than the preview', async () => {
    const url = await blurPreview(await photo(10, 8))
    const decoded = Buffer.from(url.slice('data:image/webp;base64,'.length), 'base64')
    const meta = await sharp(decoded).metadata()
    expect(meta.width).toBe(10)
  })

  it('rejects anything that is not a preview', () => {
    expect(isBlurPreview(null)).toBe(false)
    expect(isBlurPreview('https://example.com/x.webp')).toBe(false)
    expect(isBlurPreview('data:image/png;base64,AAAA')).toBe(false)
    expect(isBlurPreview(`data:image/webp;base64,${'A'.repeat(5000)}`)).toBe(false)
  })
})
