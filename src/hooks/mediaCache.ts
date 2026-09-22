import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { CollectionAfterChangeHook } from 'payload'

import { type S3Settings, s3Settings } from '@/lib/env'

/**
 * Uploaded files get random names and are never rewritten (src/collections/Media.ts), so
 * browsers may keep them for a year: a visitor who comes back never re-downloads or
 * revalidates a product photo. Storage serves the header it was given at upload time;
 * Payload's storage adapter sets none (the bucket's default is one hour), so this hook
 * rewrites each new object's metadata in place right after the upload.
 */
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable'

let client: S3Client | null = null

function s3Client(settings: S3Settings): S3Client {
  client ??= new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  })
  return client
}

type UploadDoc = {
  filename?: string | null
  mimeType?: string | null
  sizes?: Record<string, { filename?: string | null; mimeType?: string | null } | null> | null
}

/** Object keys of the original and every generated size (the storage prefix included). */
export function storedObjects(doc: UploadDoc, prefix: string): { key: string; mimeType: string }[] {
  const files: { filename?: string | null; mimeType?: string | null }[] = [
    { filename: doc.filename, mimeType: doc.mimeType },
    ...Object.values(doc.sizes ?? {}).filter((size) => size !== null),
  ]
  return files
    .filter((file): file is { filename: string; mimeType?: string | null } =>
      Boolean(file.filename),
    )
    .map((file) => ({
      key: `${prefix}/${file.filename}`,
      mimeType: file.mimeType || 'application/octet-stream',
    }))
}

export const mediaCacheHeaders: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  const settings = s3Settings()
  if (!settings || operation !== 'create' || req.context?.skipCacheHeaders) {
    return doc
  }
  const s3 = s3Client(settings)
  await Promise.all(
    storedObjects(doc as UploadDoc, 'products').map(async ({ key, mimeType }) => {
      try {
        await s3.send(
          new CopyObjectCommand({
            Bucket: settings.bucket,
            CopySource: `/${settings.bucket}/${key}`,
            Key: key,
            MetadataDirective: 'REPLACE',
            ContentType: mimeType,
            CacheControl: IMMUTABLE_CACHE,
          }),
        )
      } catch (error) {
        // The photo is already uploaded and served; only its cache lifetime stays at the
        // bucket default. Log the class of failure, never the request.
        const message = error instanceof Error ? error.message : String(error)
        req.payload.logger.warn(`[media] could not set cache headers on ${key}: ${message}`)
      }
    }),
  )
  return doc
}
