import { OpenAPIHono } from '@hono/zod-openapi'
import { describe, expect, it, vi } from 'vitest'
import * as client from '../../clients/airbnb-client.js'
import { registerStayDetailRoute } from './route.js'

describe('registerStayDetailRoute', () => {
  it('returns stay details on success', async () => {
    vi.spyOn(client, 'fetchStayDetail').mockResolvedValue({
      sections: [{ __typename: 'SectionContainer', sectionId: 'TITLE' }],
      metadata: { __typename: 'StayPDPMetadata' },
    })

    const app = new OpenAPIHono()
    registerStayDetailRoute(app)

    const res = await app.request('/stays/32705269')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('32705269')
    expect(body.sections).toHaveLength(1)
    expect(body.metadata).toEqual({ __typename: 'StayPDPMetadata' })
  })

  it('handles non-object sections gracefully', async () => {
    vi.spyOn(client, 'fetchStayDetail').mockResolvedValue({
      sections: ['invalid-section', null, { __typename: 'SectionContainer' }],
      metadata: null,
    })

    const app = new OpenAPIHono()
    registerStayDetailRoute(app)

    const res = await app.request('/stays/32705269')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sections).toEqual([{}, {}, { __typename: 'SectionContainer' }])
    expect(body.metadata).toBeNull()
  })

  it('returns 502 on upstream error', async () => {
    vi.spyOn(client, 'fetchStayDetail').mockRejectedValue(new Error('not found'))

    const app = new OpenAPIHono()
    registerStayDetailRoute(app)

    const res = await app.request('/stays/32705269')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('not found')
  })

  it('returns 502 with generic message for non-error throws', async () => {
    vi.spyOn(client, 'fetchStayDetail').mockRejectedValue(undefined)

    const app = new OpenAPIHono()
    registerStayDetailRoute(app)

    const res = await app.request('/stays/32705269')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Unknown error')
  })
})
