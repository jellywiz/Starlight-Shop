import { describe, expect, it } from 'vitest'

import { buildNormalizedName, normalizeForSearch } from '@/lib/catalog/normalize'
import { relevanceRank, sortByRelevance } from '@/lib/catalog/ranking'

const doc = (id: number, names: string[], publishedAt = '2026-01-01T00:00:00.000Z') => ({
  id,
  normalizedName: buildNormalizedName(names),
  publishedAt,
})

describe('relevance ranking (spec section 3)', () => {
  it('ranks exact name, then prefix, then other name match, then description', () => {
    const q = normalizeForSearch('Star necklace')
    expect(relevanceRank(doc(1, ['Star necklace', 'ملوانکەی ئەستێرە']), q)).toBe(0)
    expect(relevanceRank(doc(2, ['Star necklace with moon']), q)).toBe(1)
    expect(relevanceRank(doc(3, ['Silver star necklace']), q)).toBe(2)
    expect(relevanceRank(doc(4, ['Moon ring']), q)).toBe(3)
  })

  it('matches exact names in any language', () => {
    const q = normalizeForSearch('كاميرا')
    expect(relevanceRank(doc(1, ['Something', 'کامیرا']), q)).toBe(0)
  })

  it('sorts by rank, then newest publication, then id descending', () => {
    const q = normalizeForSearch('ring')
    const sorted = sortByRelevance(
      [
        doc(1, ['Ring'], '2026-01-01T00:00:00.000Z'),
        doc(2, ['Ring'], '2026-02-01T00:00:00.000Z'),
        doc(3, ['Ring of stars']),
        doc(4, ['Twist ring']),
        doc(5, ['Ring'], '2026-02-01T00:00:00.000Z'),
      ],
      q,
    )
    expect(sorted.map((d) => d.id)).toEqual([5, 2, 1, 3, 4])
  })
})
