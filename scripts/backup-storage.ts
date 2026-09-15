/**
 * Copies every object of the product-image bucket to a local folder with a manifest
 * (spec section 12 "Backup and restore procedure"). Database dumps do not contain the
 * image files, so both are needed.
 *
 *   pnpm backup:storage [target-folder]     (default: backups/<timestamp>/storage)
 *
 * Uses the S3_* variables from .env (the maintainer's copy, never committed).
 */
import './lib/load-env'

import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'

import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name} in the environment`)
  }
  return value
}

async function main() {
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
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = path.resolve(process.argv[2] ?? path.join('backups', stamp, 'storage'))
  await fs.mkdir(target, { recursive: true })

  const manifest: { key: string; size: number; etag: string; lastModified: string }[] = []
  let token: string | undefined
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    )
    for (const object of page.Contents ?? []) {
      if (!object.Key) {
        continue
      }
      const file = path.join(target, object.Key)
      await fs.mkdir(path.dirname(file), { recursive: true })
      const body = await client.send(new GetObjectCommand({ Bucket: bucket, Key: object.Key }))
      await pipeline(body.Body as Readable, createWriteStream(file))
      manifest.push({
        key: object.Key,
        size: object.Size ?? 0,
        etag: object.ETag ?? '',
        lastModified: object.LastModified?.toISOString() ?? '',
      })
      process.stdout.write(`saved ${object.Key}\n`)
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)

  await fs.writeFile(
    path.join(target, 'manifest.json'),
    JSON.stringify({ bucket, createdAt: new Date().toISOString(), objects: manifest }, null, 2),
  )
  process.stdout.write(`Backed up ${manifest.length} objects to ${target}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
