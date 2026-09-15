import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileTypeFromBuffer } from 'file-type'
import type { CollectionConfig, PayloadRequest } from 'payload'
import { APIError, ValidationError } from 'payload'
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

function uploadError(message: string): ValidationError {
  return new ValidationError({ collection: 'media', errors: [{ path: 'file', message }] })
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
  if (file.size > MAX_UPLOAD_BYTES || file.data.length > MAX_UPLOAD_BYTES) {
    throw uploadError(
      `The image is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB. Please resize it before uploading.`,
    )
  }
  const detected = await fileTypeFromBuffer(file.data)
  const allowed = detected ? ALLOWED[detected.mime] : undefined
  if (!detected || !allowed) {
    throw uploadError(
      'Only JPEG, PNG and WebP images are accepted. The file content did not match an allowed image type.',
    )
  }

  let image = sharp(file.data, { failOn: 'error', limitInputPixels: MAX_UPLOAD_PIXELS })
  let metadata: SharpMetadata
  try {
    metadata = await image.metadata()
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
      `The image has more than ${MAX_UPLOAD_PIXELS / 1_000_000} megapixels. Please resize it before uploading.`,
    )
  }

  // Apply the EXIF orientation, then re-encode without metadata.
  image = image.rotate()
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
      'Product photos and the shop logo. JPEG, PNG or WebP up to 3 MB and 20 megapixels. Fill the alt text in all three languages.',
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
      name: 'altText',
      type: 'text',
      localized: true,
      maxLength: 200,
      admin: {
        description:
          'Describe the image for screen readers and search engines, e.g. "Silver star necklace on a white background".',
      },
    },
  ],
}
