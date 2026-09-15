import type { Product } from '@/payload-types'

import { splitSegments } from './normalize'

/**
 * Deterministic relevance ranking (spec section 3):
 *   0 exact normalized product name (in any language),
 *   1 name prefix,
 *   2 other name match (the query appears inside a name),
 *   3 description match (every token is present, but not inside a name).
 * Ties break on newest first publication, then the stable internal id descending.
 */
export function relevanceRank(
  doc: Pick<Product, 'normalizedName'>,
  normalizedQuery: string,
): number {
  if (!normalizedQuery) {
    return 3
  }
  const names = splitSegments(doc.normalizedName)
  if (names.some((name) => name === normalizedQuery)) {
    return 0
  }
  if (names.some((name) => name.startsWith(normalizedQuery))) {
    return 1
  }
  if (names.some((name) => name.includes(normalizedQuery))) {
    return 2
  }
  return 3
}

function timeOf(value: string | null | undefined): number {
  if (!value) {
    return 0
  }
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

export function sortByRelevance<T extends Pick<Product, 'id' | 'normalizedName' | 'publishedAt'>>(
  docs: T[],
  normalizedQuery: string,
): T[] {
  return docs
    .map((doc, index) => ({ doc, index, rank: relevanceRank(doc, normalizedQuery) }))
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank
      }
      const t = timeOf(b.doc.publishedAt) - timeOf(a.doc.publishedAt)
      if (t !== 0) {
        return t
      }
      return b.doc.id - a.doc.id
    })
    .map((entry) => entry.doc)
}
