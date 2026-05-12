import { OpenAPIHono } from '@hono/zod-openapi'
import { describe, expect, it, vi } from 'vitest'
import * as client from '../../clients/airbnb-client.js'
import { registerAutocompleteRoute } from './route.js'

describe('registerAutocompleteRoute', () => {
  it('returns suggestions on success', async () => {
    vi.spyOn(client, 'fetchAutocomplete').mockResolvedValue({
      autocomplete_terms: [
        {
          id: '1',
          display_name: 'Paris, France',
          suggestion_type: 'LOCATION',
          vertical_type: 'homes',
          location: {
            location_name: 'Paris, France',
            google_place_id: 'gp1',
            country_code: 'FR',
          },
        },
      ],
    })

    const app = new OpenAPIHono()
    registerAutocompleteRoute(app)

    const res = await app.request('/search/autocomplete?q=Paris&limit=5')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suggestions).toHaveLength(1)
    expect(body.suggestions[0].displayName).toBe('Paris, France')
  })

  it('handles terms without location', async () => {
    vi.spyOn(client, 'fetchAutocomplete').mockResolvedValue({
      autocomplete_terms: [
        {
          id: '1',
          display_name: 'Recent search',
          suggestion_type: 'RECENT_SEARCH',
          vertical_type: 'homes',
        },
      ],
    })

    const app = new OpenAPIHono()
    registerAutocompleteRoute(app)

    const res = await app.request('/search/autocomplete?q=Paris&limit=5')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suggestions[0].location).toBeUndefined()
  })

  it('returns 502 on upstream error', async () => {
    vi.spyOn(client, 'fetchAutocomplete').mockRejectedValue(new Error('network failure'))

    const app = new OpenAPIHono()
    registerAutocompleteRoute(app)

    const res = await app.request('/search/autocomplete?q=Paris&limit=5')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('network failure')
  })

  it('returns 502 with generic message for non-error throws', async () => {
    vi.spyOn(client, 'fetchAutocomplete').mockRejectedValue('string-error')

    const app = new OpenAPIHono()
    registerAutocompleteRoute(app)

    const res = await app.request('/search/autocomplete?q=Paris&limit=5')
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Unknown error')
  })
})
