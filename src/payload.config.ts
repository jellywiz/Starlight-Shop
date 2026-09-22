import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { uniqueIndex } from '@payloadcms/db-postgres/drizzle/pg-core'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Categories } from '@/collections/Categories'
import { DeliveryCities } from '@/collections/DeliveryCities'
import { Media, MAX_UPLOAD_BYTES } from '@/collections/Media'
import { Products } from '@/collections/Products'
import { Redirects } from '@/collections/Redirects'
import { Users } from '@/collections/Users'
import { catalogEndpoint } from '@/endpoints/catalog'
import { deliveryCitiesEndpoint } from '@/endpoints/deliveryCities'
import { ShopSettings } from '@/globals/ShopSettings'
import { SCHEMA_NAME, withHandledConnectionFailure } from '@/lib/db'
import { databaseUri, env, payloadSecret, s3Settings, siteUrl } from '@/lib/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const s3 = s3Settings()
const origin = siteUrl()

export default buildConfig({
  serverURL: origin,
  secret: payloadSecret(),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' · Starlight Jewellery admin',
      icons: [{ rel: 'icon', type: 'image/png', url: '/brand/favicon-32.png' }],
    },
    // Light and dark Starlight themes (src/app/(payload)/custom.scss); the owner picks
    // Light / Dark / Auto in the menu (src/components/admin/AppearanceSwitch.tsx), and
    // src/app/(payload)/layout.tsx keeps the blank page dark on dark devices before hydration.
    theme: 'all',
    components: {
      graphics: {
        Logo: '@/components/admin/Logo#Logo',
        Icon: '@/components/admin/Logo#Icon',
      },
      // Task-based home instead of Payload's collection cards (docs/decisions.md).
      views: {
        dashboard: { Component: '@/components/admin/Home#Home' },
      },
      afterNavLinks: ['@/components/admin/NavExtras#NavExtras'],
    },
    dateFormat: 'yyyy-MM-dd HH:mm',
    // No third-party requests from the admin (Gravatar would leak the owner's email hash).
    avatar: 'default',
  },
  collections: [Products, Categories, DeliveryCities, Media, Redirects, Users],
  globals: [ShopSettings],
  // Content translations are explicit per-language fields on one form (src/fields/translated.ts),
  // not Payload locales, so the admin has no locale switcher (docs/decisions.md).
  // The admin interface starts in English; content locales are separate (spec section 4).
  i18n: {
    fallbackLanguage: 'en',
  },
  endpoints: [catalogEndpoint, deliveryCitiesEndpoint],
  graphQL: {
    disable: true,
  },
  cors: [origin],
  csrf: [origin],
  upload: {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
    },
  },
  sharp,
  db: withHandledConnectionFailure(
    postgresAdapter({
      pool: {
        connectionString: databaseUri(),
        max: env.isProduction ? 3 : 10,
        // On the serverless host a container serves many requests in a row; opening a new
        // TLS connection to the pooler for each of them costs several round trips, so
        // idle connections are kept for a few minutes (below the host's 350 s NAT limit,
        // after which a silent drop would be worse than a reconnect).
        idleTimeoutMillis: env.isProduction ? 240_000 : 10_000,
        connectionTimeoutMillis: 10_000,
        keepAlive: true,
      },
      schemaName: SCHEMA_NAME,
      migrationDir: path.resolve(dirname, 'migrations'),
      // Schema changes are applied through committed migrations only (spec section 6).
      push: false,
      afterSchemaInit: [
        ({ schema, extendTable }) => {
          // Unique normalized delivery-city name per language at database level (spec
          // section 6 "City delivery data"); the hook gives the friendly message first.
          extendTable({
            table: schema.tables.cities,
            extraConfig: (table) => ({
              cities_normalized_name_ckb_unique: uniqueIndex(
                'cities_normalized_name_ckb_unique',
              ).on(table.normalizedName_ckb),
              cities_normalized_name_ar_unique: uniqueIndex('cities_normalized_name_ar_unique').on(
                table.normalizedName_ar,
              ),
              cities_normalized_name_en_unique: uniqueIndex('cities_normalized_name_en_unique').on(
                table.normalizedName_en,
              ),
            }),
          })
          return schema
        },
      ],
    }),
  ),
  plugins: [
    s3Storage({
      enabled: s3 !== null,
      alwaysInsertFields: true,
      bucket: s3?.bucket ?? 'unconfigured',
      config: {
        endpoint: s3?.endpoint ?? 'http://localhost',
        region: s3?.region ?? 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: s3?.accessKeyId ?? '',
          secretAccessKey: s3?.secretAccessKey ?? '',
        },
      },
      collections: {
        media: {
          prefix: 'products',
          // Files are public marketing assets served straight from the bucket.
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename: name, prefix }) =>
            `${s3?.publicBaseUrl ?? ''}/${prefix ? `${prefix.replace(/\/+$/, '')}/` : ''}${name}`,
        },
      },
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
