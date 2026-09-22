/**
 * Uploads a storage backup (the folder written by `pnpm backup:storage`, with its
 * manifest.json) into the bucket named by the S3_* variables, keeping every object key.
 * Used to restore images, or to move them to a bucket in another region
 * (docs/deployment.md "Where the functions and the database run").
 *
 *   pnpm restore:storage backups/<timestamp>/storage
 *
 * Existing objects with the same key are overwritten; nothing is deleted.
 */
import './lib/load-env'

import fs from 'node:fs/promises'
import path from 'node:path'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name} in the environment`)
  }
  return value
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

async function main() {
  const source = process.argv[2]
  if (!source) {
    throw new Error('Usage: pnpm restore:storage <backup-storage-folder>')
  }
  const folder = path.resolve(source)
  const manifest = JSON.parse(await fs.readFile(path.join(folder, 'manifest.json'), 'utf8')) as {
    objects: { key: string }[]
  }
  const bucket = required('S3_BUCKET')
  const client = new S3Client({
    endpoint: required('S3_ENDPOINT'),
    region: required('S3_REGION'),
    forcePathStyle: true,
    credentials: {
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    },
  })

  let uploaded = 0
  for (const { key } of manifest.objects) {
    const file = path.join(folder, key)
    const body = await fs.readFile(file)
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: CONTENT_TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream',
        // Product images are addressed by unique file names, so long browser caching is safe.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )
    uploaded += 1
    process.stdout.write(`uploaded ${key}\n`)
  }
  process.stdout.write(`Uploaded ${uploaded} objects to ${bucket}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
