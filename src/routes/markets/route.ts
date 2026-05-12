import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import { fetchUserMarkets } from '../../clients/airbnb-client.js'
import { MarketsResponseSchema } from './schema.js'

const marketsRoute = createRoute({
  method: 'get',
  path: '/markets',
  request: {},
  responses: {
    200: {
      description: 'User market information',
      content: {
        'application/json': {
          schema: MarketsResponseSchema,
        },
      },
    },
    502: {
      description: 'Upstream API error',
      content: {
        'application/json': {
          schema: MarketsResponseSchema,
        },
      },
    },
  },
})

export function registerMarketsRoute(app: OpenAPIHono): void {
  app.openapi(marketsRoute, async (c) => {
    try {
      const upstream = await fetchUserMarkets()
      const userMarkets = upstream.user_markets.map((m) => ({
        market: m.market,
        countryCode: m.country_code,
        locale: m.locale,
      }))

      return c.json(
        {
          market: upstream.market,
          countryCode: upstream.country_code,
          userMarkets,
        },
        200,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ market: '', countryCode: '', userMarkets: [], error: message }, 502)
    }
  })
}
