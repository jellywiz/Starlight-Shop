import sharp from 'sharp'

/**
 * A tiny blurred stand-in for a photo, made once at upload and stored with the image, so
 * the page can paint something in the photo's frame before the real file arrives (spec
 * section 11). About 300 bytes as a data URL: 24 px on the long side, WebP, low quality;
 * the browser blurs it up to the frame's size (src/components/site/ResponsiveImage.tsx).
 */
export const PREVIEW_SIZE = 24

export async function blurPreview(data: Buffer): Promise<string> {
  const buffer = await sharp(data, { failOn: 'error' })
    .rotate()
    .resize(PREVIEW_SIZE, PREVIEW_SIZE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 35, alphaQuality: 30, effort: 6 })
    .toBuffer()
  return `data:image/webp;base64,${buffer.toString('base64')}`
}

/** True for the data URLs this module produces (anything else is ignored by the site). */
export function isBlurPreview(value: unknown): value is string {
  return (
    typeof value === 'string' && value.startsWith('data:image/webp;base64,') && value.length < 4000
  )
}
