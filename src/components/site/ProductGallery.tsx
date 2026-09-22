'use client'

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import type { Dictionary } from '@/i18n/dictionary'
import { t } from '@/i18n/dictionary'
import type { PublicImage } from '@/lib/catalog/types'

import { ResponsiveImage } from './ResponsiveImage'

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const DOUBLE_TAP_ZOOM = 2.5
/** Horizontal movement (px) that counts as a swipe, provided it is mostly horizontal. */
const SWIPE_DISTANCE = 40
const DOUBLE_TAP_MS = 320

type Zoom = { scale: number; x: number; y: number }
type Point = { x: number; y: number }
type Size = { width: number; height: number }
const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 }

/** A swipe's direction as a step through the photos, honouring the page direction. */
function swipeStep(dx: number, rtl: boolean): 1 | -1 {
  // Swiping left (dx < 0) pulls the next photo in from the right in LTR; in RTL the next
  // photo sits on the left, so the gesture mirrors.
  const next: 1 | -1 = dx < 0 ? 1 : -1
  return rtl ? (-next as 1 | -1) : next
}

function isSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5
}

function isRtl(element: HTMLElement): boolean {
  return getComputedStyle(element).direction === 'rtl'
}

/** Keeps the zoomed image from being dragged out of view. */
function clampPan(zoom: Zoom, stage: Size): Zoom {
  const maxX = ((zoom.scale - 1) * stage.width) / 2
  const maxY = ((zoom.scale - 1) * stage.height) / 2
  return {
    scale: zoom.scale,
    x: Math.min(maxX, Math.max(-maxX, zoom.x)),
    y: Math.min(maxY, Math.max(-maxY, zoom.y)),
  }
}

/** Zooms so that `point` (relative to the stage centre) stays under the finger or cursor. */
function zoomAt(zoom: Zoom, requested: number, point: Point, stage: Size): Zoom {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requested))
  if (scale === 1) {
    return NO_ZOOM
  }
  const ratio = scale / zoom.scale
  return clampPan(
    { scale, x: point.x - (point.x - zoom.x) * ratio, y: point.y - (point.y - zoom.y) * ratio },
    stage,
  )
}

function sizeOf(element: HTMLElement | null): Size {
  const rect = element?.getBoundingClientRect()
  return { width: rect?.width ?? 1, height: rect?.height ?? 1 }
}

/** A pointer position relative to the centre of an element. */
function relativeTo(element: HTMLElement, clientX: number, clientY: number): Point {
  const rect = element.getBoundingClientRect()
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
}

