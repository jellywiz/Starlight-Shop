import type { Locale } from '@/i18n/config'

/**
 * Confirmed shop facts (spec sections 1 and 8). These are the static fallback used when
 * the database cannot be reached, so the contact page and the Instagram action keep
 * working (spec section 11, "Verification targets"). Editable values live in the
 * ShopSettings global; the owner's saved values take precedence whenever they load.
 */
export const SHOP_DEFAULTS = {
  publicName: 'Starlight Jewellery',
  instagramUrl: 'https://www.instagram.com/sl_.jewellery/',
} as const

export type PublicShopSettings = {
  publicName: string
  /** Confirmed HTTPS instagram.com profile URL. */
  instagramUrl: string
  /** Visible, copyable handle derived from the URL, e.g. "@sl_.jewellery". */
  instagramHandle: string
  aboutText: string | null
  logo: { url: string; width: number; height: number } | null
  defaultLocale: Locale
}

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com'])

/**
 * Accepts only an HTTPS instagram.com profile URL with a plausible username path
 * (letters, digits, dots and underscores), optionally with a trailing slash.
 */
export function isInstagramProfileUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || !INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) {
    return false
  }
  if (url.search || url.hash || url.username || url.password) {
    return false
  }
  return /^\/[A-Za-z0-9._]{1,30}\/?$/.test(url.pathname)
}

/** "https://www.instagram.com/sl_.jewellery/" -> "@sl_.jewellery". */
export function instagramHandleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '')
    return path ? `@${path}` : url
  } catch {
    return url
  }
}
