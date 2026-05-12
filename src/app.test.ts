import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'

describe('createApp', () => {
  it('creates an app with all routes registered', async () => {
    const app = createApp()

    const autoRes = await app.request('/search/autocomplete?q=test')
    expect([200, 502]).toContain(autoRes.status)

    const marketsRes = await app.request('/markets')
    expect([200, 502]).toContain(marketsRes.status)

    const searchRes = await app.request('/stays?location=test')
    expect([200, 502]).toContain(searchRes.status)

    const detailRes = await app.request('/stays/123')
    expect([200, 502]).toContain(detailRes.status)
  })
})
