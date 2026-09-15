/**
 * Explicit environment contract (spec section 14). Nothing here is assumed to be an
 * automatic framework setting; every value is read once and validated.
 *
 * Secrets (database, Payload secret, S3 keys) are server-only and must never be exposed
 * with a NEXT_PUBLIC prefix.
 */

const isProduction = process.env.NODE_ENV === 'production'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`)
  }
  return value
}

function optional(name: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

/**
 * Runtime connection (pooled). During migrations and maintenance scripts the migration
 * connection is preferred when PAYLOAD_DB_MODE=migration is set by the npm script.
 */
export function databaseUri(): string {
  if (process.env.PAYLOAD_DB_MODE === 'migration') {
    return optional('DATABASE_MIGRATION_URI') ?? required('DATABASE_URI')
  }
  return required('DATABASE_URI')
}

export function payloadSecret(): string {
  const secret = required('PAYLOAD_SECRET')
  if (isProduction && secret.length < 32) {
    throw new Error('PAYLOAD_SECRET must be at least 32 characters in production')
  }
  return secret
}

/** Canonical HTTPS origin used for links, metadata and inquiry URLs. */
export function siteUrl(): string {
  const value = optional('SITE_URL') ?? (isProduction ? undefined : 'http://localhost:3000')
  if (!value) {
    throw new Error('SITE_URL must be set in production')
  }
  return value.replace(/\/+$/, '')
}

export type S3Settings = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl: string
}

/**
 * True on Netlify builds and functions, or when a host explicitly opts in. Hosted
 * environments must never fall back to local disk storage (spec section 14).
 */
const isHostedRuntime = process.env.NETLIFY === 'true' || process.env.REQUIRE_S3_STORAGE === 'true'

/**
 * S3-compatible storage (Supabase Storage). Returns null when not configured, which is
 * only acceptable outside hosted environments: local development (and a local
 * `pnpm build` smoke test) store files on disk under ./media.
 */
export function s3Settings(): S3Settings | null {
  const bucket = optional('S3_BUCKET')
  if (!bucket) {
    if (isHostedRuntime) {
      throw new Error(
        'S3 storage must be configured on the hosting platform (S3_BUCKET is missing)',
      )
    }
    if (isProduction) {
      console.warn(
        '[env] S3 storage is not configured; uploads will be stored on local disk. Never run like this on a hosted platform.',
      )
    }
    return null
  }
  return {
    bucket,
    endpoint: required('S3_ENDPOINT'),
    region: required('S3_REGION'),
    accessKeyId: required('S3_ACCESS_KEY_ID'),
    secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    publicBaseUrl: required('MEDIA_PUBLIC_BASE_URL').replace(/\/+$/, ''),
  }
}

export const env = {
  isProduction,
  isTest: process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',
}
