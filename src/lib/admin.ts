import type { CollectionConfig, GlobalConfig } from 'payload'

/**
 * Admin simplification shared by every collection and global (owner decision, see
 * docs/decisions.md): the owner's screens show one view per record, without the "API"
 * and "Versions" tabs. Version history still exists (drafts and publishing depend on it)
 * and stays reachable through the REST API for a maintainer.
 */
export const SIMPLE_DOCUMENT_VIEW: Pick<NonNullable<CollectionConfig['admin']>, 'components'> &
  Pick<NonNullable<GlobalConfig['admin']>, 'hideAPIURL'> = {
  hideAPIURL: true,
  components: {
    views: {
      edit: {
        default: { tab: { condition: () => false } },
        versions: { tab: { condition: () => false } },
      },
    },
  },
}
