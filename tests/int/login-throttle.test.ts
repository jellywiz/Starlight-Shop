import { beforeAll, describe, expect, it } from 'vitest'

import { MAX_LOGIN_ATTEMPTS_PER_NETWORK } from '@/lib/login-throttle'

import { createOwner, expectFailure, resetDatabase, testPayload } from './helpers'

const EMAIL = 'owner@example.com'
const PASSWORD = 'Owner-password-1'

function fromNetwork(ip: string) {
  return { headers: new Headers({ 'x-nf-client-connection-ip': ip }) }
}

async function login(ip: string, password: string) {
  const payload = await testPayload()
  return payload.login({
    collection: 'users',
    data: { email: EMAIL, password },
    req: fromNetwork(ip),
  })
}

describe('sign-in throttle per network (P1-1)', () => {
  beforeAll(async () => {
    const payload = await testPayload()
    await resetDatabase(payload)
    await createOwner(payload, EMAIL, PASSWORD)
  })

  it('blocks a network after too many attempts, without locking the owner out elsewhere', async () => {
    const attacker = '203.0.113.66'
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS_PER_NETWORK; i += 1) {
      const message = await expectFailure(() => login(attacker, 'wrong-password-123'))
      expect(message).not.toMatch(/too many sign-in attempts/i)
    }
    // The attacker's network is now blocked, even with the right password …
    expect(await expectFailure(() => login(attacker, PASSWORD))).toMatch(
      /too many sign-in attempts from this network/i,
    )
    // … but the account is not locked: the owner signs in from her own network.
    const result = await login('198.51.100.20', PASSWORD)
    expect(result.user?.email).toBe(EMAIL)
  })

  it('a successful sign-in clears the count for that network', async () => {
    const owner = '198.51.100.30'
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS_PER_NETWORK - 1; i += 1) {
      await expectFailure(() => login(owner, 'typo-password-123'))
    }
    expect((await login(owner, PASSWORD)).user?.email).toBe(EMAIL)
    // Count restarted: more mistakes are allowed again before any block.
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS_PER_NETWORK - 1; i += 1) {
      const message = await expectFailure(() => login(owner, 'typo-password-123'))
      expect(message).not.toMatch(/too many sign-in attempts/i)
    }
    expect((await login(owner, PASSWORD)).user?.email).toBe(EMAIL)
  })

  it('keeps the throttle table closed to API callers', async () => {
    const payload = await testPayload()
    await expect(
      payload.find({ collection: 'login-throttle', overrideAccess: false }),
    ).rejects.toThrow()
  })
})
