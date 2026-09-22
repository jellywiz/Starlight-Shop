import type { CollectionConfig, FieldAccess } from 'payload'

import { isOwnerUser, ownerOnly, publishedOrOwner } from '@/access'
import { translatedField } from '@/fields/translated'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { LIMITS, productBeforeChange, productBeforeValidate } from '@/hooks/products'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { SIMPLE_DOCUMENT_VIEW } from '@/lib/admin'
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
    ...SIMPLE_DOCUMENT_VIEW,
    group: 'Catalog',
    useAsTitle: 'adminTitle',
    defaultColumns: ['adminTitle', 'priceIqd', '_status', 'isAvailable', 'category'],
    listSearchableFields: ['adminTitle'],
    description:
      'Save Draft keeps a product private. Publish puts it on the website; that needs the name and description in all three languages, at least one photo and a price.',
    preview: (doc) => {
      const slug = typeof doc?.slug === 'string' ? doc.slug : ''
      // A separate, never-cached route (src/app/(site)/[locale]/products/[slug]/preview).
      return slug ? `/${DEFAULT_LOCALE}/products/${slug}/preview` : null
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
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    // Three sections on one page (no tabs), so nothing is hidden on a phone.
    {
      type: 'collapsible',
      label: 'Basic details',
      admin: { initCollapsed: false },
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
          rows: 5,
          description:
            'Plain text describing the actual handmade item, in each language (1 to 5000 characters).',
        }),
      ],
    },
    {
      type: 'collapsible',
      label: 'Photos',
      admin: { initCollapsed: false },
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
      type: 'collapsible',
      label: 'Price and availability',
      admin: { initCollapsed: false },
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
    {
      // Web address, shared by all languages: generated from the English name while the
      // product is unpublished, frozen from the first publication (src/hooks/slugs.ts).
      // Client values are discarded by the beforeValidate hook.
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      validate: validateSlug,
      admin: { hidden: true },
    },
    {
      // First publication date ("Newest" sorting); set by the hooks, not shown.
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { read: ownerOnlyField, update: () => false },
      admin: { hidden: true },
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
