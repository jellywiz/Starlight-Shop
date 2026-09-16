import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { activeOrOwner, ownerOnly } from '@/access'
import { translatedField } from '@/fields/translated'
import {
  adminTitleFrom,
  mergeTranslations,
  missingLocales,
  trimTranslations,
} from '@/hooks/localized'
import { LOCALE_LABELS } from '@/hooks/products'
import { assertCategoryDeactivatable, assertCategoryDeletable } from '@/hooks/references'
import { slugify, validateSlug } from '@/lib/slug'

export const CATEGORY_NAME_MAX = 80

/**
 * Flat product categories (spec section 6). The name is translated (all three languages
 * on one form); the slug is shared and used in filter URLs. Categories are owner-managed,
 * never a hard-coded list. Only active categories are readable publicly; the catalog
 * additionally shows only categories that have at least one published product.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    group: 'Catalog',
    useAsTitle: 'adminTitle',
    defaultColumns: ['adminTitle', 'slug', 'sortOrder', 'isActive', 'updatedAt'],
    listSearchableFields: ['adminTitle', 'slug'],
    description:
      'Flat list of categories, e.g. Necklaces, Bracelets, Rings. A category needs all three names before it can be activated. Deactivate instead of deleting when products still use it.',
  },
  access: {
    read: activeOrOwner,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  defaultSort: 'sortOrder',
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) {
          return data
        }
        trimTranslations(data.name)
        if (typeof data.slug === 'string') {
          data.slug = data.slug.trim().toLowerCase()
          if (data.slug === '') {
            delete data.slug
          }
        }
        // Derive the slug from the English name the first time it is available.
        if (!data.slug && !originalDoc?.slug) {
          const en = mergeTranslations(originalDoc?.name, data.name).en
          const candidate = typeof en === 'string' ? slugify(en) : ''
          if (candidate) {
            data.slug = candidate
          }
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const id = originalDoc?.id
        const names = mergeTranslations(originalDoc?.name, data.name)
        data.adminTitle = adminTitleFrom(
          names,
          data.slug ?? originalDoc?.slug ?? 'Untitled category',
        )

        if (data.isActive === true) {
          // Activation requires every translation (spec section 6 "Integrity rules").
          const missing = missingLocales(names, { maxLength: CATEGORY_NAME_MAX })
          if (missing.length > 0) {
            // A plain message (not a field error) so the admin toast shows the reason.
            throw new APIError(
              `Cannot activate this category: the name is missing in ${missing.map((l) => LOCALE_LABELS[l]).join(', ')}. Fill in the missing name(s) above, or untick Active to save it inactive.`,
              400,
              undefined,
              true,
            )
          }
        }
        if (id !== undefined && data.isActive === false && originalDoc?.isActive !== false) {
          await assertCategoryDeactivatable(req, id)
        }
        if (req.user && req.user.collection === 'users') {
          data.updatedBy = req.user.id
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        await assertCategoryDeletable(req, id)
      },
    ],
  },
  fields: [
    translatedField({
      name: 'name',
      label: 'Name',
      maxLength: CATEGORY_NAME_MAX,
      description:
        'The category name in each language (1 to 80 characters). All three are needed before the category can be activated.',
    }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
      admin: {
        position: 'sidebar',
        rtl: false,
        description:
          'Latin slug used in catalog URLs, e.g. necklaces. Filled automatically from the English name.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers appear first.' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Inactive categories are hidden from the public site and cannot be chosen for products. Activation requires all three names.',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { read: ({ req }) => Boolean(req.user), update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      // List/picker title: "English name · Kurdish name" (see adminTitleFrom).
      name: 'adminTitle',
      type: 'text',
      label: 'Title',
      index: true,
      access: { create: () => false, update: () => false },
      admin: { hidden: true },
    },
  ],
}
