import { OpenAPIHono } from '@hono/zod-openapi'
import { describe, expect, it, vi } from 'vitest'
import * as client from '../../clients/airbnb-client.js'
import { registerMarketsRoute } from './route.js'

describe('registerMarketsRoute', () => {
  it('returns market data on success', async () => {
    vi.spyOn(client, 'fetchUserMarkets').mockResolvedValue({
      market: 'Seoul',
      country_code: 'KR',
      user_markets: [{ market: 'Seoul', country_code: 'KR', locale: 'en' }],
    })

    const app = new OpenAPIHono()
    registerMarketsRoute(app)

    const res = await app.request('/markets')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.market).toBe('Seoul')
    expect(body.userMarkets).toHaveLength(1)
  })

  it('returns 502 on upstream error', async () => {
    vi.spyOn(client, 'fetchUserMarkets').mockRejectedValue(new Error('timeout'))

    const app = new OpenAPIHono()
    registerMarketsRoute(app)

    const res = await app.request('/markets')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('timeout')
  })

  it('returns 502 with generic message for non-error throws', async () => {
    vi.spyOn(client, 'fetchUserMarkets').mockRejectedValue(null)

    const app = new OpenAPIHono()
    registerMarketsRoute(app)

    const res = await app.request('/markets')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Unknown error')
  })
})
