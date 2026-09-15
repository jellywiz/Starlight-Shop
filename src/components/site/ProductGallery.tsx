'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

import type { Dictionary } from '@/i18n/dictionary'
import { t } from '@/i18n/dictionary'
import type { PublicImage } from '@/lib/catalog/types'

import { ResponsiveImage } from './ResponsiveImage'

/**
 * Product gallery (spec section 2): main image, selectable thumbnails and an enlarged
 * view in a native <dialog> (keyboard operable, focus trapped, focus restored on close).
 */
export function ProductGallery({ photos, dict }: { photos: PublicImage[]; dict: Dictionary }) {
  const [index, setIndex] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const enlargeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const total = photos.length
  const current = photos[index] ?? photos[0]

  const show = useCallback((next: number) => setIndex(((next % total) + total) % total), [total])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (!dialog.open) {
        return
      }
      if (event.key === 'ArrowRight') {
        show(index + 1)
      } else if (event.key === 'ArrowLeft') {
        show(index - 1)
      }
    }
    const onClose = () => enlargeRef.current?.focus()
    document.addEventListener('keydown', onKey)
    dialog.addEventListener('close', onClose)
    return () => {
      document.removeEventListener('keydown', onKey)
      dialog.removeEventListener('close', onClose)
    }
  }, [index, show])

  if (!current) {
    return (
      <div className="card flex aspect-square items-center justify-center bg-white text-ink-muted">
        {dict.product.noPhoto}
      </div>
    )
  }

  return (
    <section aria-label={dict.product.galleryLabel} className="flex flex-col gap-3">
      <div className="card relative overflow-hidden bg-white">
        <div className="aspect-square w-full sm:aspect-[4/3]">
          <ResponsiveImage
            image={current}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="h-full w-full object-contain p-6"
          />
        </div>
        <button
          ref={enlargeRef}
          type="button"
          className="btn-secondary absolute bottom-3 end-3 px-3 py-1.5 text-xs"
          onClick={() => dialogRef.current?.showModal()}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-none stroke-current stroke-2"
          >
            <path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" />
          </svg>
          {dict.product.enlarge}
        </button>
      </div>
      {total > 1 ? (
        <ul className="flex flex-wrap gap-2" role="list">
          {photos.map((photo, i) => (
            <li key={photo.src}>
              <button
                type="button"
                onClick={() => show(i)}
                aria-pressed={i === index}
                aria-label={t(dict.product.thumbnailLabel, { index: i + 1, total })}
                className={`block h-16 w-16 overflow-hidden rounded-xl bg-white ring-2 ring-inset ${i === index ? 'ring-plum-700' : 'ring-plum-700/10 hover:ring-plum-400'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.sources[0]?.url ?? photo.src}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(96vw,64rem)] max-w-none rounded-2xl bg-white p-3 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {dict.product.enlargedView} —{' '}
            {t(dict.product.photoCounter, { index: index + 1, total })}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white"
            onClick={() => dialogRef.current?.close()}
          >
            <span className="sr-only">{dict.product.closeEnlarged}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6 fill-none stroke-current stroke-2"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {total > 1 ? (
            <button
              type="button"
              className="btn-secondary px-2"
              onClick={() => show(index - 1)}
              aria-label={dict.product.previousPhoto}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current stroke-2 rtl:-scale-x-100"
              >
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>
          ) : null}
          <div className="flex max-h-[75vh] flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              className="max-h-[75vh] w-auto max-w-full object-contain"
            />
          </div>
          {total > 1 ? (
            <button
              type="button"
              className="btn-secondary px-2"
              onClick={() => show(index + 1)}
              aria-label={dict.product.nextPhoto}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-none stroke-current stroke-2 rtl:-scale-x-100"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          ) : null}
        </div>
      </dialog>
    </section>
  )
}
