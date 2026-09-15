import type { CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { activeOrOwner, ownerOnly } from '@/access'
import { mergeLocalizedField, missingLocales, readAllLocales } from '@/hooks/localized'
import { LOCALE_LABELS, requestLocale } from '@/hooks/products'
import { assertCategoryDeactivatable, assertCategoryDeletable } from '@/hooks/references'
import { slugify, validateSlug } from '@/lib/slug'

/**
 * Flat product categories (spec section 6). Names are localized; the slug is shared and
 * used in filter URLs. Categories are owner-managed, never a hard-coded list. Only active
 * categories are readable publicly; the catalog additionally shows only categories that
 * have at least one published product.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    group: 'Catalog',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'sortOrder', 'isActive', 'updatedAt'],
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
      ({ data, originalDoc, req }) => {
        if (!data) {
          return data
        }
        if (typeof data.name === 'string') {
          data.name = data.name.trim().replace(/\s+/g, ' ')
        }
        if (typeof data.slug === 'string') {
          data.slug = data.slug.trim().toLowerCase()
          if (data.slug === '') {
            delete data.slug
          }
        }
        // Derive the slug from the English name the first time it is available.
        if (
          !data.slug &&
          !originalDoc?.slug &&
          typeof data.name === 'string' &&
          requestLocale(req) === 'en'
        ) {
          const candidate = slugify(data.name)
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
        const activating = data.isActive === true
        if (activating) {
          // Activation requires every translation (spec section 6 "Integrity rules").
          const existing = id !== undefined ? await readAllLocales(req, 'categories', id) : null
          const names = mergeLocalizedField(existing?.name, data.name, requestLocale(req))
          const missing = missingLocales(names, { maxLength: 80 })
          if (missing.length > 0) {
            throw new ValidationError({
              collection: 'categories',
              errors: [
                {
                  path: 'isActive',
                  message: `Enter the category name in ${missing.map((l) => LOCALE_LABELS[l]).join(', ')} before activating it (or save it inactive).`,
                },
              ],
              req,
            })
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
    {
      name: 'name',
      type: 'text',
      localized: true,
      required: true,
      maxLength: 80,
      admin: { description: 'Category name in the language selected at the top of the page.' },
    },
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
          'Latin slug used in catalog URLs, e.g. necklaces. Filled automatically when the English name is entered first.',
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
  ],
}
