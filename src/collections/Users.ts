import type { CollectionConfig } from 'payload'
import { Forbidden, APIError } from 'payload'

import { isOwnerUser, ownerOnly } from '@/access'

/**
 * Administrators. One owner role at launch (spec sections 6, 7 and 12).
 *
 * - No public registration: Payload's "create first user" flow is blocked unless the
 *   request carries the `allowFirstUser` context set by scripts/create-owner.ts.
 * - Password reset by email is hidden and disabled until an email transport exists;
 *   recovery is the maintainer script (docs/operations.md).
 * - Login throttling: 5 failed attempts lock the account for 15 minutes.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'updatedAt'],
    group: 'Administration',
    description: 'Administrator accounts. Only the owner can manage accounts.',
  },
  access: {
    read: ownerOnly,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
    unlock: ownerOnly,
    admin: ({ req }) => isOwnerUser(req.user),
  },
  hooks: {
    beforeOperation: [
      ({ operation, req }) => {
        if (operation === 'create' && !req.user && !req.context?.allowFirstUser) {
          // Blocks POST /api/users/first-register and the /admin/create-first-user screen.
          throw new Forbidden(req.t)
        }
        if (
          (operation === 'forgotPassword' || operation === 'resetPassword') &&
          process.env.ENABLE_PASSWORD_RESET !== 'true'
        ) {
          throw new APIError(
            'Password reset by email is not enabled. Contact the site maintainer.',
            403,
            undefined,
            true,
          )
        }
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const owners = await req.payload.count({
          collection: 'users',
          where: { role: { equals: 'owner' } },
          overrideAccess: true,
        })
        const target = await req.payload.findByID({ collection: 'users', id, overrideAccess: true })
        if (target.role === 'owner' && owners.totalDocs <= 1) {
          throw new APIError('The last owner account cannot be deleted.', 400, undefined, true)
        }
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'owner',
      saveToJWT: true,
      options: [{ label: 'Owner', value: 'owner' }],
      admin: {
        description: 'Only the owner role exists in the first release.',
      },
    },
  ],
}
