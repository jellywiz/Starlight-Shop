'use client'

import { useFormFields } from '@payloadcms/ui'
import React from 'react'

import { publicationChecklist } from '@/lib/catalog/publication'

const Tick = () => (
  <svg
    className="sl-checklist__icon"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 10.5 3.2 3L15 6.5" />
  </svg>
)

const Dot = () => (
  <svg
    className="sl-checklist__icon"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="10" cy="10" r="6" />
  </svg>
)

/**
 * Live "what is missing before publishing" list at the top of the product form. It reads
 * the form as the owner types, so nothing is a surprise when Publish is pressed; the
 * server applies the same rules again (plus the checks only the database can make).
 */
export function PublishChecklist() {
  const values = useFormFields(([fields]) => ({
    name: {
      ckb: fields['name.ckb']?.value,
      ar: fields['name.ar']?.value,
      en: fields['name.en']?.value,
    },
    description: {
      ckb: fields['description.ckb']?.value,
      ar: fields['description.ar']?.value,
      en: fields['description.en']?.value,
    },
    category: fields.category?.value,
    photos: fields.photos?.value,
    priceIqd: fields.priceIqd?.value,
    isAvailable: fields.isAvailable?.value,
    status: fields._status?.value,
  }))
  const checks = publicationChecklist(values)
  const missing = checks.filter((check) => !check.ok)
  const ready = missing.length === 0
  const published = values.status === 'published'

  const title = ready
    ? published
      ? 'Complete — publishing will update the website'
      : 'Ready to publish'
    : `${missing.length} ${missing.length === 1 ? 'thing' : 'things'} to fill in before publishing`

  return (
    <section
      className={`sl-checklist ${ready ? 'sl-checklist--ready' : 'sl-checklist--missing'}`}
      aria-label="Publishing checklist"
    >
      <p className="sl-checklist__title" role="status" aria-live="polite">
        {title}
      </p>
      <ul className="sl-checklist__items">
        {checks.map((check) => (
          <li
            key={check.key}
            className={`sl-checklist__item ${check.ok ? 'sl-checklist__item--ok' : 'sl-checklist__item--missing'}`}
          >
            {check.ok ? <Tick /> : <Dot />}
            <span>
              {check.label}
              {check.missing ? (
                <span className="sl-checklist__missing"> — {check.missing}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {ready ? null : (
        <p className="sl-checklist__hint">
          You can Save Draft at any time; Publish needs every item above.
        </p>
      )}
    </section>
  )
}
