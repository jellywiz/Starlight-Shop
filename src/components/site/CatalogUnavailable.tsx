import type { Dictionary } from '@/i18n/dictionary'
import type { PublicShopSettings } from '@/lib/shop'

import { InstagramLink } from './InstagramLink'

/**
 * Clear dependency-failure state (spec sections 9-11): the catalogue error keeps a
 * lightweight Instagram fallback so visitors can still reach the shop.
 */
export function CatalogUnavailable({
  dict,
  settings,
}: {
  dict: Dictionary
  settings: PublicShopSettings
}) {
  return (
    <div role="alert" className="panel-lilac p-6">
      <h2 className="text-lg font-semibold text-plum-900">{dict.unavailable.heading}</h2>
      <p className="mt-2 text-ink-soft">{dict.unavailable.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <InstagramLink href={settings.instagramUrl} label={dict.home.instagramAction} dict={dict} />
        <bdi dir="ltr" className="ltr-isolate text-sm font-medium text-plum-800">
          {settings.instagramHandle}
        </bdi>
      </div>
    </div>
  )
}
