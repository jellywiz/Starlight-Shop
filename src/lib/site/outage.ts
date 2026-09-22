import { createHmac, timingSafeEqual } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

import { after } from 'next/server'

import { payloadSecret, siteUrl } from '@/lib/env'

/**
 * Keeping outage renders out of the cache.
 *
 * The product, About and Contact pages are cached (ISR). A cached route cannot opt out
 * per request: every API that would do so — `connection()`, `revalidatePath()`, even
 * from `after()` — is rejected during such a render ("Dynamic server usage"), and a
 * thrown error ends in a bare "Internal Server Error". So a render made while the
 * database is unavailable is sent normally and, once the response is out, the page asks
 * the site's own `/site-cache/drop` route to invalidate that path (a route handler may
 * call `revalidatePath`). The next visitor triggers a fresh render; nothing from an
 * outage is served for longer than one response. The request is signed with the
 * application secret so nobody else can make the site re-render pages on demand, and it
 * is sent with Node's own HTTP client because Next's `fetch` is tracked too.
 */

export const DROP_ROUTE = '/site-cache/drop'

/** Only the cached public routes can be dropped. */
const DROPPABLE = /^\/(ckb|ar|en)\/(about|contact|products\/[a-z0-9]+(?:-[a-z0-9]+)*)$/

export function isDroppablePath(path: string): boolean {
  return DROPPABLE.test(path)
}

export function signDropRequest(path: string): string {
  return createHmac('sha256', payloadSecret()).update(path).digest('hex')
}

export function verifyDropRequest(path: string, signature: string): boolean {
  const expected = Buffer.from(signDropRequest(path), 'hex')
  const given = Buffer.from(/^[0-9a-f]{64}$/.test(signature) ? signature : '', 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

function post(url: URL, body: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest
    const req = request(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
      },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode ?? 0))
      },
    )
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('timed out')))
    req.end(body)
  })
}

/** Drops the cached copy of `path` as soon as the current response has been sent. */
export function dropFromCacheAfterResponse(path: string): void {
  after(async () => {
    try {
      const status = await post(
        new URL(DROP_ROUTE, siteUrl()),
        JSON.stringify({ path, signature: signDropRequest(path) }),
      )
      if (status !== 204) {
        console.error(`[site] could not drop ${path} from the cache: HTTP ${status}`)
      }
    } catch (error) {
      console.error(`[site] could not drop ${path} from the cache: ${String(error)}`)
    }
  })
}
