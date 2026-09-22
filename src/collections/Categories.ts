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
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { LOCALE_LABELS } from '@/hooks/products'
import { assertCategoryDeactivatable, assertCategoryDeletable } from '@/hooks/references'
import { deriveSlug } from '@/hooks/slugs'
import { SIMPLE_DOCUMENT_VIEW } from '@/lib/admin'
import { validateSlug } from '@/lib/slug'

export const CATEGORY_NAME_MAX = 80

/**
 * Flat product categories (spec section 6). The name is translated (all three languages
 * on one form); the slug used in filter URLs is generated from the English name and
 * frozen at the first activation (hidden from the admin). Categories are owner-managed,
 * never a hard-coded list. Only active categories are readable publicly; the catalog
 * additionally shows only categories that have at least one published product.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    ...SIMPLE_DOCUMENT_VIEW,
    group: 'Catalog',
    useAsTitle: 'adminTitle',
    defaultColumns: ['adminTitle', 'isActive', 'sortOrder'],
    listSearchableFields: ['adminTitle'],
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
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) {
          return data
        }
        trimTranslations(data.name)
        // The filter-URL address follows the English name until the category is first
        // activated, then stays fixed. Whatever a client sent is ignored: the stored
        // address is the only input (see the same note in src/hooks/products.ts).
        const storedSlug = typeof originalDoc?.slug === 'string' ? originalDoc.slug : null
        const en = mergeTranslations(originalDoc?.name, data.name).en
        const slug = await deriveSlug({
          req,
          collection: 'categories',
          englishName: typeof en === 'string' && en.trim() ? en.trim() : null,
          currentSlug: storedSlug,
          excludeId: originalDoc?.id,
          frozen: Boolean(originalDoc?.activatedAt),
          goingPublic: data.isActive === true,
          fallbackPrefix: 'category',
        })
        data.slug = slug ?? storedSlug
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
        if (data.isActive === true && !originalDoc?.activatedAt) {
          // Freezes the address (see beforeValidate).
          data.activatedAt = new Date().toISOString()
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
      // Generated from the English name, frozen at first activation (src/hooks/slugs.ts).
      // Client values are discarded by the beforeValidate hook, which runs before field
      // access control (a field-level `access` would strip the generated value too).
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      validate: validateSlug,
      admin: { hidden: true },
    },
    {
      name: 'activatedAt',
      type: 'date',
      access: { create: () => false, update: () => false },
      admin: { hidden: true },
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
      admin: { hidden: true },
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
