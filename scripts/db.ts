/**
 * Local database helper.
 *
 *   pnpm db:start   start the embedded PostgreSQL cluster in .data/pg (Ctrl+C stops it)
 *   pnpm db:reset   delete the local cluster and start a fresh one
 *
 * The connection string is printed and matches the DATABASE_URI in .env.example.
 */
import './lib/load-env'

import { LOCAL_DB_DEFAULTS, fromConnectionString, startEmbeddedPostgres } from './lib/embedded-db'

const command = process.argv[2] ?? 'start'
const fromEnv = fromConnectionString(process.env.DATABASE_URI)
const port = Number.parseInt(
  process.env.LOCAL_PG_PORT ?? String(fromEnv.port ?? LOCAL_DB_DEFAULTS.port),
  10,
)

async function main() {
  const db = await startEmbeddedPostgres({
    dir: '.data/pg',
    reset: command === 'reset',
    ...fromEnv,
    port,
  })
  process.stdout.write(
    `\nPostgreSQL is running.\nDATABASE_URI=${db.connectionString}\nPress Ctrl+C to stop.\n\n`,
  )
  const shutdown = async () => {
    await db.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  // Keep the process alive.
  setInterval(() => undefined, 60_000)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
