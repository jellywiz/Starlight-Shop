import type { CSSProperties } from 'react'

/**
 * Decorative four-point "sparkle" stars, echoing the stars in the Starlight logo. Purely
 * visual: hidden from assistive technology, no pointer events, gentle twinkle that is
 * disabled entirely under `prefers-reduced-motion` (see globals.css). Positions are
 * generated from a fixed seed so server and client markup always match.
 */

/** Small deterministic PRNG (mulberry32) so layouts are stable between renders. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SPARKLE_PATH =
  'M12 0c.6 6.6 4.8 10.8 12 12-7.2 1.2-11.4 5.4-12 12-.6-6.6-4.8-10.8-12-12 7.2-1.2 11.4-5.4 12-12Z'

export function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path d={SPARKLE_PATH} fill="currentColor" />
    </svg>
  )
}

type Props = {
  /** Number of stars. */
  count?: number
  /** Seed so different sections get different, but stable, arrangements. */
  seed?: number
  /** Tailwind colour class applied to the stars, e.g. "text-star" or "text-plum-300". */
  className?: string
  /** Size range in pixels. */
  minSize?: number
  maxSize?: number
  /**
   * Keep the top inline-start area free (where headings and buttons sit, in both text
   * directions) when true.
   */
  avoidTopStart?: boolean
}

export function Sparkles({
  count = 18,
  seed = 7,
  className = 'text-star',
  minSize = 6,
  maxSize = 18,
  avoidTopStart = false,
}: Props) {
  const random = seeded(seed)
  const stars: { style: CSSProperties; key: number }[] = []
  let attempts = 0
  while (stars.length < count && attempts < count * 4) {
    attempts += 1
    const start = random() * 100
    const top = random() * 100
    if (avoidTopStart && top < 78 && start < 58) {
      continue
    }
    const size = minSize + random() * (maxSize - minSize)
    const delay = -(random() * 3.2)
    const duration = 2.6 + random() * 2.2
    stars.push({
      key: stars.length,
      style: {
        // Logical inset so the arrangement mirrors correctly in RTL layouts.
        insetInlineStart: `${start.toFixed(2)}%`,
        top: `${top.toFixed(2)}%`,
        width: `${size.toFixed(1)}px`,
        height: `${size.toFixed(1)}px`,
        animationDelay: `${delay.toFixed(2)}s`,
        animationDuration: `${duration.toFixed(2)}s`,
      },
    })
  }
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {stars.map((star) => (
        <svg key={star.key} viewBox="0 0 24 24" className="sparkle" style={star.style}>
          <path d={SPARKLE_PATH} fill="currentColor" />
        </svg>
      ))}
    </div>
  )
}
