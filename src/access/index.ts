import type { Access, PayloadRequest } from 'payload'

type MaybeUser = PayloadRequest['user']

/** True only for an authenticated admin user with the owner role. */
export function isOwnerUser(user: MaybeUser): boolean {
  return Boolean(user && user.collection === 'users' && user.role === 'owner')
}

/** Collection/global access: owner only. Used for every write and for private reads. */
export const ownerOnly: Access = ({ req }) => isOwnerUser(req.user)

/** Public read. */
export const anyone: Access = () => true

/**
 * Public reads are restricted to published documents; the owner can read everything.
 * Callers must still pass `draft: false` so a published document's pending draft
 * version is never served publicly (spec section 9).
 */
export const publishedOrOwner: Access = ({ req }) => {
  if (isOwnerUser(req.user)) {
    return true
  }
  return {
    _status: { equals: 'published' },
  }
}

/**
 * Public reads of categories and delivery cities are active-only (spec section 10);
 * the owner sees every record in the admin.
 */
export const activeOrOwner: Access = ({ req }) => {
  if (isOwnerUser(req.user)) {
    return true
  }
  return {
    isActive: { equals: true },
  }
}

/** Access used by the admin panel to decide who may enter /admin at all. */
export const canAccessAdmin = ({ req }: { req: PayloadRequest }): boolean => isOwnerUser(req.user)
