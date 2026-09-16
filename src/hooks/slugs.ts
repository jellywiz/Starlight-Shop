import { randomBytes } from 'node:crypto'

import type { PayloadRequest } from 'payload'

import { slugify } from '@/lib/slug'

/**
 * Web addresses (slugs) are generated, never edited (owner decision, docs/decisions.md):
 * derived from the English name while a record has not gone public yet, then frozen so
 * links already shared keep working. The field is hidden in the admin.
 */

/** A readable fallback address when the English name yields no Latin letters at all. */
export function fallbackSlug(prefix: string): string {
  return `${prefix}-${randomBytes(3).toString('hex')}`
}

/**
 * The address a save should store, or `undefined` to leave the stored one untouched.
 *
 * - `frozen`: the record has gone public before; the stored slug is kept whatever the
 *   client sent.
 * - Otherwise the English name decides: its slug (with a numeric suffix when taken), the
 *   current slug when the name has no Latin letters, or a random fallback when the record
 *   is going public right now and still has no address.
 */
export async function deriveSlug(args: {
  req: PayloadRequest
  collection: 'categories' | 'products'
  englishName: string | null
  currentSlug: unknown
  excludeId: number | string | undefined
  frozen: boolean
  goingPublic: boolean
  fallbackPrefix: string
}): Promise<string | undefined> {
  const { req, collection, englishName, currentSlug, excludeId, frozen, goingPublic } = args
  if (frozen) {
    return undefined
  }
  const current = typeof currentSlug === 'string' && currentSlug ? currentSlug : ''
  const base =
    (englishName ? slugify(englishName) : '') ||
    current ||
    (goingPublic ? fallbackSlug(args.fallbackPrefix) : '')
  if (!base) {
    return undefined
  }
  return uniqueSlug(req, collection, base, excludeId)
}

/** First free variant of `base`: base, base-2, base-3, … (the record itself is ignored). */
export async function uniqueSlug(
  req: PayloadRequest,
  collection: 'categories' | 'products',
  base: string,
  excludeId?: number | string,
): Promise<string> {
  let candidate = base
  for (let i = 2; i < 100; i += 1) {
    const clash = await req.payload.find({
      collection,
      where: {
        and: [
          { slug: { equals: candidate } },
          ...(excludeId !== undefined ? [{ id: { not_equals: excludeId } }] : []),
        ],
      },
      depth: 0,
      limit: 1,
      // Products: unpublished drafts hold addresses too.
      draft: collection === 'products',
      overrideAccess: true,
    })
    if (clash.totalDocs === 0) {
      return candidate
    }
    candidate = `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}