const Chevron = ({ direction }: { direction: 'previous' | 'next' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-5 w-5 fill-none stroke-current stroke-2 rtl:-scale-x-100"
  >
    <path d={direction === 'previous' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </svg>
)

/**
 * Product gallery (spec section 2): main image, selectable thumbnails and an enlarged
 * view in a native <dialog> (keyboard operable, focus trapped, focus restored on close).
 * On a phone the main image and the enlarged view change photo with a horizontal swipe,
 * and the enlarged view zooms with a pinch, a double tap, the mouse wheel or the buttons,
 * then pans with a drag, so the details of a piece can be inspected up close.
 */
export function ProductGallery({ photos, dict }: { photos: PublicImage[]; dict: Dictionary }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM)
  const [dragging, setDragging] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const enlargeRef = useRef<HTMLButtonElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const total = photos.length
  const current = photos[index] ?? photos[0]
  const labels = { failed: dict.product.photoFailed, retry: dict.product.retryPhoto }

  const show = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total)
      setZoom(NO_ZOOM)
    },
    [total],
  )

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
      } else if (event.key === '+' || event.key === '=') {
        setZoom((z) => zoomAt(z, z.scale * 1.5, { x: 0, y: 0 }, sizeOf(stageRef.current)))
      } else if (event.key === '-') {
        setZoom((z) => zoomAt(z, z.scale / 1.5, { x: 0, y: 0 }, sizeOf(stageRef.current)))
      } else if (event.key === '0') {
        setZoom(NO_ZOOM)
      }
    }
    const onClose = () => {
      setZoom(NO_ZOOM)
      enlargeRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    dialog.addEventListener('close', onClose)
    return () => {
      document.removeEventListener('keydown', onKey)
      dialog.removeEventListener('close', onClose)
    }
  }, [index, show])

  // --- Swipe on the main image (one pointer, mostly horizontal) ---
  const mainSwipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const onMainPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (total > 1 && event.isPrimary) {
      mainSwipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    }
  }
  const onMainPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = mainSwipe.current
    mainSwipe.current = null
    if (start && start.id === event.pointerId) {
      const dx = event.clientX - start.x
      if (isSwipe(dx, event.clientY - start.y)) {
        show(index + swipeStep(dx, isRtl(event.currentTarget)))
      }
    }
  }

  // --- Pinch, drag, double tap and swipe in the enlarged view ---
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef({
    startZoom: NO_ZOOM,
    startDistance: 0,
    startCenter: { x: 0, y: 0 } as Point,
    moved: false,
    lastTap: 0,
  })

  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const list = Array.from(pointers.current.values())
    const g = gesture.current
    g.startZoom = zoom
    g.moved = false
    if (list.length === 2) {
      g.startDistance = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y)
      g.startCenter = { x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 }
    } else {
      g.startDistance = 0
      g.startCenter = { x: event.clientX, y: event.clientY }
    }
    setDragging(true)
  }

  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) {
      return
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const list = Array.from(pointers.current.values())
    const g = gesture.current
    const stage = event.currentTarget
    if (list.length === 2 && g.startDistance > 0) {
      // Pinch: scale around the fingers' midpoint, following it as they move.
      const distance = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y)
      const center = { x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 }
      const origin = relativeTo(stage, g.startCenter.x, g.startCenter.y)
      const scaled = zoomAt(
        g.startZoom,
        (g.startZoom.scale * distance) / g.startDistance,
        origin,
        sizeOf(stage),
      )
      g.moved = true
      setZoom(
        clampPan(
          {
            scale: scaled.scale,
            x: scaled.x + (center.x - g.startCenter.x),
            y: scaled.y + (center.y - g.startCenter.y),
          },
          sizeOf(stage),
        ),
      )
    } else if (list.length === 1 && g.startZoom.scale > 1) {
      // Drag to pan while zoomed in.
      const dx = event.clientX - g.startCenter.x
      const dy = event.clientY - g.startCenter.y
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        g.moved = true
      }
      setZoom(
        clampPan({ ...g.startZoom, x: g.startZoom.x + dx, y: g.startZoom.y + dy }, sizeOf(stage)),
      )
    }
  }

  const onStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointers.current.get(event.pointerId)
    pointers.current.delete(event.pointerId)
    const g = gesture.current
    if (pointers.current.size > 0) {
      // One finger lifted mid-pinch: carry on from here with the other one.
      g.startZoom = zoom
      g.startDistance = 0
      const remaining = Array.from(pointers.current.values())[0]
      g.startCenter = { x: remaining.x, y: remaining.y }
      return
    }
    setDragging(false)
    if (!start) {
      return
    }
    const dx = event.clientX - g.startCenter.x
    const dy = event.clientY - g.startCenter.y
    if (g.startZoom.scale === 1 && !g.moved && total > 1 && isSwipe(dx, dy)) {
      show(index + swipeStep(dx, isRtl(event.currentTarget)))
      g.lastTap = 0
      return
    }
    if (!g.moved && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = event.timeStamp
      if (now - g.lastTap < DOUBLE_TAP_MS) {
        // Double tap: zoom in on the tapped spot, or back out.
        const point = relativeTo(event.currentTarget, event.clientX, event.clientY)
        const stage = sizeOf(event.currentTarget)
        setZoom((z) => (z.scale > 1 ? NO_ZOOM : zoomAt(z, DOUBLE_TAP_ZOOM, point, stage)))
        g.lastTap = 0
      } else {
        g.lastTap = now
      }
    }
  }

  const onStageWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const point = relativeTo(event.currentTarget, event.clientX, event.clientY)
    const stage = sizeOf(event.currentTarget)
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
    setZoom((z) => zoomAt(z, z.scale * factor, point, stage))
  }

  if (!current) {
    return (
      <div className="card flex aspect-square items-center justify-center bg-white text-ink-muted">
        {dict.product.noPhoto}
      </div>
    )
  }

  const zoomed = zoom.scale > 1
  const smallButton = 'btn-secondary min-h-11 min-w-11 px-3 py-1.5 text-sm'

  return (
    <section aria-label={dict.product.galleryLabel} className="flex flex-col gap-3">
      <div className="card relative overflow-hidden bg-white">
        <div
          className="aspect-square w-full touch-pan-y select-none sm:aspect-[4/3]"
          onPointerDown={onMainPointerDown}
          onPointerUp={onMainPointerUp}
          onPointerCancel={() => {
            mainSwipe.current = null
          }}
        >
          <ResponsiveImage
            image={current}
            sizes="(min-width: 1024px) 50vw, 100vw"
            labels={labels}
            priority
            className="pointer-events-none h-full w-full object-contain p-6"
          />
        </div>
        {total > 1 ? (
          <p
            className="pointer-events-none absolute start-3 top-3 rounded-full bg-plum-950/70 px-2.5 py-1 text-xs font-semibold text-white"
            aria-live="polite"
          >
            {t(dict.product.photoCounter, { index: index + 1, total })}
          </p>
        ) : null}
        <button
          ref={enlargeRef}
          type="button"
          className="btn-secondary absolute end-3 bottom-3 px-3 py-1.5 text-xs"
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
                className={`block h-16 w-16 overflow-hidden rounded-xl bg-white ring-2 ring-inset ${i === index ? 'ring-accent' : 'ring-line hover:ring-accent-muted'}`}
              >
                <ResponsiveImage
                  image={{ ...photo, alt: '' }}
                  sizes="64px"
                  labels={labels}
                  compact
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
        className="m-auto w-[min(96vw,64rem)] max-w-none rounded-2xl bg-surface p-3 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {dict.product.enlargedView} —{' '}
            {t(dict.product.photoCounter, { index: index + 1, total })}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-surface-2"
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
              className="btn-secondary hidden px-2 sm:inline-flex"
              onClick={() => show(index - 1)}
              aria-label={dict.product.previousPhoto}
            >
              <Chevron direction="previous" />
            </button>
          ) : null}
          <div
            ref={stageRef}
            className="flex h-[70vh] min-h-48 flex-1 touch-none select-none items-center justify-center overflow-hidden rounded-xl bg-white"
            style={{ cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerCancel={onStagePointerUp}
            onWheel={onStageWheel}
            data-zoom={zoom.scale.toFixed(2)}
          >
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
                transition: dragging ? 'none' : 'transform 120ms ease-out',
              }}
            >
              <ResponsiveImage
                image={current}
                sizes="96vw"
                labels={labels}
                priority
                className="pointer-events-none max-h-full w-auto max-w-full object-contain"
              />
            </div>
          </div>
          {total > 1 ? (
            <button
              type="button"
              className="btn-secondary hidden px-2 sm:inline-flex"
              onClick={() => show(index + 1)}
              aria-label={dict.product.nextPhoto}
            >
              <Chevron direction="next" />
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={smallButton}
              onClick={() =>
                setZoom((z) => zoomAt(z, z.scale / 1.5, { x: 0, y: 0 }, sizeOf(stageRef.current)))
              }
              disabled={!zoomed}
              aria-label={dict.product.zoomOut}
            >
              −
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() =>
                setZoom((z) => zoomAt(z, z.scale * 1.5, { x: 0, y: 0 }, sizeOf(stageRef.current)))
              }
              disabled={zoom.scale >= MAX_ZOOM}
              aria-label={dict.product.zoomIn}
            >
              +
            </button>
            {zoomed ? (
              <button type="button" className={smallButton} onClick={() => setZoom(NO_ZOOM)}>
                {dict.product.zoomReset}
              </button>
            ) : null}
            {total > 1 ? (
              <span className="flex gap-2 sm:hidden">
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => show(index - 1)}
                  aria-label={dict.product.previousPhoto}
                >
                  <Chevron direction="previous" />
                </button>
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => show(index + 1)}
                  aria-label={dict.product.nextPhoto}
                >
                  <Chevron direction="next" />
                </button>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-ink-muted">{dict.product.zoomHint}</p>
        </div>
      </dialog>
    </section>
  )
}
