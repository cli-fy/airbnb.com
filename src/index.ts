import { Cli } from 'incur'
import { createApp } from './app.js'
import { generateOpenApiSpec } from './open-api.js'

export const app = createApp()
const spec = generateOpenApiSpec(app)

const cli = Cli.create('airbnb', {
  description: 'Fetch Airbnb listings, search, and market data via RESTful API',
}).command('api', {
  description: 'Call the Airbnb website API',
  fetch: app.fetch,
  openapi: spec as { paths?: object },
})

export default cli
