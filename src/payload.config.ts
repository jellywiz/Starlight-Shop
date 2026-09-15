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
import { LOCALES, LOCALE_META, DEFAULT_LOCALE } from '@/i18n/config'
import { SCHEMA_NAME } from '@/lib/db'
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
    components: {
      graphics: {
        Logo: '@/components/admin/Logo#Logo',
        Icon: '@/components/admin/Logo#Icon',
      },
    },
    dateFormat: 'yyyy-MM-dd HH:mm',
    // No third-party requests from the admin (Gravatar would leak the owner's email hash).
    avatar: 'default',
  },
  collections: [Products, Categories, DeliveryCities, Media, Redirects, Users],
  globals: [ShopSettings],
  localization: {
    locales: LOCALES.map((code) => ({
      code,
      label: LOCALE_META[code].label,
      rtl: LOCALE_META[code].dir === 'rtl',
    })),
    defaultLocale: DEFAULT_LOCALE,
    // Explicit locale reads with fallback disabled (spec section 4).
    fallback: false,
  },
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
  db: postgresAdapter({
    pool: {
      connectionString: databaseUri(),
      max: env.isProduction ? 3 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
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
          table: schema.tables.cities_locales,
          extraConfig: (table) => ({
            cities_locales_name_unique: uniqueIndex('cities_locales_name_unique').on(
              table._locale,
              table.normalizedName,
            ),
          }),
        })
        return schema
      },
    ],
  }),
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
