import { createHmac } from 'node:crypto'

import type { Payload, PayloadRequest } from 'payload'

/**
 * Sign-in throttle per network (IP address), shared by every server instance through the
 * `login-throttle` table (src/collections/LoginThrottle.ts).
 *
 * Payload's own lockout counts failures per ACCOUNT, so anyone who knows the owner's email
 * could keep her locked out by typing wrong passwords. Here the limit is per network: a
 * stranger's attempts block only the stranger's network, and the owner signs in from hers.
 * Payload's account lockout stays as a high backstop (src/collections/Users.ts).
 *
 * Every attempt counts; a successful sign-in clears its network's count, so the owner
 * mistyping a few times is never a problem.
 */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const MAX_LOGIN_ATTEMPTS_PER_NETWORK = 10

export const LOGIN_THROTTLE_SLUG = 'login-throttle'

/** Netlify sets x-nf-client-connection-ip itself; x-forwarded-for is the fallback elsewhere. */
export function clientAddress(headers: Headers): string {
  return (
    headers.get('x-nf-client-connection-ip')?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/** Keyed hash of the address: raw IP addresses are never stored. */
export function networkKey(address: string, secret: string): string {
  return createHmac('sha256', secret).update(`login-throttle:${address}`).digest('hex').slice(0, 40)
}

export type ThrottleRecord = { attempts: number; windowStart: string }

export type ThrottleDecision =
  { blocked: true; retryAfterMs: number } | { blocked: false; next: ThrottleRecord }

/** Pure decision: block, or record this attempt (new window when the old one expired). */
export function decide(record: ThrottleRecord | null, now: number): ThrottleDecision {
  const start = record ? Date.parse(record.windowStart) : NaN
  const windowOpen = Number.isFinite(start) && now - start < LOGIN_WINDOW_MS
  if (!record || !windowOpen) {
    return { blocked: false, next: { attempts: 1, windowStart: new Date(now).toISOString() } }
  }
  if (record.attempts >= MAX_LOGIN_ATTEMPTS_PER_NETWORK) {
    return { blocked: true, retryAfterMs: start + LOGIN_WINDOW_MS - now }
  }
  return {
    blocked: false,
    next: { attempts: record.attempts + 1, windowStart: record.windowStart },
  }
}

/**
 * Called before every sign-in. Returns the wait in ms when this network is blocked,
 * otherwise records the attempt and returns null. Uses its own database calls (no `req`)
 * so the count survives the failed sign-in's rolled-back transaction.
 */
export async function registerLoginAttempt(req: PayloadRequest): Promise<number | null> {
  const payload = req.payload
  const key = networkKey(clientAddress(req.headers), payload.secret)
  const now = Date.now()
  const found = await payload.find({
    collection: LOGIN_THROTTLE_SLUG,
    where: { key: { equals: key } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const existing = found.docs[0]
  const decision = decide(
    existing ? { attempts: existing.attempts, windowStart: existing.windowStart } : null,
    now,
  )
  if (decision.blocked) {
    return decision.retryAfterMs
  }
  if (existing) {
    await payload.update({
      collection: LOGIN_THROTTLE_SLUG,
      id: existing.id,
      data: decision.next,
      depth: 0,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: LOGIN_THROTTLE_SLUG,
      data: { key, ...decision.next },
      depth: 0,
      overrideAccess: true,
    })
    await pruneExpired(payload, now)
  }
  return null
}

/** A successful sign-in clears its network's count. */
export async function clearLoginAttempts(req: PayloadRequest): Promise<void> {
  const payload = req.payload
  await payload.delete({
    collection: LOGIN_THROTTLE_SLUG,
    where: { key: { equals: networkKey(clientAddress(req.headers), payload.secret) } },
    overrideAccess: true,
  })
}

/** Keeps the table tiny: rows whose window ended are no longer needed. */
async function pruneExpired(payload: Payload, now: number): Promise<void> {
  await payload.delete({
    collection: LOGIN_THROTTLE_SLUG,
    where: { windowStart: { less_than: new Date(now - LOGIN_WINDOW_MS).toISOString() } },
    overrideAccess: true,
  })
}

export function blockedMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000))
  return `Too many sign-in attempts from this network. Please wait ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`
}
