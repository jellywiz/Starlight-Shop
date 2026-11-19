import { describe, expect, it } from 'vitest'

import {
  LOGIN_WINDOW_MS,
  MAX_LOGIN_ATTEMPTS_PER_NETWORK,
  blockedMessage,
  clientAddress,
  decide,
  networkKey,
} from '@/lib/login-throttle'

const NOW = Date.parse('2026-11-19T10:00:00.000Z')

describe('login throttle per network', () => {
  it('starts a new window for an unknown network', () => {
    expect(decide(null, NOW)).toEqual({
      blocked: false,
      next: { attempts: 1, windowStart: new Date(NOW).toISOString() },
    })
  })

  it('counts attempts inside the window and blocks after the limit', () => {
    const windowStart = new Date(NOW - 60_000).toISOString()
    expect(decide({ attempts: MAX_LOGIN_ATTEMPTS_PER_NETWORK - 1, windowStart }, NOW)).toEqual({
      blocked: false,
      next: { attempts: MAX_LOGIN_ATTEMPTS_PER_NETWORK, windowStart },
    })
    expect(decide({ attempts: MAX_LOGIN_ATTEMPTS_PER_NETWORK, windowStart }, NOW)).toEqual({
      blocked: true,
      retryAfterMs: LOGIN_WINDOW_MS - 60_000,
    })
  })

  it('opens a fresh window once the old one has ended', () => {
    const windowStart = new Date(NOW - LOGIN_WINDOW_MS).toISOString()
    expect(decide({ attempts: 99, windowStart }, NOW)).toEqual({
      blocked: false,
      next: { attempts: 1, windowStart: new Date(NOW).toISOString() },
    })
  })

  it('prefers the address Netlify sets over x-forwarded-for', () => {
    const headers = new Headers({
      'x-nf-client-connection-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
    })
    expect(clientAddress(headers)).toBe('203.0.113.7')
    expect(clientAddress(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe(
      '198.51.100.1',
    )
    expect(clientAddress(new Headers())).toBe('unknown')
  })

  it('never stores the raw address', () => {
    const key = networkKey('203.0.113.7', 'secret')
    expect(key).toMatch(/^[0-9a-f]{40}$/)
    expect(key).not.toContain('203')
    expect(networkKey('203.0.113.7', 'other-secret')).not.toBe(key)
  })

  it('tells the visitor how long to wait', () => {
    expect(blockedMessage(14 * 60_000 + 1)).toBe(
      'Too many sign-in attempts from this network. Please wait 15 minutes and try again.',
    )
    expect(blockedMessage(10_000)).toMatch(/wait 1 minute and/)
  })
})
