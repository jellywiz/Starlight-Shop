import { inject } from 'vitest'

// Workers inherit the env from global setup; `inject` is the explicit fallback.
Object.assign(process.env, { NODE_ENV: 'test' })
process.env.DATABASE_URI = inject('databaseUri')
process.env.MEDIA_DIR = inject('mediaDir')
process.env.PAYLOAD_SECRET ??= 'test-secret-test-secret-test-secret-test-secret'
process.env.SITE_URL ??= 'http://localhost:3000'
process.env.ENABLE_PASSWORD_RESET = 'false'
delete process.env.S3_BUCKET
delete process.env.DATABASE_MIGRATION_URI
