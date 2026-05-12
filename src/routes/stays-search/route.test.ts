import { OpenAPIHono } from '@hono/zod-openapi'
import { describe, expect, it, vi } from 'vitest'
import * as client from '../../clients/airbnb-client.js'
import { registerStaysSearchRoute } from './route.js'

describe('registerStaysSearchRoute', () => {
  it('returns search results on success', async () => {
    vi.spyOn(client, 'fetchStaysSearch').mockResolvedValue({
      results: [
        {
          __typename: 'StaySearchResult',
          title: 'Room in Paris',
          subtitle: 'Eiffel view',
          avgRatingLocalized: '4.9 (100)',
          structuredDisplayPrice: {
            primaryLine: { price: '$150' },
          },
          contextualPictures: [{ picture: 'https://example.com/1.jpg' }],
          badges: [{ text: 'Guest favorite' }],
        },
      ],
    })

    const app = new OpenAPIHono()
    registerStaysSearchRoute(app)

    const res = await app.request('/stays?location=Paris')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.location).toBe('Paris')
    expect(body.results).toHaveLength(1)
    expect(body.results[0].title).toBe('Room in Paris')
    expect(body.results[0].price).toBe('$150')
    expect(body.results[0].pictureUrls).toEqual(['https://example.com/1.jpg'])
    expect(body.results[0].badges).toEqual(['Guest favorite'])
  })

  it('handles results with missing or malformed fields', async () => {
    vi.spyOn(client, 'fetchStaysSearch').mockResolvedValue({
      results: [
        {
          __typename: 'StaySearchResult',
          title: 'Basic Room',
          structuredDisplayPrice: null,
          contextualPictures: [
            { picture: 'https://example.com/1.jpg' },
            { noPicture: true },
            'invalid',
          ],
          badges: [{ text: 'Superhost' }, { noText: true }, 42],
        },
      ],
    })

    const app = new OpenAPIHono()
    registerStaysSearchRoute(app)

    const res = await app.request('/stays?location=Paris')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results[0].pictureUrls).toEqual(['https://example.com/1.jpg'])
    expect(body.results[0].badges).toEqual(['Superhost'])
    expect(body.results[0].price).toBe('')
  })

  it('returns 502 on upstream error', async () => {
    vi.spyOn(client, 'fetchStaysSearch').mockRejectedValue(new Error('blocked'))

    const app = new OpenAPIHono()
    registerStaysSearchRoute(app)

    const res = await app.request('/stays?location=Paris')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('blocked')
  })

  it('returns 502 with generic message for non-error throws', async () => {
    vi.spyOn(client, 'fetchStaysSearch').mockRejectedValue(42)

    const app = new OpenAPIHono()
    registerStaysSearchRoute(app)

    const res = await app.request('/stays?location=Paris')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Unknown error')
  })
})
