import type { PayloadRequest } from 'payload'

/**
 * Lightweight, best-effort request throttle per server instance (spec section 10:
 * rate-limited requests return 429). Platform-level limits, where available, are the
 * real protection; this only smooths bursts from one client.
 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 120
const buckets = new Map<string, { count: number; reset: number }>()

export function throttled(req: PayloadRequest): boolean {
  const key =
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anonymous'
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (v.reset < now) {
          buckets.delete(k)
        }
      }
    }
    return false
  }
  bucket.count += 1
  return bucket.count > MAX_PER_WINDOW
}

export const NO_STORE = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

export function rateLimitedResponse(): Response {
  return Response.json(
    {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.',
      },
    },
    { status: 429, headers: { ...NO_STORE, 'Retry-After': '30' } },
  )
}

export function unavailableResponse(instagramUrl: string): Response {
  return Response.json(
    {
      error: {
        code: 'CATALOG_UNAVAILABLE',
        message: 'The catalog is temporarily unavailable. Please try again in a few minutes.',
        contact: { instagram: instagramUrl },
      },
    },
    { status: 503, headers: { ...NO_STORE, 'Retry-After': '120' } },
  )
}
