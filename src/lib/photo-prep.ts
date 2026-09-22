import { MAX_UPLOAD_BYTES, MAX_UPLOAD_PIXELS, PREPARED_MAX_SIDE } from '@/lib/upload-limits'

/**
 * Browser-side photo preparation: a phone photo (often 4000+ px and 5–8 MB) is decoded,
 * rotated the right way up, reduced to PREPARED_MAX_SIDE and re-encoded before it is
 * uploaded, so the upload is small and never bounces off the server's 3 MB / 20 MP
 * limits. The server still validates and re-encodes every file (src/collections/Media.ts);
 * this only makes the common case fast on a phone connection.
 */

export type PreparedPhoto = {
  file: File
  width: number
  height: number
  /** True when the file was resized or re-encoded; false when the original is sent as is. */
  changed: boolean
  original: { width: number; height: number; bytes: number }
}

export type PrepareOptions = {
  maxBytes?: number
  maxPixels?: number
  maxSide?: number
  onProgress?: (fraction: number) => void
}

const JPEG_QUALITIES = [0.86, 0.8, 0.72]

/** Files this module can decode and re-encode in a browser. */
export function isPreparableImage(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
}

/** Whether a photo of these dimensions and size would be reduced before upload. */
export function needsPreparation(
  width: number,
  height: number,
  bytes: number,
  options: PrepareOptions = {},
): boolean {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES
  const maxPixels = options.maxPixels ?? MAX_UPLOAD_PIXELS
  const maxSide = options.maxSide ?? PREPARED_MAX_SIDE
  return bytes > maxBytes || width * height > maxPixels || Math.max(width, height) > maxSide
}

/** The scale that brings a photo within the longest-side and pixel limits (never enlarges). */
export function scaleFor(
  width: number,
  height: number,
  options: { maxPixels?: number; maxSide?: number } = {},
): number {
  const maxPixels = options.maxPixels ?? MAX_UPLOAD_PIXELS
  const maxSide = options.maxSide ?? PREPARED_MAX_SIDE
  return Math.min(1, maxSide / Math.max(width, height), Math.sqrt(maxPixels / (width * height)))
}

/** A file name with the extension of the encoded type. */
export function renamed(name: string, mimeType: string): string {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const base = name.replace(/\.[a-z0-9]+$/i, '') || 'photo'
  return `${base}.${ext}`
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Applies the EXIF orientation, so a phone photo comes out the right way up.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through to the <img> route (older browsers, unusual files).
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The image could not be decoded'))
      image.src = url
    })
    return image
  } finally {
    // The element keeps its decoded pixels; the URL is no longer needed.
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function draw(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available')
  }
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, width, height)
  return canvas
}

/**
 * Decodes the photo and, when it is larger than the limits, returns a reduced copy.
 * Photos already within the limits are returned untouched (no second lossy encode).
 * JPEG and WebP photos are re-encoded as JPEG (WebP where the browser can encode it),
 * PNG stays PNG so transparency (a logo) survives, unless PNG alone cannot get under
 * the size limit.
 */
export async function preparePhoto(
  file: File,
  options: PrepareOptions = {},
): Promise<PreparedPhoto> {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES
  const report = options.onProgress ?? (() => {})
  report(0.05)
  const source = await decode(file)
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height
  const original = { width, height, bytes: file.size }
  report(0.3)

  if (!needsPreparation(width, height, file.size, options)) {
    report(1)
    return { file, width, height, changed: false, original }
  }

  let scale = scaleFor(width, height, options)
  const keepPng = file.type === 'image/png'
  const preferWebp = file.type === 'image/webp'
  let best: { blob: Blob; width: number; height: number } | null = null

  // Up to four passes: the first at the target size; if the result is still too large,
  // lower the JPEG quality, then shrink further.
  for (let pass = 0; pass < 4 && !best; pass += 1) {
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))
    const canvas = draw(source, targetWidth, targetHeight)
    report(0.3 + 0.6 * ((pass + 0.5) / 4))
    const candidates: { type: string; quality?: number }[] = keepPng
      ? [
          { type: 'image/png' },
          { type: 'image/webp', quality: 0.9 },
          { type: 'image/jpeg', quality: 0.86 },
        ]
      : preferWebp
        ? [
            { type: 'image/webp', quality: 0.86 },
            ...JPEG_QUALITIES.map((quality) => ({ type: 'image/jpeg', quality })),
          ]
        : JPEG_QUALITIES.map((quality) => ({ type: 'image/jpeg', quality }))
    for (const candidate of candidates) {
      const blob = await toBlob(canvas, candidate.type, candidate.quality)
      // A browser that cannot encode the requested type silently returns a PNG.
      if (!blob || blob.type !== candidate.type) {
        continue
      }
      if (blob.size <= maxBytes) {
        best = { blob, width: targetWidth, height: targetHeight }
        break
      }
    }
    scale *= 0.8
  }
  if ('close' in source && typeof source.close === 'function') {
    source.close()
  }
  if (!best) {
    throw new Error('The photo could not be reduced enough')
  }
  report(1)
  const prepared = new File([best.blob], renamed(file.name, best.blob.type), {
    type: best.blob.type,
    lastModified: file.lastModified,
  })
  return { file: prepared, width: best.width, height: best.height, changed: true, original }
}

/** "5.8 MB" / "640 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
