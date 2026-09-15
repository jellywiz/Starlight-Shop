/**
 * Dedicated Postgres schema for the application's tables (spec section 6), so the
 * Supabase Data API (which exposes `public`) never sees them. The committed migrations
 * hard-code this name; do not change it without a new migration.
 */
export const SCHEMA_NAME = 'starlight'
