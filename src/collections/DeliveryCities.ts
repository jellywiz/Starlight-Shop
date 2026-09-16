import type { CollectionConfig } from 'payload'
import { APIError, ValidationError } from 'payload'

import { activeOrOwner, ownerOnly } from '@/access'
import { mergeLocalizedField, missingLocales, readAllLocales } from '@/hooks/localized'
import { LOCALE_LABELS, requestLocale } from '@/hooks/products'
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
    useAsTitle: 'name',
    defaultColumns: ['name', 'feeIqd', 'sortOrder', 'isActive', 'updatedAt'],
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
        if (typeof data.name === 'string') {
          data.name = data.name.trim().replace(/\s+/g, ' ')
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const id = originalDoc?.id
        const locale = requestLocale(req)

        // Normalized name for the language being saved; duplicates are rejected per
        // language (and by a database unique index).
        if (typeof data.name === 'string' && data.name.length > 0) {
          const normalized = normalizeForSearch(data.name)
          data.normalizedName = normalized
          const duplicate = await req.payload.find({
            collection: 'cities',
            where: {
              and: [
                { normalizedName: { equals: normalized } },
                ...(id !== undefined ? [{ id: { not_equals: id } }] : []),
              ],
            },
            locale,
            fallbackLocale: false,
            depth: 0,
            limit: 1,
            overrideAccess: true,
          })
          if (duplicate.totalDocs > 0) {
            throw new ValidationError({
              collection: 'cities',
              errors: [
                {
                  path: 'name',
                  message: `A city named "${duplicate.docs[0].name}" already exists in ${LOCALE_LABELS[locale]}. Edit that city instead.`,
                },
              ],
              req,
            })
          }
        }

        const active = data.isActive === true
        if (active) {
          const existing = id !== undefined ? await readAllLocales(req, 'cities', id) : null
          const names = mergeLocalizedField(existing?.name, data.name, locale)
          const reasons: string[] = []
          const missing = missingLocales(names, { maxLength: CITY_NAME_MAX })
          if (missing.length > 0) {
            reasons.push(
              `the name is missing in ${missing.map((l) => LOCALE_LABELS[l]).join(', ')} (switch the language selector at the top right, enter it and Save)`,
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
    {
      name: 'name',
      type: 'text',
      localized: true,
      required: true,
      maxLength: CITY_NAME_MAX,
      admin: {
        description:
          'City name in the language selected at the top of the page (1 to 100 characters). All three languages are required before activation.',
      },
    },
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
      name: 'normalizedName',
      type: 'text',
      localized: true,
      index: true,
      access: {
        read: ({ req }) => Boolean(req.user),
        create: () => false,
        update: () => false,
      },
      admin: { hidden: true },
    },
  ],
}
