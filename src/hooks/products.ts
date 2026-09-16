import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
  ValidationFieldError,
} from 'payload'
import { ValidationError } from 'payload'

import { LOCALES, type Locale } from '@/i18n/config'
import { isValidIqd } from '@/lib/catalog/dinar'
import { buildNormalizedName, buildSearchText } from '@/lib/catalog/normalize'
import { isValidSlug, slugify } from '@/lib/slug'
import {
  type Translations,
  adminTitleFrom,
  mergeTranslations,
  missingLocales,
  translationValues,
  trimTranslations,
} from '@/hooks/localized'

export const LOCALE_LABELS: Record<Locale, string> = {
  ckb: 'Sorani Kurdish (ckb)',
  ar: 'Arabic (ar)',
  en: 'English (en)',
}

/** Field limits from the product data contract (spec section 5). */
export const LIMITS = {
  name: 160,
  description: 5000,
  photosMin: 1,
  photosMax: 8,
} as const

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
    errors.push({
      path: 'slug',
      message:
        'A Latin URL slug is required before publishing. It is filled automatically from the English name; enter one by hand if the English name has no Latin letters.',
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
 * beforeValidate: trims text, derives the slug from the English name the first time one
 * is available (with a numeric suffix when the slug is taken: product names need not be
 * unique) and never changes an existing slug automatically.
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
  if (typeof data.slug === 'string') {
    data.slug = data.slug.trim().toLowerCase()
    if (data.slug === '') {
      delete data.slug
    }
  }

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

  const currentSlug = data.slug ?? originalDoc?.slug
  if (!currentSlug) {
    const en = englishName(data, originalDoc)
    const candidate = en ? slugify(en) : ''
    if (candidate) {
      data.slug = await uniqueSlug(req, candidate, originalDoc?.id)
    }
  }

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

async function uniqueSlug(
  req: PayloadRequest,
  base: string,
  excludeId?: number | string,
): Promise<string> {
  let candidate = base
  for (let i = 2; i < 100; i += 1) {
    const clash = await req.payload.find({
      collection: 'products',
      where: {
        and: [
          { slug: { equals: candidate } },
          ...(excludeId !== undefined ? [{ id: { not_equals: excludeId } }] : []),
        ],
      },
      depth: 0,
      limit: 1,
      draft: true,
      overrideAccess: true,
    })
    if (clash.totalDocs === 0) {
      return candidate
    }
    candidate = `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}

/**
 * beforeChange: computes derived search fields from every translation, enforces the
 * publication contract, stamps publishedAt/updatedBy and remembers the currently
 * published slug so afterChange can create a redirect when it changes.
 */
export const productBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
  context,
}) => {
  const id = originalDoc?.id as number | string | undefined
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

  // Remember the slug that the public currently sees, for redirect creation.
  if (operation === 'update' && id !== undefined) {
    const published = await req.payload.findByID({
      collection: 'products',
      id,
      depth: 0,
      draft: false,
      overrideAccess: true,
      disableErrors: true,
    })
    context.previousPublishedSlug =
      published && published._status === 'published' ? published.slug : null
  }
  return data
}

/**
 * afterChange: when a published product's slug changes, keep a permanent redirect from
 * the old slug (spec sections 7 and 15). Redirect loops are prevented by removing any
 * redirect that points from the new slug.
 */
export const productAfterChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'update' || doc._status !== 'published') {
    return doc
  }
  const previousSlug = context.previousPublishedSlug
  if (typeof previousSlug !== 'string' || previousSlug === doc.slug || !doc.slug) {
    return doc
  }
  const { payload } = req
  await payload.delete({
    collection: 'redirects',
    where: { oldSlug: { equals: doc.slug } },
    overrideAccess: true,
    req,
  })
  const existing = await payload.find({
    collection: 'redirects',
    where: { oldSlug: { equals: previousSlug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  if (existing.totalDocs > 0) {
    await payload.update({
      collection: 'redirects',
      id: existing.docs[0].id,
      data: { product: doc.id },
      overrideAccess: true,
      req,
    })
  } else {
    await payload.create({
      collection: 'redirects',
      data: { oldSlug: previousSlug, product: doc.id },
      overrideAccess: true,
      req,
    })
  }
  return doc
}

export { LOCALES }
