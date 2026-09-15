/**
 * Controlled first-owner bootstrap (spec section 12). Run BEFORE exposing /admin:
 *
 *   OWNER_EMAIL=owner@example.com OWNER_PASSWORD='long random passphrase' pnpm owner:create
 *
 * Reads DATABASE_MIGRATION_URI (or DATABASE_URI) from .env. Refuses to run when an
 * account already exists unless --allow-additional is passed. Public registration stays
 * blocked at all times; only this script may create the first account.
 */
import './lib/load-env'

import config from '@payload-config'
import { getPayload } from 'payload'

import { readSecret } from './lib/prompt'

const MIN_PASSWORD_LENGTH = 12

async function main() {
  const email = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set OWNER_EMAIL to the owner’s private administrator email address.')
  }
  const password =
    process.env.OWNER_PASSWORD ?? (await readSecret('Owner password (input hidden): '))
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `The password must be at least ${MIN_PASSWORD_LENGTH} characters. Use a long, unique passphrase.`,
    )
  }

  const payload = await getPayload({ config })
  const existing = await payload.count({ collection: 'users', overrideAccess: true })
  if (existing.totalDocs > 0 && !process.argv.includes('--allow-additional')) {
    throw new Error(
      `An administrator already exists (${existing.totalDocs}). Pass --allow-additional to create another owner account.`,
    )
  }
  const duplicate = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  if (duplicate.totalDocs > 0) {
    throw new Error(
      `An account for ${email} already exists. Use pnpm owner:reset-password instead.`,
    )
  }

  await payload.create({
    collection: 'users',
    data: { email, password, role: 'owner' },
    overrideAccess: true,
    context: { allowFirstUser: true },
  })
  process.stdout.write(
    `Owner account created for ${email}. Sign in at ${process.env.SITE_URL ?? ''}/admin\n`,
  )
  process.exit(0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
