import type { CollectionConfig, FieldAccess } from 'payload'

import { isOwnerUser, ownerOnly, publishedOrOwner } from '@/access'
import { translatedField } from '@/fields/translated'
import { DEFAULT_LOCALE } from '@/i18n/config'
import {
  LIMITS,
  productAfterChange,
  productBeforeChange,
  productBeforeValidate,
} from '@/hooks/products'
import { MAX_IQD, isValidIqd } from '@/lib/catalog/dinar'
import { validateSlug } from '@/lib/slug'

/**
 * Internal (derived) fields are readable by the owner and by the server-side catalog
 * layer, which flags its Local API calls with `context.catalogRead`. They are never
 * serialized to anonymous REST clients.
 */
const internalRead: FieldAccess = ({ req }) =>
  isOwnerUser(req.user) || req.context?.catalogRead === true

const ownerOnlyField: FieldAccess = ({ req }) => isOwnerUser(req.user)

/**
 * Products (spec section 5): exactly six business fields — name, category, photos,
 * description, priceIqd and isAvailable — plus internal publication fields. Drafts are
 * private; only published records are public.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    group: 'Catalog',
    useAsTitle: 'adminTitle',
    defaultColumns: ['adminTitle', 'category', 'priceIqd', 'isAvailable', '_status', 'updatedAt'],
    listSearchableFields: ['adminTitle', 'slug'],
    description:
      'Save Draft keeps changes private. Publish makes the product public and requires the name and description in all three languages.',
    preview: (doc) => {
      const slug = typeof doc?.slug === 'string' ? doc.slug : ''
      return slug ? `/${DEFAULT_LOCALE}/products/${slug}?preview=1` : null
    },
  },
  access: {
    read: publishedOrOwner,
    readVersions: ownerOnly,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  versions: {
    drafts: {
      autosave: false,
      validate: false,
    },
    maxPerDoc: 10,
  },
  defaultSort: '-updatedAt',
  hooks: {
    beforeValidate: [productBeforeValidate],
    beforeChange: [productBeforeChange],
    afterChange: [productAfterChange],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Basic details',
          description:
            'All three languages are on this page. A draft can be saved with gaps; publishing needs the name and description in every language.',
          fields: [
            translatedField({
              name: 'name',
              label: 'Name',
              maxLength: LIMITS.name,
              layout: 'row',
              description: 'Product name in each language (1 to 160 characters).',
            }),
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'categories',
              required: true,
              filterOptions: () => ({ isActive: { equals: true } }),
              admin: { description: 'Exactly one active category.' },
            },
            translatedField({
              name: 'description',
              label: 'Description',
              type: 'textarea',
              maxLength: LIMITS.description,
              rows: 6,
              description:
                'Plain text describing the actual handmade item, in each language (1 to 5000 characters).',
            }),
          ],
        },
        {
          label: 'Photos',
          fields: [
            {
              name: 'photos',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              minRows: LIMITS.photosMin,
              maxRows: LIMITS.photosMax,
              admin: {
                description:
                  'Drag to reorder. The first image is the cover. Photos are shared by all three languages, so each image is uploaded once.',
              },
            },
          ],
        },
        {
          label: 'Price and availability',
          fields: [
            {
              name: 'priceIqd',
              type: 'number',
              label: 'Price (IQD)',
              required: true,
              min: 1,
              max: MAX_IQD,
              validate: (value: unknown) =>
                isValidIqd(value)
                  ? true
                  : 'Enter a positive whole Iraqi dinar amount without decimals (maximum 999,999,999).',
              admin: {
                description:
                  'One shared price in whole Iraqi dinars for all languages, e.g. 25000. Stored exactly as entered.',
                components: {
                  Field: '@/components/admin/PriceIqdField#PriceIqdField',
                  Cell: '@/components/admin/PriceIqdCell#PriceIqdCell',
                },
              },
            },
            {
              name: 'isAvailable',
              type: 'checkbox',
              label: 'Available',
              required: true,
              defaultValue: false,
              admin: {
                description:
                  'Available or Unavailable is a public label. Unavailable products stay visible; use Unpublish to hide a product.',
              },
            },
            {
              name: 'featured',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Show on the home page (up to eight featured products are displayed).',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      validate: validateSlug,
      admin: {
        position: 'sidebar',
        rtl: false,
        description:
          'Latin URL slug, shared by all languages. Filled automatically from the English name on first save; changing it after publishing keeps a redirect from the old address.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'First publication date (used for "Newest" sorting).',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { read: ownerOnlyField, update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    // Derived fields: written by hooks, never by clients (spec section 5).
    {
      // List/picker title: "English name · Kurdish name" (see adminTitleFrom).
      name: 'adminTitle',
      type: 'text',
      label: 'Title',
      index: true,
      access: { create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'searchText',
      type: 'text',
      index: true,
      access: { read: internalRead, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'normalizedName',
      type: 'text',
      index: true,
      access: { read: internalRead, create: () => false, update: () => false },
      admin: { hidden: true },
    },
  ],
}
