import type { Metadata } from 'next'

import { LOCALES, LOCALE_META, type Locale } from '@/i18n/config'
import { siteUrl } from '@/lib/env'

/**
 * Canonical + alternate-language links for a localized path (spec section 15).
 * `path` is the part after the locale segment, e.g. "products/star-necklace".
 */
export function localizedAlternates(
  locale: Locale,
  path = '',
): NonNullable<Metadata['alternates']> {
  const base = siteUrl()
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : ''
  const languages: Record<string, string> = {}
  for (const code of LOCALES) {
    languages[LOCALE_META[code].htmlLang] = `${base}/${code}${suffix}`
  }
  languages['x-default'] = `${base}/ckb${suffix}`
  return {
    canonical: `${base}/${locale}${suffix}`,
    languages,
  }
}

export const SITE_NAME = 'Starlight Jewellery'

export function pageMetadata(args: {
  locale: Locale
  title: string
  description: string
  path?: string
  image?: { url: string; width: number; height: number; alt: string } | null
  noindex?: boolean
}): Metadata {
  const base = siteUrl()
  const image = args.image ?? {
    url: `${base}/brand/social-default.png`,
    width: 1200,
    height: 630,
    alt: SITE_NAME,
  }
  return {
    title: args.title,
    description: args.description,
    alternates: localizedAlternates(args.locale, args.path),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: args.title,
      description: args.description,
      url: `${base}/${args.locale}${args.path ? `/${args.path}` : ''}`,
      locale: LOCALE_META[args.locale].intl.replace('-', '_'),
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: args.title,
      description: args.description,
      images: [image.url],
    },
    robots: args.noindex ? { index: false, follow: false } : undefined,
  }
}

/** Organization structured data with the Instagram profile as sameAs (spec section 15). */
export function organizationJsonLd(args: { name: string; instagramUrl: string }) {
  const base = siteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: args.name,
    url: base,
    logo: `${base}/brand/logo-512.png`,
    sameAs: [args.instagramUrl],
  }
}

/** Serializes JSON-LD safely for an inline script. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
