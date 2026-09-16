import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileTypeFromBuffer } from 'file-type'
import type { CollectionConfig, PayloadRequest } from 'payload'
import { APIError } from 'payload'
import sharp, { type Metadata as SharpMetadata } from 'sharp'

import { anyone, ownerOnly } from '@/access'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** Upload limits (spec section 11): 3 MB and 20 megapixels per image. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
export const MAX_UPLOAD_PIXELS = 20_000_000

const ALLOWED: Record<string, { ext: string; mime: string }> = {
  'image/jpeg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/png': { ext: 'png', mime: 'image/png' },
  'image/webp': { ext: 'webp', mime: 'image/webp' },
}

/**
 * A plain, public API error rather than a field-level ValidationError: the admin's upload
 * field does not display field messages, so a ValidationError only ever surfaces as
 * "The following field is invalid: file". A public APIError shows the reason in the toast.
 */
function uploadError(message: string): Error {
  return new APIError(message, 400, undefined, true)
}

const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024)

/** Rough size of the uploaded body, for the "too large" message (multipart requests only). */
function requestMegabytes(req: PayloadRequest): string | null {
  const header = typeof req.headers?.get === 'function' ? req.headers.get('content-length') : null
  const bytes = header ? Number.parseInt(header, 10) : Number.NaN
  return Number.isFinite(bytes) && bytes > 0 ? (bytes / (1024 * 1024)).toFixed(1) : null
}

/**
 * Validates and sanitizes an incoming file BEFORE Payload stores it:
 *  - the real (decoded) type must be JPEG, PNG or WebP regardless of the declared type;
 *  - size and pixel limits are enforced with a clear message;
 *  - EXIF/ICC metadata is removed by re-encoding through sharp (orientation is applied
 *    first so photos do not rotate);
 *  - the object key is randomized to avoid collisions and to version replaced files.
 */
async function sanitizeUpload(req: PayloadRequest): Promise<void> {
  const file = req.file
  if (!file || !file.data) {
    return
  }
  // The multipart parser stops reading at `upload.limits.fileSize` and flags the file as
  // truncated instead of rejecting it, so an oversized upload arrives here at exactly the
  // limit. Treat that as "too large" rather than letting it fail later as a broken image.
  const truncated = (file as { truncated?: boolean }).truncated === true
  if (truncated || file.size > MAX_UPLOAD_BYTES || file.data.length > MAX_UPLOAD_BYTES) {
    const approx = truncated ? requestMegabytes(req) : (file.size / (1024 * 1024)).toFixed(1)
    throw uploadError(
      `This image is larger than ${MAX_UPLOAD_MB} MB${approx ? ` (about ${approx} MB)` : ''}, so it was not saved. Use a smaller copy: export it as a JPEG, or resize it so the file is under ${MAX_UPLOAD_MB} MB, then upload again.`,
    )
  }
  const detected = await fileTypeFromBuffer(file.data)
  const allowed = detected ? ALLOWED[detected.mime] : undefined
  if (!detected || !allowed) {
    throw uploadError(
      'Only JPEG, PNG and WebP images are accepted. The file content did not match an allowed image type.',
    )
  }

  // Read the header only, without sharp's pixel limit: the limit is checked explicitly
  // below so an oversized image is reported with its dimensions, not as "undecodable".
  let metadata: SharpMetadata
  try {
    metadata = await sharp(file.data, { failOn: 'error', limitInputPixels: false }).metadata()
  } catch {
    throw uploadError(
      'The image could not be decoded. Please upload a valid JPEG, PNG or WebP file.',
    )
  }
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (width === 0 || height === 0) {
    throw uploadError('The image dimensions could not be read.')
  }
  if (width * height > MAX_UPLOAD_PIXELS) {
    throw uploadError(
      `This image is ${width} × ${height} pixels, more than ${MAX_UPLOAD_PIXELS / 1_000_000} megapixels, so it was not saved. Resize it (for example to 3000 pixels on the longer side) and upload again.`,
    )
  }

  // Apply the EXIF orientation, then re-encode without metadata.
  const image = sharp(file.data, { failOn: 'error', limitInputPixels: MAX_UPLOAD_PIXELS }).rotate()
  let output: Buffer
  try {
    switch (allowed.mime) {
      case 'image/jpeg':
        output = await image.jpeg({ quality: 90, mozjpeg: true }).toBuffer()
        break
      case 'image/png':
        output = await image.png({ compressionLevel: 9 }).toBuffer()
        break
      default:
        output = await image.webp({ quality: 90 }).toBuffer()
    }
  } catch {
    throw uploadError('The image could not be processed. Please try a different file.')
  }

  file.data = output
  file.size = output.length
  file.mimetype = allowed.mime
  file.name = `${randomBytes(12).toString('hex')}.${allowed.ext}`
}

