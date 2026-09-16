/**
 * One-command development: starts the embedded PostgreSQL cluster, applies pending
 * migrations, then runs `next dev`. Stops the database when Next exits.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { LOCAL_DB_DEFAULTS, fromConnectionString, startEmbeddedPostgres } from './lib/embedded-db'

function loadDotEnv(file: string): Record<string, string> {
  if (!fs.existsSync(file)) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m) {
      out[m[1]] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
    }
  }
  return out
}

function run(
  command: string,
  args: string[],
  envOverrides: Record<string, string>,
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...envOverrides },
      shell: process.platform === 'win32',
    })
    child.on('exit', (code) => resolve(code ?? 0))
  })
}

async function main() {
  const dotenv = loadDotEnv(path.resolve('.env'))
  const fromEnv = fromConnectionString(dotenv.DATABASE_URI)
  const port = Number.parseInt(
    dotenv.LOCAL_PG_PORT ??
      process.env.LOCAL_PG_PORT ??
      String(fromEnv.port ?? LOCAL_DB_DEFAULTS.port),
    10,
  )
  const usesEmbedded =
    !dotenv.DATABASE_URI ||
    dotenv.DATABASE_URI.includes(`127.0.0.1:${port}`) ||
    dotenv.DATABASE_URI.includes(`localhost:${port}`)

  let stop: (() => Promise<void>) | undefined
  const env: Record<string, string> = {}
  if (usesEmbedded) {
    // The cluster is created with the credentials the developer's .env expects.
    const db = await startEmbeddedPostgres({ dir: '.data/pg', quiet: true, ...fromEnv, port })
    env.DATABASE_URI = db.connectionString
    // Local development must never migrate the production database, even when a
    // maintainer's .env also holds DATABASE_MIGRATION_URI.
    env.DATABASE_MIGRATION_URI = ''
    stop = db.stop
    process.stdout.write(`Embedded PostgreSQL ready on port ${db.port}\n`)
  }
  if (!fs.existsSync(path.resolve('.env'))) {
    process.stdout.write('No .env file found: copy .env.example to .env and set PAYLOAD_SECRET.\n')
  }

  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  process.stdout.write('Applying database migrations...\n')
  const migrateCode = await run(pnpm, ['run', '--silent', 'migrate'], env)
  if (migrateCode !== 0) {
    process.stderr.write('Migrations failed; see the error above.\n')
    await stop?.()
    process.exit(migrateCode)
  }

  const cleanup = async () => {
    await stop?.()
  }
  process.on('SIGINT', () => cleanup().finally(() => process.exit(0)))
  process.on('SIGTERM', () => cleanup().finally(() => process.exit(0)))

  const code = await run(pnpm, ['run', '--silent', 'dev:next'], env)
  await cleanup()
  process.exit(code)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
