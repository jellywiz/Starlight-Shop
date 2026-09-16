import type { CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { anyone, ownerOnly } from '@/access'
import { validateSlug } from '@/lib/slug'

/**
 * Old product slugs that permanently redirect to the current product (spec sections 6
 * and 15). Product addresses are frozen once published (docs/decisions.md), so nothing
 * creates rows here any more; the collection stays, hidden from the admin, so that any
 * redirect created earlier keeps working and a maintainer can add one through the API.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  admin: {
    hidden: true,
    group: 'Catalog',
    useAsTitle: 'oldSlug',
    defaultColumns: ['oldSlug', 'product', 'updatedAt'],
    description: 'Old product addresses that redirect to the current product.',
  },
  access: {
    read: anyone,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) {
          return data
        }
        if (typeof data.oldSlug === 'string') {
          data.oldSlug = data.oldSlug.trim().toLowerCase()
        }
        const productId =
          typeof data.product === 'object' && data.product !== null ? data.product.id : data.product
        if (typeof data.oldSlug === 'string' && productId !== undefined && productId !== null) {
          // `req` is forwarded so the check runs inside the current transaction (the
          // product's slug may have been changed by the same request).
          const target = await req.payload.findByID({
            collection: 'products',
            id: productId,
            depth: 0,
            draft: true,
            overrideAccess: true,
            disableErrors: true,
            req,
          })
          if (target && target.slug === data.oldSlug) {
            throw new ValidationError({
              collection: 'redirects',
              errors: [
                {
                  path: 'oldSlug',
                  message:
                    'The old slug must differ from the product’s current slug (this would create a loop).',
                },
              ],
            })
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'oldSlug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
  ],
}
