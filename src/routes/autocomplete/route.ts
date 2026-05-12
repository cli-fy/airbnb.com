import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import { fetchAutocomplete } from '../../clients/airbnb-client.js'
import { AutocompleteQuerySchema, AutocompleteResponseSchema } from './schema.js'

const autocompleteRoute = createRoute({
  method: 'get',
  path: '/search/autocomplete',
  request: {
    query: AutocompleteQuerySchema,
  },
  responses: {
    200: {
      description: 'Autocomplete suggestions',
      content: {
        'application/json': {
          schema: AutocompleteResponseSchema,
        },
      },
    },
    502: {
      description: 'Upstream API error',
      content: {
        'application/json': {
          schema: AutocompleteResponseSchema,
        },
      },
    },
  },
})

export function registerAutocompleteRoute(app: OpenAPIHono): void {
  app.openapi(autocompleteRoute, async (c) => {
    const { q, limit } = c.req.valid('query')

    try {
      const upstream = await fetchAutocomplete(q, limit)
      const suggestions = upstream.autocomplete_terms.map((term) => ({
        id: term.id,
        displayName: term.display_name,
        suggestionType: term.suggestion_type,
        verticalType: term.vertical_type,
        location: term.location
          ? {
              locationName: term.location.location_name,
              googlePlaceId: term.location.google_place_id,
              countryCode: term.location.country_code,
              boundingBox: term.location.bounding_box
                ? {
                    swLat: term.location.bounding_box.sw_lat,
                    swLng: term.location.bounding_box.sw_lng,
                    neLat: term.location.bounding_box.ne_lat,
                    neLng: term.location.bounding_box.ne_lng,
                  }
                : undefined,
            }
          : undefined,
      }))

      return c.json({ suggestions }, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ suggestions: [], error: message }, 502)
    }
  })
}
