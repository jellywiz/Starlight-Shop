'use client'

import { useField } from '@payloadcms/ui'
import React, { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react'

import { type PreparedPhoto, formatBytes, isPreparableImage, preparePhoto } from '@/lib/photo-prep'
import {
  getUploadProgress,
  installUploadProgress,
  subscribeUploadProgress,
} from '@/lib/upload-progress'

const IDLE_PROGRESS = { active: false, loaded: 0, total: 0 }
const idleProgress = () => IDLE_PROGRESS

type Outcome =
  | { source: File; kind: 'preparing'; progress: number }
  | { source: File; kind: 'ready'; result: PreparedPhoto }
  | { source: File; kind: 'unchanged' }
  | { source: File; kind: 'failed'; message: string }

/**
 * Shown under the file picker of the Photos form (and inside the product form's upload
 * drawer): a preview of the chosen photo, what it is reduced to before it is sent, and a
 * progress bar while it uploads. Reduction happens in the browser (src/lib/photo-prep.ts);
 * the server validates the result as it always did.
 */
export function PhotoPrep() {
  const { value, setValue } = useField<File | null>({ path: 'file' })
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Mirror of `outcome` for the effect below, which must not re-run on every update.
  const latest = useRef<Outcome | null>(null)
  // The preview shows the photo as chosen; its URL lives until the next photo or unmount.
  const preview = useRef<string | null>(null)
  const upload = useSyncExternalStore(subscribeUploadProgress, getUploadProgress, idleProgress)
  // The form hands out a new setter on every render (notably inside the upload drawer);
  // an effect event keeps the preparation effect from restarting because of it.
  const replaceFile = useEffectEvent((next: File) => setValue(next))

  useEffect(() => {
    installUploadProgress()
    return () => {
      if (preview.current) {
        URL.revokeObjectURL(preview.current)
        preview.current = null
      }
    }
  }, [])

  const file = value instanceof File ? value : null

  useEffect(() => {
    if (!file) {
      return
    }
    const done = latest.current
    // Already handled: the chosen photo, or the reduced copy that replaced it. (A run that
    // was interrupted — React re-running effects in development — starts again.)
    if (
      done &&
      done.kind !== 'preparing' &&
      (done.source === file || (done.kind === 'ready' && done.result.file === file))
    ) {
      return
    }
    if (preview.current) {
      URL.revokeObjectURL(preview.current)
    }
    const url = URL.createObjectURL(file)
    preview.current = url
    let cancelled = false
    const finish = (next: Outcome) => {
      if (!cancelled) {
        latest.current = next
        setPreviewUrl(url)
        setOutcome(next)
      }
    }
    if (!isPreparableImage(file)) {
      finish({ source: file, kind: 'unchanged' })
    } else {
      preparePhoto(file, {
        onProgress: (progress) => finish({ source: file, kind: 'preparing', progress }),
      })
        .then((result) => {
          if (cancelled) {
            return
          }
          if (result.changed) {
            finish({ source: file, kind: 'ready', result })
            // The reduced copy replaces the chosen file in the form; it is what gets sent.
            replaceFile(result.file)
          } else {
            finish({ source: file, kind: 'unchanged' })
          }
        })
        .catch((error: unknown) => {
          // The original goes up as chosen; the server will say what is wrong with it.
          finish({
            source: file,
            kind: 'failed',
            message: error instanceof Error ? error.message : 'The photo could not be prepared',
          })
        })
    }
    return () => {
      cancelled = true
    }
  }, [file])

  if (!file || !outcome) {
    return null
  }

  const uploadFraction = upload.total > 0 ? upload.loaded / upload.total : null
  const preparing = outcome.kind === 'preparing'

  return (
    <div
      className={`sl-photo-prep${outcome.kind === 'failed' ? ' sl-photo-prep--warning' : ''}`}
      role="status"
      aria-live="polite"
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sl-photo-prep__preview" src={previewUrl} alt="" />
      ) : (
        <span className="sl-photo-prep__preview" />
      )}
      <div>
        {upload.active ? (
          <>
            <p className="sl-photo-prep__title">
              Uploading{uploadFraction !== null ? ` ${Math.round(uploadFraction * 100)}%` : '…'}
            </p>
            <p className="sl-photo-prep__detail">
              {uploadFraction !== null
                ? `${formatBytes(upload.loaded)} of ${formatBytes(upload.total)}`
                : 'Sending the photo…'}
            </p>
            <div className="sl-photo-prep__bar">
              <div
                className={`sl-photo-prep__bar-fill${uploadFraction === null ? ' sl-photo-prep__bar-fill--busy' : ''}`}
                style={{ width: `${Math.round((uploadFraction ?? 0) * 100)}%` }}
              />
            </div>
          </>
        ) : preparing ? (
          <>
            <p className="sl-photo-prep__title">Preparing the photo…</p>
            <p className="sl-photo-prep__detail">
              Reducing {formatBytes(outcome.source.size)} for a quick upload.
            </p>
            <div className="sl-photo-prep__bar">
              <div
                className="sl-photo-prep__bar-fill"
                style={{ width: `${Math.round(outcome.progress * 100)}%` }}
              />
            </div>
          </>
        ) : outcome.kind === 'ready' ? (
          <>
            <p className="sl-photo-prep__title">
              Ready to upload — {formatBytes(outcome.result.file.size)}
            </p>
            <p className="sl-photo-prep__detail">
              Reduced from {outcome.result.original.width} × {outcome.result.original.height} (
              {formatBytes(outcome.result.original.bytes)}) to {outcome.result.width} ×{' '}
              {outcome.result.height}. The website never shows photos larger than this.
            </p>
          </>
        ) : outcome.kind === 'unchanged' ? (
          <>
            <p className="sl-photo-prep__title">Ready to upload — {formatBytes(file.size)}</p>
            <p className="sl-photo-prep__detail">This photo is already a good size.</p>
          </>
        ) : (
          <>
            <p className="sl-photo-prep__title">Could not reduce this photo here</p>
            <p className="sl-photo-prep__detail">
              {outcome.message}. It will be uploaded as it is; if it is too large the server will
              say so.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
