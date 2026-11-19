import type { CollectionConfig } from 'payload'

import { LOGIN_THROTTLE_SLUG } from '@/lib/login-throttle'

/**
 * Sign-in attempts per network (hashed IP address), read and written only by the server
 * through src/lib/login-throttle.ts. Hidden from the admin and closed to every API caller.
 */
export const LoginThrottle: CollectionConfig = {
  slug: LOGIN_THROTTLE_SLUG,
  admin: {
    hidden: true,
  },
  lockDocuments: false,
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'attempts', type: 'number', required: true, min: 0 },
    { name: 'windowStart', type: 'date', required: true, index: true },
  ],
}
