import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import { fetchStaysSearch } from '../../clients/airbnb-client.js'
import { StaysSearchQuerySchema, StaysSearchResponseSchema } from './schema.js'

const staysSearchRoute = createRoute({
  method: 'get',
  path: '/stays',
  request: {
    query: StaysSearchQuerySchema,
  },
  responses: {
    200: {
      description: 'Stay search results',
      content: {
        'application/json': {
          schema: StaysSearchResponseSchema,
        },
      },
    },
    502: {
      description: 'Upstream error',
      content: {
        'application/json': {
          schema: StaysSearchResponseSchema,
        },
      },
    },
  },
})

export function registerStaysSearchRoute(app: OpenAPIHono): void {
  app.openapi(staysSearchRoute, async (c) => {
    const { location } = c.req.valid('query')

    try {
      const upstream = await fetchStaysSearch(location)
      const results = upstream.results.map((result) => {
        const pictures = Array.isArray(result.contextualPictures)
          ? result.contextualPictures
              .map((pic: unknown) => {
                if (
                  typeof pic === 'object' &&
                  pic !== null &&
                  'picture' in pic &&
                  typeof (pic as Record<string, unknown>).picture === 'string'
                ) {
                  return String((pic as Record<string, unknown>).picture)
                }
                return null
              })
              .filter((url): url is string => url !== null)
          : []

        const badges = Array.isArray(result.badges)
          ? result.badges
              .map((badge: unknown) => {
                if (
                  typeof badge === 'object' &&
                  badge !== null &&
                  'text' in badge &&
                  typeof (badge as Record<string, unknown>).text === 'string'
                ) {
                  return String((badge as Record<string, unknown>).text)
                }
                return null
              })
              .filter((text): text is string => text !== null)
          : []

        const price =
          typeof result.structuredDisplayPrice === 'object' &&
          result.structuredDisplayPrice !== null &&
          'primaryLine' in (result.structuredDisplayPrice as Record<string, unknown>)
            ? String(
                (
                  (result.structuredDisplayPrice as Record<string, unknown>).primaryLine as Record<
                    string,
                    unknown
                  >
                ).price ?? '',
              )
            : ''

        return {
          title: result.title ?? '',
          subtitle: result.subtitle ?? '',
          avgRating: result.avgRatingLocalized ?? '',
          price,
          pictureUrls: pictures,
          badges,
        }
      })

      return c.json({ location, results }, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ location, results: [], error: message }, 502)
    }
  })
}
