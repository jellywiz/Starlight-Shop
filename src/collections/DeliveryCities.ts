import type { CollectionConfig } from 'payload'
import { APIError, ValidationError } from 'payload'

import { activeOrOwner, ownerOnly } from '@/access'
import { translatedField } from '@/fields/translated'
import {
  type Translations,
  adminTitleFrom,
  mergeTranslations,
  missingLocales,
  trimTranslations,
} from '@/hooks/localized'
import { LOCALE_LABELS } from '@/hooks/products'
import { LOCALES } from '@/i18n/config'
import { MAX_IQD, isValidIqd } from '@/lib/catalog/dinar'
import { normalizeForSearch } from '@/lib/catalog/normalize'

export const CITY_NAME_MAX = 100

/**
 * Delivery cities (spec sections 6 and 8): one saved whole-dinar fee per city, shown on
 * the home page independently of products. Only active cities are public. A city can be
 * saved incomplete while inactive; activation requires all three names and a valid fee,
 * and a zero fee must be confirmed as intentional free delivery.
 */
export const DeliveryCities: CollectionConfig = {
  // REST slug "cities": the public fixed-projection endpoint is GET /api/delivery-cities.
  slug: 'cities',
  labels: { singular: 'Delivery city', plural: 'Delivery cities' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'adminTitle',
    defaultColumns: ['adminTitle', 'feeIqd', 'sortOrder', 'isActive', 'updatedAt'],
    listSearchableFields: ['adminTitle'],
    description:
      'Cities and their delivery fees in whole Iraqi dinars. Fees are information only; they are never added to product prices. Only active cities appear on the website.',
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
      ({ data }) => {
        if (!data) {
          return data
        }
        trimTranslations(data.name)
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const id = originalDoc?.id
        const names = mergeTranslations(originalDoc?.name, data.name)
        data.adminTitle = adminTitleFrom(names, 'Untitled city')

        // Normalized names per language; duplicates are rejected per language here and
        // by a database unique index.
        const normalizedNames: Translations = {}
        for (const locale of LOCALES) {
          const value = names[locale]
          normalizedNames[locale] =
            typeof value === 'string' && value.length > 0 ? normalizeForSearch(value) : null
        }
        data.normalizedName = normalizedNames
        for (const locale of LOCALES) {
          const normalized = normalizedNames[locale]
          if (!normalized) {
            continue
          }
          const duplicate = await req.payload.find({
            collection: 'cities',
            where: {
              and: [
                { [`normalizedName.${locale}`]: { equals: normalized } },
                ...(id !== undefined ? [{ id: { not_equals: id } }] : []),
              ],
            },
            depth: 0,
            limit: 1,
            overrideAccess: true,
          })
          if (duplicate.totalDocs > 0) {
            const other = duplicate.docs[0].name?.[locale] ?? duplicate.docs[0].adminTitle
            throw new ValidationError({
              collection: 'cities',
              errors: [
                {
                  path: `name.${locale}`,
                  message: `A city named "${other}" already exists in ${LOCALE_LABELS[locale]}. Edit that city instead.`,
                },
              ],
              req,
            })
          }
        }

        const active = data.isActive === true
        if (active) {
          const reasons: string[] = []
          const missing = missingLocales(names, { maxLength: CITY_NAME_MAX })
          if (missing.length > 0) {
            reasons.push(
              `the name is missing in ${missing.map((l) => LOCALE_LABELS[l]).join(', ')} (fill it in above)`,
            )
          }
          const fee = data.feeIqd !== undefined ? data.feeIqd : originalDoc?.feeIqd
          if (!isValidIqd(fee, { allowZero: true })) {
            reasons.push(
              'the delivery fee is missing or invalid (whole Iraqi dinars, 0 to 999,999,999); a missing fee cannot be published',
            )
          } else if (fee === 0) {
            const confirmed =
              data.freeDeliveryConfirmed !== undefined
                ? data.freeDeliveryConfirmed
                : originalDoc?.freeDeliveryConfirmed
            if (confirmed !== true) {
              reasons.push(
                'the fee is 0, so tick the checkbox confirming that delivery to this city is intentionally free (or enter the real fee)',
              )
            }
          }
          if (reasons.length > 0) {
            // A plain message (not a field error) so the admin toast shows the reasons.
            throw new APIError(
              `Cannot activate this city: ${reasons.join('; ')}. You can save it inactive in the meantime.`,
              400,
              undefined,
              true,
            )
          }
        }

        if (req.user && req.user.collection === 'users') {
          data.updatedBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    translatedField({
      name: 'name',
      label: 'Name',
      maxLength: CITY_NAME_MAX,
      description:
        'The city name in each language (1 to 100 characters). All three are needed before the city can be activated.',
    }),
    {
      name: 'feeIqd',
      type: 'number',
      label: 'Delivery fee (IQD)',
      min: 0,
      max: MAX_IQD,
      validate: (value: unknown) =>
        value === undefined || value === null || isValidIqd(value, { allowZero: true })
          ? true
          : 'Enter a whole Iraqi dinar amount without decimals (0 to 999,999,999).',
      admin: {
        description:
          'Current delivery charge for this city in whole dinars, e.g. 5000. Enter 0 only for intentional free delivery.',
        components: {
          Field: '@/components/admin/FeeIqdField#FeeIqdField',
          Cell: '@/components/admin/FeeIqdCell#FeeIqdCell',
        },
      },
    },
    {
      name: 'freeDeliveryConfirmed',
      type: 'checkbox',
      label: 'Delivery to this city is free (fee 0) — confirmed',
      defaultValue: false,
      admin: {
        condition: (data) => data?.feeIqd === 0,
        description:
          'Required when the fee is 0, so free delivery is never shown by accident. The website then displays "Free delivery".',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Lower numbers appear first in the city list.' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Only active cities are shown on the website. Activation requires all three names and a valid fee.',
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
    {
      // Search-normalized copy of each name, for the per-language duplicate check and
      // the unique indexes created in payload.config.ts.
      name: 'normalizedName',
      type: 'group',
      access: {
        read: ({ req }) => Boolean(req.user),
        create: () => false,
        update: () => false,
      },
      admin: { hidden: true },
      fields: LOCALES.map((locale) => ({ name: locale, type: 'text' as const, index: true })),
    },
  ],
}
