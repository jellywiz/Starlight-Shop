/**
 * Maintainer-run password reset (spec section 12). There is no email provider in the
 * free baseline, so recovery happens here, with database access, never by editing
 * password hashes by hand:
 *
 *   OWNER_EMAIL=owner@example.com pnpm owner:reset-password
 *
 * Prompts for the new password (or reads OWNER_PASSWORD). Existing sessions are ended.
 */
import './lib/load-env'

import config from '@payload-config'
import { getPayload } from 'payload'

import { readSecret } from './lib/prompt'

const MIN_PASSWORD_LENGTH = 12

async function main() {
  const email = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase()
  if (!email) {
    throw new Error('Set OWNER_EMAIL to the account to reset.')
  }
  const password = process.env.OWNER_PASSWORD ?? (await readSecret('New password (input hidden): '))
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  const user = found.docs[0]
  if (!user) {
    throw new Error(`No account found for ${email}.`)
  }
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { password, sessions: [], loginAttempts: 0, lockUntil: null },
    overrideAccess: true,
  })
  process.stdout.write(`Password updated for ${email}. All sessions were signed out.\n`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
