/**
 * Adds the blurred stand-in (`blurDataUrl`) to photos uploaded before it existed; new
 * uploads get it automatically (src/collections/Media.ts). Safe to re-run: photos that
 * already have one are skipped.
 *
 * Against the live site — only the database connection and the public photo address are
 * needed, no storage keys:
 *
 *   DATABASE_MIGRATION_URI='postgresql://…session pooler…:5432/postgres' \
 *   MEDIA_PUBLIC_BASE_URL='https://<ref>.supabase.co/storage/v1/object/public/product-images' \
 *   pnpm media:previews
 *
 * Locally (embedded database from `pnpm dev`, photos in ./media): `pnpm media:previews`.
 * `--force` redoes every photo, replacing existing previews.
 */
import './lib/load-env'

import fs from 'node:fs/promises'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

import { blurPreview } from '../src/lib/media-preview'

/** Where the storage plugin keeps the photos (src/payload.config.ts). */
const STORAGE_PREFIX = 'products'

const publicBase = (process.env.MEDIA_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '')
const mediaDir = process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : path.resolve('media')

async function readPhoto(filename: string): Promise<Buffer> {
  // The public bucket address when given (the live site); the local media folder otherwise.
  if (publicBase) {
    const url = `${publicBase}/${STORAGE_PREFIX}/${filename}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }
  return fs.readFile(path.join(mediaDir, filename))
}

function explainTarget(): void {
  const uri = process.env.DATABASE_MIGRATION_URI ?? process.env.DATABASE_URI ?? ''
  const host = uri.replace(/^[^@]*@/, '').replace(/\/.*$/, '') || '(no database set)'
  const photos = publicBase ? publicBase : `${mediaDir} (local folder)`
  process.stdout.write(`Database: ${host}\nPhotos:   ${photos}\n`)
  if (!process.env.DATABASE_MIGRATION_URI && !publicBase) {
    process.stdout.write(
      'This is the local development setup. For the live site pass DATABASE_MIGRATION_URI and MEDIA_PUBLIC_BASE_URL (see the top of scripts/media-previews.ts).\n',
    )
  }
}

async function main() {
  const force = process.argv.includes('--force')
  explainTarget()
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'media',
    where: force ? {} : { blurDataUrl: { exists: false } },
    pagination: false,
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })
  let done = 0
  let failed = 0
  for (const doc of docs) {
    // The 320 px variant is plenty for a 24 px preview and the smallest download.
    const filename = doc.sizes?.w320?.filename ?? doc.filename
    if (!filename) {
      continue
    }
    try {
      const blurDataUrl = await blurPreview(await readPhoto(filename))
      await payload.update({
        collection: 'media',
        id: doc.id,
        data: { blurDataUrl },
        depth: 0,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      done += 1
    } catch (error) {
      failed += 1
      process.stderr.write(`media ${doc.id} (${filename}): ${String(error)}\n`)
    }
  }
  process.stdout.write(
    `Previews written: ${done}, failed: ${failed}, skipped: ${docs.length - done - failed}.\n`,
  )
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  const message = String(error)
  if (/ECONNREFUSED 127\.0\.0\.1/.test(message)) {
    process.stderr.write(
      'The local development database is not running (start it with `pnpm dev` or `pnpm db:start`), or pass DATABASE_MIGRATION_URI to work on the live site.\n',
    )
  }
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
