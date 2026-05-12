import type { OpenAPIHono } from '@hono/zod-openapi'

export function generateOpenApiSpec(app: OpenAPIHono): Record<string, unknown> {
  return app.getOpenAPIDocument({
    openapi: '3.1.0',
    info: {
      title: 'Airbnb API Plugin',
      version: '0.1.0',
      description:
        'RESTful API for fetching Airbnb data including search, autocomplete, and listing details',
    },
    servers: [
      {
        url: 'https://www.airbnb.com',
        description: 'Airbnb upstream',
      },
    ],
  }) as unknown as Record<string, unknown>
}
