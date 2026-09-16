import type { PayloadRequest } from 'payload'
import { APIError } from 'payload'

/**
 * Integrity guards for categories (spec section 6):
 *  - a category referenced by ANY product (draft or published) cannot be deleted: the
 *    owner sees the affected product count and must reassign those products first;
 *  - a category referenced by a PUBLISHED product cannot be deactivated (drafts may keep
 *    referencing it, but they cannot be published until they get an active category).
 * Products are never cascade-deleted or silently moved to another category.
 */
export async function countProductsReferencing(
  req: PayloadRequest,
  id: number | string,
  options: { publishedOnly: boolean },
): Promise<{ total: number; examples: string[] }> {
  const result = await req.payload.find({
    collection: 'products',
    where: options.publishedOnly
      ? { and: [{ category: { equals: id } }, { _status: { equals: 'published' } }] }
      : { category: { equals: id } },
    depth: 0,
    limit: 3,
    overrideAccess: true,
    draft: !options.publishedOnly,
  })
  return {
    total: result.totalDocs,
    examples: result.docs.map((d) => d.adminTitle || d.slug || `id ${d.id}`),
  }
}

export async function assertCategoryDeletable(
  req: PayloadRequest,
  id: number | string,
): Promise<void> {
  const { total, examples } = await countProductsReferencing(req, id, { publishedOnly: false })
  if (total > 0) {
    throw new APIError(
      `This category is used by ${total} product${total === 1 ? '' : 's'} including drafts (e.g. ${examples.join(', ')}). Reassign those products to another category first, or deactivate the category instead of deleting it.`,
      400,
      undefined,
      true,
    )
  }
}

export async function assertCategoryDeactivatable(
  req: PayloadRequest,
  id: number | string,
): Promise<void> {
  const { total, examples } = await countProductsReferencing(req, id, { publishedOnly: true })
  if (total > 0) {
    throw new APIError(
      `This category cannot be deactivated while ${total} published product${total === 1 ? ' uses' : 's use'} it (e.g. ${examples.join(', ')}). Unpublish or reassign those products first.`,
      400,
      undefined,
      true,
    )
  }
}
