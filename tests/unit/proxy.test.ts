import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { config, proxy } from '@/proxy'

const request = (path: string) => new NextRequest(new URL(path, 'https://starlight.example'))
const rewriteOf = (path: string) => proxy(request(path)).headers.get('x-middleware-rewrite')

describe('proxy', () => {
  it('leaves language paths, the root and files alone', () => {
    for (const path of [
      '/',
      '/en',
      '/ckb/products',
      '/ar/products/x',
      '/favicon.ico',
      '/site.webmanifest',
    ]) {
      expect(rewriteOf(path), path).toBeNull()
    }
  })

  it('sends anything else to the default language catch-all, which answers 404', () => {
    expect(rewriteOf('/fr')).toBe('https://starlight.example/ckb/~/fr')
    expect(rewriteOf('/fr/products?x=1')).toBe('https://starlight.example/ckb/~/fr/products')
    expect(rewriteOf('/wp-admin')).toBe('https://starlight.example/ckb/~/wp-admin')
  })

  it('never runs for the admin, the API, assets or the cache-drop route', () => {
    const [matcher] = config.matcher
    const pattern = new RegExp(
      `^${matcher.replace(/\/\(\(\?!/, '/((?!').replace(/\)\.\*\)$/, ').*)')}$`,
    )
    for (const path of [
      '/admin/login',
      '/api/products',
      '/_next/static/x.js',
      '/site-cache/drop',
      '/brand/logo.webp',
      '/robots.txt',
    ]) {
      expect(pattern.test(path), path).toBe(false)
    }
    for (const path of ['/en', '/fr', '/wp-admin', '/en/products/x']) {
      expect(pattern.test(path), path).toBe(true)
    }
  })
})
