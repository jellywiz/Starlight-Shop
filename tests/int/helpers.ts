import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import config from '@payload-config'
import type { Category, City } from '@/payload-types'
import { SCHEMA_NAME } from '@/lib/db'

let cached: Payload | undefined

export async function testPayload(): Promise<Payload> {
  if (!cached) {
    cached = await getPayload({ config })
  }
  return cached
}

/** Empties every application table (except the migrations ledger). */
export async function resetDatabase(payload: Payload): Promise<void> {
  const db = payload.db as unknown as { pool: { query: (sql: string) => Promise<unknown> } }
  await db.pool.query(`
    DO $$ DECLARE r record;
    BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = '${SCHEMA_NAME}' AND tablename <> 'payload_migrations' LOOP
        EXECUTE 'TRUNCATE TABLE ${SCHEMA_NAME}.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `)
}

export async function createOwner(
  payload: Payload,
  email = 'owner@example.com',
  password = 'Owner-password-1',
) {
  const user = await payload.create({
    collection: 'users',
    data: { email, password, role: 'owner' },
    overrideAccess: true,
    context: { allowFirstUser: true },
  })
  return { user, email, password }
}

export async function ownerUser(payload: Payload, email = 'owner@example.com') {
  const result = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    overrideAccess: true,
    limit: 1,
  })
  const user = result.docs[0]
  return { ...user, collection: 'users' as const }
}

export async function makeImage(width = 800, height = 600, color = '#482044'): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .jpeg({ quality: 80 })
    .toBuffer()
}

export type LocalizedText = Record<'ckb' | 'ar' | 'en', string>

export async function createMedia(
  payload: Payload,
  opts: { alt: Record<'ckb' | 'ar' | 'en', string | null>; width?: number; height?: number },
) {
  const data = await makeImage(opts.width ?? 800, opts.height ?? 600)
  const media = await payload.create({
    collection: 'media',
    data: { altText: opts.alt.ckb ?? undefined },
    file: { data, mimetype: 'image/jpeg', name: 'photo.jpg', size: data.length },
    locale: 'ckb',
    overrideAccess: true,
  })
  for (const locale of ['ar', 'en'] as const) {
    if (opts.alt[locale]) {
      await payload.update({
        collection: 'media',
        id: media.id,
        data: { altText: opts.alt[locale] },
        locale,
        overrideAccess: true,
      })
    }
  }
  return media
}

/** Creates a category with all three names and activates it (unless `isActive: false`). */
export async function createCategory(
  payload: Payload,
  names: LocalizedText,
  slug: string,
  extra: Partial<Category> = {},
) {
  const { isActive = true, ...rest } = extra
  const category = await payload.create({
    collection: 'categories',
    data: { name: names.en, slug, ...rest, isActive: false },
    locale: 'en',
    overrideAccess: true,
  })
  for (const locale of ['ckb', 'ar'] as const) {
    await payload.update({
      collection: 'categories',
      id: category.id,
      data: { name: names[locale] },
      locale,
      overrideAccess: true,
    })
  }
  if (isActive) {
    return payload.update({
      collection: 'categories',
      id: category.id,
      data: { isActive: true },
      locale: 'en',
      overrideAccess: true,
    })
  }
  return category
}

/** Creates a delivery city with all three names; activates it unless `isActive: false`. */
export async function createCity(
  payload: Payload,
  names: LocalizedText,
  feeIqd: number | null,
  extra: Partial<City> = {},
) {
  const { isActive = true, ...rest } = extra
  const city = await payload.create({
    collection: 'cities',
    data: {
      name: names.en,
      ...(feeIqd === null ? {} : { feeIqd }),
      freeDeliveryConfirmed: feeIqd === 0,
      ...rest,
      isActive: false,
    },
    locale: 'en',
    overrideAccess: true,
  })
  for (const locale of ['ckb', 'ar'] as const) {
    await payload.update({
      collection: 'cities',
      id: city.id,
      data: { name: names[locale] },
      locale,
      overrideAccess: true,
    })
  }
  if (isActive) {
    return payload.update({
      collection: 'cities',
      id: city.id,
      data: { isActive: true },
      locale: 'en',
      overrideAccess: true,
    })
  }
  return city
}

export type ProductFixture = {
  names: LocalizedText
  descriptions?: LocalizedText
  category: number
  photos: number[]
  priceIqd: number
  isAvailable?: boolean
  featured?: boolean
  slug?: string
}

/**
 * Creates a product with all three translations. Saved as a draft first (one locale per
 * request, like the admin does), then optionally published.
 */
export async function createProduct(
  payload: Payload,
  fixture: ProductFixture,
  options: { publish?: boolean } = {},
) {
  const descriptions = fixture.descriptions ?? {
    ckb: `وەسفی ${fixture.names.ckb}`,
    ar: `وصف ${fixture.names.ar}`,
    en: `Description of ${fixture.names.en}`,
  }
  const created = await payload.create({
    collection: 'products',
    data: {
      name: fixture.names.en,
      description: descriptions.en,
      category: fixture.category,
      photos: fixture.photos,
      priceIqd: fixture.priceIqd,
      isAvailable: fixture.isAvailable ?? true,
      featured: fixture.featured ?? false,
      ...(fixture.slug ? { slug: fixture.slug } : {}),
      _status: 'draft',
    },
    locale: 'en',
    draft: true,
    overrideAccess: true,
  })
  for (const locale of ['ckb', 'ar'] as const) {
    await payload.update({
      collection: 'products',
      id: created.id,
      data: {
        name: fixture.names[locale],
        description: descriptions[locale],
        _status: 'draft',
      },
      locale,
      draft: true,
      overrideAccess: true,
    })
  }
  if (options.publish) {
    return payload.update({
      collection: 'products',
      id: created.id,
      data: { _status: 'published' },
      locale: 'en',
      draft: false,
      overrideAccess: true,
    })
  }
  return payload.findByID({
    collection: 'products',
    id: created.id,
    locale: 'en',
    draft: true,
    overrideAccess: true,
  })
}

export type PayloadErrorShape = { data?: { errors?: { path: string; message: string }[] } }

/** Runs an operation expected to fail and returns the Payload validation details. */
export async function expectFailure(run: () => Promise<unknown>): Promise<string> {
  let error: unknown
  try {
    await run()
  } catch (e) {
    error = e
  }
  if (error === undefined) {
    throw new Error('Expected the operation to fail')
  }
  const details = (error as PayloadErrorShape).data?.errors ?? []
  const message = error instanceof Error ? error.message : String(error)
  return [message, ...details.map((d) => `${d.path}: ${d.message}`)].join('\n')
}
