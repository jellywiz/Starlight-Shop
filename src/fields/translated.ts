import type { Field, TextField, TextareaField } from 'payload'

import { LOCALES, LOCALE_META, type Locale } from '@/i18n/config'

/**
 * Translated content is stored as one group with a subfield per language, so the owner
 * fills every language on the same form and saves once (owner decision, see
 * docs/decisions.md). Payload's locale switcher is not used. Completeness is enforced by
 * the collection hooks (publishing / activation), which name the missing language, so the
 * inputs themselves are not marked required and drafts can be saved with gaps.
 */

export const LANGUAGE_LABELS: Record<Locale, string> = {
  ckb: 'کوردی (Sorani Kurdish)',
  ar: 'العربية (Arabic)',
  en: 'English',
}

export type TranslatedFieldOptions = {
  name: string
  label: string
  /** Single-line text (default) or a multi-line textarea. */
  type?: 'text' | 'textarea'
  maxLength: number
  description?: string
  /** Textarea height. */
  rows?: number
  /** `row` puts the three inputs side by side; `stack` (default) lists them vertically. */
  layout?: 'row' | 'stack'
}

/** A group field named `options.name` containing `ckb`, `ar` and `en` inputs. */
export function translatedField(options: TranslatedFieldOptions): Field {
  const inputs: (TextField | TextareaField)[] = LOCALES.map((code) => {
    const rtl = LOCALE_META[code].dir === 'rtl'
    const base = {
      name: code,
      label: LANGUAGE_LABELS[code],
      maxLength: options.maxLength,
    }
    if (options.type === 'textarea') {
      return {
        ...base,
        type: 'textarea',
        admin: { rtl, rows: options.rows ?? 6 },
      } satisfies TextareaField
    }
    return {
      ...base,
      type: 'text',
      admin: { rtl, ...(options.layout === 'row' ? { width: '33.33%' } : {}) },
    } satisfies TextField
  })
  return {
    name: options.name,
    type: 'group',
    label: options.label,
    admin: options.description ? { description: options.description } : undefined,
    fields: options.layout === 'row' ? [{ type: 'row', fields: inputs }] : inputs,
  }
}
