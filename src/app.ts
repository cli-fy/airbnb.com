import { OpenAPIHono } from '@hono/zod-openapi'
import { registerAutocompleteRoute } from './routes/autocomplete/route.js'
import { registerMarketsRoute } from './routes/markets/route.js'
import { registerStayDetailRoute } from './routes/stay-detail/route.js'
import { registerStaysSearchRoute } from './routes/stays-search/route.js'

export function createApp(): OpenAPIHono {
  const app = new OpenAPIHono()

  registerAutocompleteRoute(app)
  registerMarketsRoute(app)
  registerStaysSearchRoute(app)
  registerStayDetailRoute(app)

  return app
}
