import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
  ValidationFieldError,
} from 'payload'
import { ValidationError } from 'payload'

import { LOCALES } from '@/i18n/config'
import { isValidIqd } from '@/lib/catalog/dinar'
import { LIMITS, LOCALE_LABELS } from '@/lib/catalog/publication'
import { buildNormalizedName, buildSearchText } from '@/lib/catalog/normalize'
import { isValidSlug } from '@/lib/slug'
import { deriveSlug } from '@/hooks/slugs'
import {
  type Translations,
  adminTitleFrom,
  mergeTranslations,
  missingLocales,
  translationValues,
  trimTranslations,
} from '@/hooks/localized'

// The rules the admin's live checklist evaluates in the browser (src/lib/catalog/publication.ts)
// are the same ones enforced here.
export { LIMITS, LOCALE_LABELS } from '@/lib/catalog/publication'

type AnyDoc = Record<string, unknown>

export function relationId(value: unknown): number | string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return typeof value === 'number' || typeof value === 'string' ? value : null
}

function relationIds(value: unknown): Array<number | string> {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(relationId).filter((v): v is number | string => v !== null)
}

/**
 * The complete product that WOULD be stored if this request succeeds: the latest saved
 * revision with the incoming data merged on top (translated groups merged per language).
 */
function mergedProduct(data: AnyDoc, originalDoc: AnyDoc | undefined) {
  const doc: AnyDoc = { ...(originalDoc ?? {}), ...data }
  const name = mergeTranslations(originalDoc?.name, data.name)
  const description = mergeTranslations(originalDoc?.description, data.description)
  return { doc, name, description }
}

