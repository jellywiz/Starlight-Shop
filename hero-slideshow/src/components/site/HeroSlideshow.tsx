'use client'

import Link from 'next/link'
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type { Locale } from '@/i18n/config'
import { type Dictionary, t } from '@/i18n/dictionary'
import { HERO_SLIDE_MS, type HeroPiece } from '@/lib/site/hero'

import { Price } from './Price'
import { ResponsiveImage } from './ResponsiveImage'

const SWIPE_DISTANCE = 40

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches
const noPreference = () => false

const Chevron = ({ direction }: { direction: 'previous' | 'next' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-4 w-4 fill-none stroke-current stroke-2 rtl:-scale-x-100"
  >
    <path d={direction === 'previous' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </svg>
)

const PlayPause = ({ playing }: { playing: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
    {playing ? (
      <>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </>
    ) : (
      <path d="M8 5.5v13l10-6.5z" />
    )}
  </svg>
)

/**
 * The home page's hero tile: every featured piece with a photo, one at a time, changing
 * on its own every few seconds and on demand (arrows, dots, a swipe on a phone). Auto
 * play pauses while the tile is hovered or focused, stops when the visitor asks it to
 * or prefers reduced motion, and the first piece is in the server-rendered HTML so the
 * hero never starts empty. Only the current and the next photo are in the page at any
 * time, so eight featured pieces do not mean eight downloads up front.
 */
export function HeroSlideshow({
  pieces,
  locale,
  dict,
  sizes,
}: {
  pieces: HeroPiece[]
  locale: Locale
  dict: Dictionary
  sizes: string
}) {
  const total = pieces.length
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    noPreference,
  )
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const swiped = useRef(false)

  const current = pieces[Math.min(index, total - 1)]
  const rotating = playing && !paused && !reducedMotion && total > 1

  useEffect(() => {
    if (!rotating) {
      return
    }
    // Recreated whenever the index changes, so a manual change restarts the countdown.
    const timer = setInterval(() => setIndex((i) => (i + 1) % total), HERO_SLIDE_MS)
    return () => clearInterval(timer)
  }, [rotating, total, index])

  if (!current) {
    return null
  }

  const step = (delta: 1 | -1) => setIndex((i) => (i + delta + total) % total)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.isPrimary) {
      swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
      swiped.current = false
    }
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current
    swipe.current = null
    if (!start || start.id !== event.pointerId) {
      return
    }
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
      const next: 1 | -1 = dx < 0 ? 1 : -1
      step(rtl ? (-next as 1 | -1) : next)
    }
  }
  const onLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    // A swipe that ends on the photo must not open the piece it landed on.
    if (swiped.current) {
      swiped.current = false
      event.preventDefault()
    }
  }

  const href = (piece: HeroPiece) => `/${locale}/products/${piece.slug}`
  // The next piece is mounted (hidden) so its photo is already loading when its turn comes.
  const mounted = total > 1 ? [index, (index + 1) % total] : [index]

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={dict.home.featuredHeading}
      data-testid="hero-slideshow"
      data-index={index}
      data-rotating={rotating ? 'true' : 'false'}
      className="hero-piece mx-auto w-full max-w-[300px] rounded-[1.75rem] bg-surface p-3 shadow-card-hover"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <div
        className="relative touch-pan-y select-none overflow-hidden rounded-[1.25rem] bg-white"
        aria-live={rotating ? 'off' : 'polite'}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null
        }}
        // A mouse drag across the link overlay would otherwise start a native link drag
        // and cancel the pointer sequence before it can become a swipe.
        onDragStart={(event) => event.preventDefault()}
      >
        <div className="relative aspect-[4/3] md:aspect-square">
          {mounted.map((i) => {
            const piece = pieces[i]
            const active = i === index
            return (
              <div
                key={piece.id}
                role="group"
                aria-roledescription="slide"
                aria-label={t(dict.home.slideCounter, { index: i + 1, total }, locale)}
                aria-hidden={!active}
                className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
                  active ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                <ResponsiveImage
                  image={piece.cover}
                  sizes={sizes}
                  labels={{ failed: dict.product.photoFailed, retry: dict.product.retryPhoto }}
                  priority={i === 0 || active}
                  className="h-full w-full object-contain p-4"
                />
              </div>
            )
          })}
        </div>
        <Link
          href={href(current)}
          onClick={onLinkClick}
          draggable={false}
          className="absolute inset-0"
          tabIndex={-1}
          aria-hidden="true"
        />
        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={dict.home.previousPiece}
              className="hero-slide-arrow absolute start-2 top-1/2 -translate-y-1/2"
            >
              <Chevron direction="previous" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={dict.home.nextPiece}
              className="hero-slide-arrow absolute end-2 top-1/2 -translate-y-1/2"
            >
              <Chevron direction="next" />
            </button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {pieces.map((piece, i) => (
                <button
                  key={piece.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t(dict.home.slideLabel, { index: i + 1, total }, locale)}
                  aria-current={i === index ? 'true' : undefined}
                  className={`hero-slide-dot ${i === index ? 'hero-slide-dot--active' : ''}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <div className="px-2 pb-2 pt-4">
        <p className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-accent">
          <span>{dict.home.featuredHeading}</span>
          {total > 1 ? (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={!playing}
              aria-label={playing ? dict.home.pauseSlideshow : dict.home.playSlideshow}
              title={playing ? dict.home.pauseSlideshow : dict.home.playSlideshow}
              className="hero-slide-toggle"
            >
              <PlayPause playing={playing} />
            </button>
          ) : null}
        </p>
        <Link href={href(current)} className="font-semibold text-heading hover:underline">
          {current.name}
        </Link>
        <Price amount={current.priceIqd} dict={dict} className="mt-2 block text-sm text-ink-soft" />
      </div>
    </div>
  )
}
