import { type NextRequest, NextResponse } from 'next/server'

import { DEFAULT_LOCALE, isLocale } from '@/i18n/config'

/**
 * Paths whose first segment is not a language (`/fr`, `/wp-admin`, `/fr/products`) are
 * answered by the default language's catch-all page, which renders the translated 404
 * with a real 404 status. Without this they would reach the home or catalogue page,
 * whose loading placeholders stream the page shell before the page can say "not found",
 * leaving the status at 200 (Next.js then only adds a noindex meta tag).
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const first = pathname.split('/')[1] ?? ''
  if (first === '' || isLocale(first) || first.includes('.')) {
    return NextResponse.next()
  }
  return NextResponse.rewrite(new URL(`/${DEFAULT_LOCALE}/~${pathname}`, request.url))
}

export const config = {
  // The admin, the API, Next's own assets, the cache-drop route and public files
  // (anything with a file extension) are never touched.
  matcher: ['/((?!admin|api|_next|site-cache|brand|.*\\..*).*)'],
}
