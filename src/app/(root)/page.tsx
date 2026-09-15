import { redirect } from 'next/navigation'

import { getShopSettings } from '@/lib/catalog/queries'

export const dynamic = 'force-dynamic'

/** "/" redirects to the configured default language (spec section 2). */
export default async function RootPage() {
  const { settings } = await getShopSettings('ckb')
  redirect(`/${settings.defaultLocale}`)
}
