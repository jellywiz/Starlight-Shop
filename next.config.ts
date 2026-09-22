import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const nextConfig: NextConfig = {
  // Product images are served as pregenerated variants straight from storage; the
  // Next.js image optimizer is intentionally not used (see spec section 11).
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  // Do not write AGENTS.md / CLAUDE.md into the repository on every `next dev`.
  agentRules: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Long-lived caching for versioned brand assets (logo, favicons).
        source: '/brand/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

const withPayloadConfig = withPayload(nextConfig, { devBundleServerPackages: false })

/**
 * withPayload adds `Accept-CH` + `Critical-CH: Sec-CH-Prefers-Color-Scheme` to every
 * route so the admin can render in the visitor's colour scheme. `Critical-CH` makes
 * Chrome restart the first navigation to the origin with the hint attached — a whole
 * extra round trip (and a second render) before anything is shown. The public site
 * chooses its theme in the page and never reads the hint, so the restart is cancelled
 * there; the admin keeps Payload's headers.
 */
const config: NextConfig = {
  ...withPayloadConfig,
  async headers() {
    const rules = (await withPayloadConfig.headers?.()) ?? []
    return [
      ...rules,
      {
        source: '/((?!admin|api).*)',
        headers: [{ key: 'Critical-CH', value: '' }],
      },
    ]
  },
}

export default config
