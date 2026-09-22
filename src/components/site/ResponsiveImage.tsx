'use client'

import { useState } from 'react'

import type { PublicImage } from '@/lib/catalog/types'

import { SparkleIcon } from './Sparkles'

export type ImageLabels = { failed: string; retry: string }

type Props = {
  image: PublicImage
  sizes: string
  labels: ImageLabels
  priority?: boolean
  className?: string
  /** Only the Starlight mark when the photo fails (for thumbnails and other small frames). */
  compact?: boolean
}

/** Adds a retry marker so the browser fetches the image again instead of reusing a failure. */
function retried(url: string, attempt: number): string {
  if (attempt === 0) {
    return url
  }
  return `${url}${url.includes('?') ? '&' : '?'}retry=${attempt}`
}

/**
 * Plain <img> with pregenerated variants (spec section 11): width/height for layout
 * stability, srcset/sizes for responsive loading, lazy by default. When the photo cannot
 * be loaded (storage down, file gone, flaky connection) the same frame shows a Starlight
 * placeholder with a "try again" action instead of the browser's broken-image icon.
 */
export function ResponsiveImage({
  image,
  sizes,
  labels,
  priority = false,
  className = '',
  compact = false,
}: Props) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)

  if (failed) {
    const retry = () => {
      setFailed(false)
      setAttempt((n) => n + 1)
    }
    return (
      <div
        role="group"
        aria-label={labels.failed}
        title={compact ? labels.failed : undefined}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-2 p-3 text-center text-ink-muted"
      >
        <SparkleIcon
          className={compact ? 'h-5 w-5 text-accent-muted' : 'h-8 w-8 text-accent-muted'}
        />
        {compact ? null : (
          <>
            <p className="text-xs leading-snug sm:text-sm">{labels.failed}</p>
            {/* Above any link that overlays the frame (product cards), so it stays clickable. */}
            <button
              type="button"
              onClick={retry}
              className="btn-secondary relative z-10 px-3 py-1.5 text-xs"
            >
              {labels.retry}
            </button>
          </>
        )}
      </div>
    )
  }

  const srcSet = image.sources.map((s) => `${retried(s.url, attempt)} ${s.width}w`).join(', ')
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={attempt}
      // The page is server-rendered, so the browser may have given up on the image before
      // React attached onError; a finished image with no pixels is that case.
      ref={(node) => {
        if (node && node.complete && node.naturalWidth === 0) {
          setFailed(true)
        }
      }}
      src={retried(image.src, attempt)}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