type Reference = { collection: string; label: string }

/** Returns every product (draft, published or version snapshot) and setting that still uses this file. */
async function findReferences(req: PayloadRequest, mediaId: number | string): Promise<Reference[]> {
  const refs: Reference[] = []
  const { payload } = req

  const products = await payload.find({
    collection: 'products',
    where: { photos: { in: [mediaId] } },
    depth: 0,
    limit: 5,
    pagination: false,
    locale: 'en',
    fallbackLocale: false,
    overrideAccess: true,
    draft: true,
  })
  for (const doc of products.docs) {
    const label = typeof doc.name === 'string' && doc.name ? doc.name : (doc.slug ?? `id ${doc.id}`)
    refs.push({ collection: 'products', label: `product "${label}"` })
  }

  const versions = await payload.findVersions({
    collection: 'products',
    where: { 'version.photos': { in: [mediaId] } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  if (versions.totalDocs > 0 && refs.length === 0) {
    refs.push({ collection: 'products', label: 'product version history' })
  }

  const settings = await payload.findGlobal({
    slug: 'shop-settings',
    depth: 0,
    overrideAccess: true,
  })
  const logo = settings?.logo
  const logoId = typeof logo === 'object' && logo !== null ? logo.id : logo
  if (logoId !== undefined && logoId !== null && String(logoId) === String(mediaId)) {
    refs.push({ collection: 'shop-settings', label: 'the shop logo' })
  }
  return refs
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Catalog',
    defaultColumns: ['filename', 'altText', 'width', 'height', 'updatedAt'],
    description:
      'Product photos and the shop logo. Upload each image once: the same file is used in all three languages. JPEG, PNG or WebP up to 3 MB and 20 megapixels.',
  },
  access: {
    read: anyone,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  upload: {
    // Local disk is used in development only; production uses the S3 storage plugin.
    staticDir: process.env.MEDIA_DIR
      ? path.resolve(process.env.MEDIA_DIR)
      : path.resolve(dirname, '../../media'),
    mimeTypes: Object.keys(ALLOWED),
    imageSizes: [
      // Width-bound variants; smaller originals are not enlarged (a size is null when the
      // original is smaller than it, see Payload's `withoutEnlargement` default).
      { name: 'w320', width: 320 },
      { name: 'w640', width: 640 },
      { name: 'w1280', width: 1280 },
    ],
    adminThumbnail: 'w320',
    crop: false,
    focalPoint: false,
    displayPreview: true,
    withMetadata: false,
  },
  hooks: {
    beforeOperation: [
      async ({ operation, req }) => {
        if (operation === 'create' || operation === 'update') {
          await sanitizeUpload(req)
        }
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const refs = await findReferences(req, id)
        if (refs.length > 0) {
          const list = refs
            .slice(0, 3)
            .map((r) => r.label)
            .join(', ')
          throw new APIError(
            `This image is still used by ${list}. Remove it from those records first, then delete it.`,
            400,
            undefined,
            true,
          )
        }
      },
    ],
  },
  fields: [
    {
      // One optional description shared by all languages (owner decision, see
      // docs/decisions.md). When empty, the site uses the product name in the page's
      // language, or the shop name for the logo.
      name: 'altText',
      type: 'text',
      label: 'Image description (optional)',
      maxLength: 200,
      admin: {
        description:
          'Optional, one text for all languages: a short description for screen readers and search engines, e.g. "Silver star necklace on a white background". Leave it empty and the product name is used automatically.',
      },
    },
  ],
}
