import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import * as client from '../../src/clients/airbnb-client.js'

describe('app integration', () => {
  it('handles autocomplete request end-to-end', async () => {
    vi.spyOn(client, 'fetchAutocomplete').mockResolvedValue({
      autocomplete_terms: [
        {
          id: 'term1',
          display_name: 'Barcelona, Spain',
          suggestion_type: 'LOCATION',
          vertical_type: 'homes',
          location: {
            location_name: 'Barcelona, Spain',
            google_place_id: 'gp1',
            country_code: 'ES',
            bounding_box: {
              sw_lat: 41.3,
              sw_lng: 2.0,
              ne_lat: 41.5,
              ne_lng: 2.3,
            },
          },
        },
      ],
    })

    const app = createApp()
    const res = await app.request('/search/autocomplete?q=Barcelona&limit=3')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suggestions[0].displayName).toBe('Barcelona, Spain')
    expect(body.suggestions[0].location.countryCode).toBe('ES')
  })

  it('handles markets request end-to-end', async () => {
    vi.spyOn(client, 'fetchUserMarkets').mockResolvedValue({
      market: 'Barcelona',
      country_code: 'ES',
      user_markets: [{ market: 'Barcelona', country_code: 'ES', locale: 'en' }],
    })

    const app = createApp()
    const res = await app.request('/markets')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.countryCode).toBe('ES')
  })

  it('handles stays search end-to-end', async () => {
    vi.spyOn(client, 'fetchStaysSearch').mockResolvedValue({
      results: [
        {
          __typename: 'StaySearchResult',
          title: 'Apartment in Barcelona',
          subtitle: 'Great location',
          avgRatingLocalized: '4.8 (50)',
        },
      ],
    })

    const app = createApp()
    const res = await app.request('/stays?location=Barcelona')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results[0].title).toBe('Apartment in Barcelona')
  })

  it('handles stay detail end-to-end', async () => {
    vi.spyOn(client, 'fetchStayDetail').mockResolvedValue({
      sections: [{ __typename: 'SectionContainer', sectionId: 'OVERVIEW' }],
      metadata: { __typename: 'StayPDPMetadata', pdpType: 'MARKETPLACE' },
    })

    const app = createApp()
    const res = await app.request('/stays/12345')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('12345')
  })

  it('returns 404 for unknown paths', async () => {
    const app = createApp()
    const res = await app.request('/unknown')

    expect(res.status).toBe(404)
  })
})
