import type { Endpoint } from 'payload'

import { DEFAULT_LOCALE, isLocale } from '@/i18n/config'
import { listDeliveryCities } from '@/lib/catalog/queries'
import { CatalogUnavailableError } from '@/lib/catalog/types'
import { SHOP_DEFAULTS } from '@/lib/shop'

import { NO_STORE, rateLimitedResponse, throttled, unavailableResponse } from './throttle'

/**
 * GET /api/delivery-cities?locale=ckb — active cities with their saved whole-dinar fee,
 * in the configured order (spec section 10). No relationship expansion is possible; the
 * projection is fixed. An empty list is returned only for a successful query with no
 * active cities; a database failure is a 503, never a false "free delivery".
 */
export const deliveryCitiesEndpoint: Endpoint = {
  path: '/delivery-cities',
  method: 'get',
  handler: async (req) => {
    if (throttled(req)) {
      return rateLimitedResponse()
    }
    const url = new URL(req.url ?? 'http://localhost/api/delivery-cities')
    const localeParam = url.searchParams.get('locale') ?? DEFAULT_LOCALE
    if (!isLocale(localeParam)) {
      return Response.json(
        { error: { code: 'INVALID_LOCALE', field: 'locale' } },
        { status: 400, headers: NO_STORE },
      )
    }
    try {
      const cities = await listDeliveryCities(localeParam)
      return Response.json({ cities }, { status: 200, headers: NO_STORE })
    } catch (error) {
      if (error instanceof CatalogUnavailableError) {
        return unavailableResponse(SHOP_DEFAULTS.instagramUrl)
      }
      throw error
    }
  },
}
