import { createRoute, type OpenAPIHono } from '@hono/zod-openapi'
import { fetchStayDetail } from '../../clients/airbnb-client.js'
import { StayDetailParamsSchema, StayDetailResponseSchema } from './schema.js'

const stayDetailRoute = createRoute({
  method: 'get',
  path: '/stays/:id',
  request: {
    params: StayDetailParamsSchema,
  },
  responses: {
    200: {
      description: 'Stay detail',
      content: {
        'application/json': {
          schema: StayDetailResponseSchema,
        },
      },
    },
    502: {
      description: 'Upstream error',
      content: {
        'application/json': {
          schema: StayDetailResponseSchema,
        },
      },
    },
  },
})

export function registerStayDetailRoute(app: OpenAPIHono): void {
  app.openapi(stayDetailRoute, async (c) => {
    const { id } = c.req.valid('param')

    try {
      const upstream = await fetchStayDetail(id)

      const sections = upstream.sections.map((section) =>
        typeof section === 'object' && section !== null ? (section as Record<string, unknown>) : {},
      )

      return c.json(
        {
          id,
          sections,
          metadata:
            typeof upstream.metadata === 'object' && upstream.metadata !== null
              ? (upstream.metadata as Record<string, unknown>)
              : null,
        },
        200,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return c.json({ id, sections: [], metadata: null, error: message }, 502)
    }
  })
}
