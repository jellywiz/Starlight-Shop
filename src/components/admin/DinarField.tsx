'use client'

import type { NumberFieldClientProps } from 'payload'
import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import React, { useCallback, useState } from 'react'

import { formatIqdAmount, parseIqd } from '@/lib/catalog/dinar'

/**
 * Admin input for whole Iraqi dinar amounts. The owner types digits such as 25000 (or
 * 25,000, or Arabic/Kurdish keyboard digits); the form stores the integer exactly.
 * Fractions, negatives and overflow are rejected here and again on the server.
 */
export function DinarField(
  props: NumberFieldClientProps & {
    allowZero: boolean
    defaultLabel: string
    zeroHint?: string
  },
) {
  const { field, path: pathFromProps, readOnly, allowZero, defaultLabel, zeroHint } = props
  const { value, setValue, showError, errorMessage, path } = useField<number | null>({
    path: pathFromProps,
  })
  const [text, setText] = useState<string>(() => (typeof value === 'number' ? String(value) : ''))
  const [localError, setLocalError] = useState<string | null>(null)
  const [syncedValue, setSyncedValue] = useState<number | null | undefined>(value)

  // Keep the text in sync when the form value changes from outside (e.g. version restore).
  // Derived-state adjustment during render, as recommended by React instead of an effect.
  if (value !== syncedValue) {
    setSyncedValue(value)
    const parsed = parseIqd(text, { allowZero })
    if (typeof value === 'number') {
      if (!parsed.ok || parsed.amount !== value) {
        setText(String(value))
      }
    } else if (text !== '' && parsed.ok) {
      setText('')
    }
  }

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value
      setText(next)
      if (next.trim() === '') {
        setLocalError(null)
        setValue(null)
        return
      }
      const parsed = parseIqd(next, { allowZero })
      if (parsed.ok) {
        setLocalError(null)
        setValue(parsed.amount)
      } else {
        setLocalError(
          parsed.reason === 'negative'
            ? 'The amount cannot be negative.'
            : parsed.reason === 'fraction'
              ? 'Enter whole dinars only, without decimals.'
              : parsed.reason === 'too_large'
                ? 'The maximum amount is 999,999,999.'
                : parsed.reason === 'zero'
                  ? 'The price must be greater than zero.'
                  : 'Enter digits only, e.g. 25000.',
        )
        setValue(null)
      }
    },
    [allowZero, setValue],
  )

  const inputId = `field-${path.replace(/\./g, '__')}`

  return (
    <div className="field-type number dinar-field">
      <FieldLabel
        htmlFor={inputId}
        label={field.label ?? defaultLabel}
        required={field.required}
        path={path}
      />
      <div className="dinar-field__input">
        <span aria-hidden="true" className="dinar-field__currency">
          IQD
        </span>
        <input
          id={inputId}
          name={path}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          placeholder="25000"
          value={text}
          onChange={onChange}
          disabled={readOnly}
          aria-invalid={showError || Boolean(localError)}
          aria-describedby={`${inputId}-description`}
        />
      </div>
      {localError ? (
        <div className="field-error dinar-field__error" role="alert">
          {localError}
        </div>
      ) : (
        <FieldError path={path} showError={showError} message={errorMessage} />
      )}
      <FieldDescription
        path={path}
        description={
          typeof field.admin?.description === 'string' ? field.admin.description : undefined
        }
      />
      <div id={`${inputId}-description`} className="dinar-field__stored">
        {typeof value === 'number'
          ? value === 0 && zeroHint
            ? zeroHint
            : `Shown on the website as IQD ${formatIqdAmount(value)}`
          : 'No amount stored yet'}
      </div>
    </div>
  )
}
