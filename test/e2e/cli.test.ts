import { describe, expect, it } from 'vitest'
import cli from '../../src/index.js'

describe('cli e2e', () => {
  it('exports a valid cli object', () => {
    expect(cli).toBeDefined()
    expect(cli.name).toBe('airbnb')
    expect(cli.description).toBe('Fetch Airbnb listings, search, and market data via RESTful API')
    expect(typeof cli.fetch).toBe('function')
  })

  it('fetch returns 404 for unknown routes', async () => {
    const req = new Request('http://localhost/unknown-route')
    const res = await cli.fetch(req)
    expect(res.status).toBe(404)
  })
})
