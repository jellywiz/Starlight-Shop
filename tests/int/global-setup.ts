/**
 * Starts a throwaway embedded PostgreSQL cluster for integration tests and applies the
 * committed migrations, so the tests also prove the migrations work on an empty database.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { TestProject } from 'vitest/node'

import { startEmbeddedPostgres } from '../../scripts/lib/embedded-db'

export default async function setup(project: TestProject) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starlight-test-pg-'))
  const db = await startEmbeddedPostgres({ dir, port: 0, database: 'starlight_test', quiet: true })

  Object.assign(process.env, { NODE_ENV: 'test' })
  process.env.DATABASE_URI = db.connectionString
  // Uploads go to a throwaway folder so tests never touch the developer's ./media files.
  process.env.MEDIA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'starlight-test-media-'))
  process.env.PAYLOAD_SECRET = 'test-secret-test-secret-test-secret-test-secret'
  process.env.SITE_URL = 'http://localhost:3000'
  process.env.ENABLE_PASSWORD_RESET = 'false'
  delete process.env.S3_BUCKET
  delete process.env.DATABASE_MIGRATION_URI

  project.provide('databaseUri', db.connectionString)
  project.provide('mediaDir', process.env.MEDIA_DIR)

  // Apply the committed migrations through the Payload CLI (same path as production).
  execFileSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', '--silent', 'migrate'], {
    env: { ...process.env, DATABASE_URI: db.connectionString, PAYLOAD_DB_MODE: 'migration' },
    stdio: 'inherit',
  })

  const mediaDir = process.env.MEDIA_DIR
  return async () => {
    await db.stop()
    fs.rmSync(dir, { recursive: true, force: true })
    if (mediaDir) {
      fs.rmSync(mediaDir, { recursive: true, force: true })
    }
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUri: string
    mediaDir: string
  }
}