/** Errors that prevent publication (spec section 5 "Publishing validation"). */
async function publicationErrors(args: {
  doc: AnyDoc
  name: Translations
  description: Translations
  req: PayloadRequest
}): Promise<ValidationFieldError[]> {
  const { doc, name, description, req } = args
  const errors: ValidationFieldError[] = []

  for (const locale of missingLocales(name, { maxLength: LIMITS.name })) {
    errors.push({
      path: `name.${locale}`,
      message: `Name is missing or too long in ${LOCALE_LABELS[locale]}.`,
    })
  }
  for (const locale of missingLocales(description, { maxLength: LIMITS.description })) {
    errors.push({
      path: `description.${locale}`,
      message: `Description is missing or too long in ${LOCALE_LABELS[locale]}.`,
    })
  }
  if (!isValidSlug(doc.slug)) {
    // Unreachable in practice: the address is generated before validation, with a
    // fallback when the English name has no Latin letters.
    errors.push({
      path: 'slug',
      message: 'The web address could not be generated. Save the product again.',
    })
  }

  const categoryId = relationId(doc.category)
  if (categoryId === null) {
    errors.push({ path: 'category', message: 'Choose exactly one active category.' })
  } else {
    const category = await req.payload.findByID({
      collection: 'categories',
      id: categoryId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!category) {
      errors.push({ path: 'category', message: 'The selected category no longer exists.' })
    } else if (!category.isActive) {
      errors.push({
        path: 'category',
        message: 'The selected category is inactive. Activate it or choose another category.',
      })
    }
  }

  const photoIds = relationIds(doc.photos)
  if (photoIds.length < LIMITS.photosMin || photoIds.length > LIMITS.photosMax) {
    errors.push({
      path: 'photos',
      message: `Add between ${LIMITS.photosMin} and ${LIMITS.photosMax} photos. The first photo is the cover.`,
    })
  } else {
    // Every photo must still exist. Image descriptions are optional: the site falls back
    // to the product name in the page's language (docs/decisions.md).
    const media = await req.payload.find({
      collection: 'media',
      where: { id: { in: photoIds } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const existing = new Set(media.docs.map((m) => String(m.id)))
    photoIds.forEach((photoId, index) => {
      if (!existing.has(String(photoId))) {
        errors.push({ path: 'photos', message: `Photo ${index + 1} no longer exists.` })
      }
    })
  }

  if (!isValidIqd(doc.priceIqd)) {
    errors.push({
      path: 'priceIqd',
      message: 'Enter a positive whole Iraqi dinar price (1 to 999,999,999).',
    })
  }
  if (typeof doc.isAvailable !== 'boolean') {
    errors.push({ path: 'isAvailable', message: 'Choose Available or Unavailable explicitly.' })
  }
  return errors
}

function englishName(data: AnyDoc, originalDoc: AnyDoc | undefined): string | null {
  const en = mergeTranslations(originalDoc?.name, data.name).en
  return typeof en === 'string' && en.trim() ? en.trim() : null
}

/**
 * beforeValidate: trims text, generates the web address (slug) and applies the defaults
 * of a new draft.
 *
 * The address follows the English name (numeric suffix when taken: product names need not
 * be unique) for as long as the product has never been published, so a typo fixed while
 * drafting fixes the address too. From the first publication on it is frozen, whatever the
 * name becomes, so links already shared keep working. Clients cannot set it.
 */
export const productBeforeValidate: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (!data) {
    return data
  }
  trimTranslations(data.name)
  trimTranslations(data.description, { multiline: true })

  // Drafts may be incomplete (no price yet) but never invalid: a fractional, negative,
  // non-finite or oversized amount is rejected even on Save Draft (spec section 5).
  if (data.priceIqd !== undefined && data.priceIqd !== null && !isValidIqd(data.priceIqd)) {
    throw new ValidationError({
      collection: 'products',
      errors: [
        {
          path: 'priceIqd',
          message: 'Enter a positive whole Iraqi dinar amount without decimals (1 to 999,999,999).',
        },
      ],
      req,
    })
  }

  // The stored address is the only input; whatever a client sent is ignored. (Payload
  // merges the stored document into `data` before this hook, and deleting the key would
  // null the column on a draft save, so the value is always set explicitly.)
  const storedSlug = typeof originalDoc?.slug === 'string' ? originalDoc.slug : null
  const slug = await deriveSlug({
    req,
    collection: 'products',
    englishName: englishName(data, originalDoc),
    currentSlug: storedSlug,
    excludeId: originalDoc?.id,
    frozen: Boolean(originalDoc?.publishedAt),
    // Anything but an explicit draft save may publish, so make sure an address exists.
    goingPublic: data._status !== 'draft',
    fallbackPrefix: 'item',
  })
  data.slug = slug ?? storedSlug

  if (operation === 'create') {
    if (data.featured === undefined) {
      data.featured = false
    }
    if (data.isAvailable === undefined) {
      // Unavailable until the owner deliberately chooses Available (spec section 5).
      data.isAvailable = false
    }
  }
  return data
}

/**
 * beforeChange: computes derived search fields from every translation, enforces the
 * publication contract and stamps publishedAt/updatedBy.
 */
export const productBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const merged = mergedProduct(data, originalDoc)

  data.adminTitle = adminTitleFrom(
    merged.name,
    typeof merged.doc.slug === 'string' ? merged.doc.slug : 'Untitled product',
  )
  data.normalizedName = buildNormalizedName(translationValues(merged.name))
  data.searchText = buildSearchText({
    names: translationValues(merged.name),
    descriptions: translationValues(merged.description),
  })

  if (req.user && req.user.collection === 'users') {
    data.updatedBy = req.user.id
  }

  const publishing =
    data._status === 'published' ||
    (data._status === undefined && originalDoc?._status === 'published')

  if (publishing) {
    const errors = await publicationErrors({ ...merged, req })
    if (errors.length > 0) {
      throw new ValidationError({ collection: 'products', errors, req })
    }
    if (!originalDoc?.publishedAt) {
      data.publishedAt = new Date().toISOString()
    }
  }

  return data
}

export { LOCALES }
