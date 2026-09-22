import type { DatabaseAdapterObj } from 'payload'

/**
 * Dedicated Postgres schema for the application's tables (spec section 6), so the
 * Supabase Data API (which exposes `public`) never sees them. The committed migrations
 * hard-code this name; do not change it without a new migration.
 */
export const SCHEMA_NAME = 'starlight'

type Initializing = { initializing?: Promise<unknown> }

/**
 * Keeps a failed database connection from crashing the serverless function.
 *
 * The Postgres adapter creates an `initializing` promise that it rejects — with no
 * reason — when the first connection fails (wrong password, paused project, network),
 * and only awaits it when a transaction starts. When the connection fails before any
 * transaction, nothing has handled that rejection; `next start` merely logs it, but the
 * serverless runtime treats an unhandled rejection as a crash and answers every request
 * with "This function has crashed" instead of letting the pages render their
 * "catalogue unavailable" state. Handling the rejection here changes nothing else: every
 * caller of `getPayload` still receives the connection error.
 */
export function withHandledConnectionFailure<T extends object>(
  adapter: DatabaseAdapterObj<T>,
): DatabaseAdapterObj<T> {
  return {
    ...adapter,
    init: (args) => {
      const instance = adapter.init(args)
      ;(instance as Initializing).initializing?.catch(() => {})
      return instance
    },
  }
}
