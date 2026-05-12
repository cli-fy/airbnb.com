import { Cli } from 'incur'
import { createApp } from './app.js'
import { generateOpenApiSpec } from './open-api.js'

export const app = createApp()
const spec = generateOpenApiSpec(app)

// Add global request logger for debugging
const originalFetch = app.fetch.bind(app)
app.fetch = async (req: Request) => {
  try {
    const res = await originalFetch(req)
    await Bun.write('/tmp/airbnb-debug.log', JSON.stringify({ url: req.url, status: res.status }) + '\n')
    return res
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await Bun.write('/tmp/airbnb-debug.log', JSON.stringify({ url: req.url, error: message, stack: error instanceof Error ? error.stack : null }) + '\n')
    throw error
  }
}

const cli = Cli.create('airbnb', {
  description: 'Fetch Airbnb listings, search, and market data via RESTful API',
}).command('api', {
  description: 'Call the Airbnb website API',
  fetch: app.fetch,
  openapi: spec as { paths?: object },
})

export default cli
