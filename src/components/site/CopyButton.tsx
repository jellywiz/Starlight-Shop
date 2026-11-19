'use client'

import { useId, useState } from 'react'

/**
 * Copies a value to the clipboard. When clipboard access is unavailable or denied, the
 * value is revealed in a selectable read-only field instead (spec section 8).
 *
 * `iconOnly` shows just the icon (a tick once copied); the label stays the button's
 * accessible name and its tooltip.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  className = 'btn-secondary',
  iconOnly = false,
}: {
  value: string
  label: string
  copiedLabel: string
  failedLabel: string
  className?: string
  iconOnly?: boolean
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const fallbackId = useId()
  const text = state === 'copied' ? copiedLabel : label
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={className}
        title={iconOnly ? text : undefined}
        aria-describedby={state === 'failed' ? fallbackId : undefined}
        onClick={async () => {
          try {
            if (!navigator.clipboard?.writeText) {
              throw new Error('clipboard unavailable')
            }
            await navigator.clipboard.writeText(value)
            setState('copied')
            setTimeout(() => setState('idle'), 2500)
          } catch {
            setState('failed')
          }
        }}
      >
        {iconOnly && state === 'copied' ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current stroke-2"
          >
            <path d="m5 12 5 5L20 7" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current stroke-2"
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
          </svg>
        )}
        {iconOnly ? <span className="sr-only">{text}</span> : text}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? copiedLabel : ''}
      </span>
      {state === 'failed' ? (
        <div id={fallbackId} className="text-sm">
          <p className="text-ink-soft">{failedLabel}</p>
          <input
            type="text"
            readOnly
            value={value}
            dir="ltr"
            className="input mt-1 select-all text-sm"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  )
}
