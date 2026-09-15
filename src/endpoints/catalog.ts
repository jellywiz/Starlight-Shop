import type { Endpoint } from 'payload'

import { DEFAULT_LOCALE, isLocale } from '@/i18n/config'
import { parseCatalogParams } from '@/lib/catalog/params'
import { listProducts } from '@/lib/catalog/queries'
import { CatalogUnavailableError, CategoryUnavailableError } from '@/lib/catalog/types'
import { SHOP_DEFAULTS } from '@/lib/shop'

import { NO_STORE, rateLimitedResponse, throttled, unavailableResponse } from './throttle'

/**
 * GET /api/catalog — the same bounded public result the pages render, for interactive
 * filtering (spec section 10). Inputs: locale, q, category, min, max, availability,
 * sort, page, limit. Errors use stable codes translated by the UI layer.
 */
export const catalogEndpoint: Endpoint = {
  path: '/catalog',
  method: 'get',
  handler: async (req) => {
    if (throttled(req)) {
      return rateLimitedResponse()
    }
    const url = new URL(req.url ?? 'http://localhost/api/catalog')
    const localeParam = url.searchParams.get('locale') ?? DEFAULT_LOCALE
    if (!isLocale(localeParam)) {
      return Response.json(
        { error: { code: 'INVALID_LOCALE', field: 'locale' } },
        { status: 400, headers: NO_STORE },
      )
    }
    const parsed = parseCatalogParams(localeParam, url.searchParams)
    if (!parsed.ok) {
      return Response.json(
        {
          error: {
            code: parsed.errors[0].code,
            field: parsed.errors[0].field,
            errors: parsed.errors,
          },
        },
        { status: 400, headers: NO_STORE },
      )
    }
    try {
      const result = await listProducts(parsed.query)
      return Response.json(result, { status: 200, headers: NO_STORE })
    } catch (error) {
      if (error instanceof CategoryUnavailableError) {
        return Response.json(
          {
            error: {
              code: 'CATEGORY_UNAVAILABLE',
              field: 'category',
              message: 'This category is no longer available. Clear the category filter.',
            },
          },
          { status: 400, headers: NO_STORE },
        )
      }
      if (error instanceof CatalogUnavailableError) {
        return unavailableResponse(SHOP_DEFAULTS.instagramUrl)
      }
      throw error
    }
  },
}
