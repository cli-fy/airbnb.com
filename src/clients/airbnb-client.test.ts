import { describe, expect, it, vi } from 'vitest'
import {
  fetchAutocomplete,
  fetchStayDetail,
  fetchStaysSearch,
  fetchUserMarkets,
} from './airbnb-client.js'

describe('fetchAutocomplete', () => {
  it('constructs correct URL and returns data', async () => {
    const mockData = { autocomplete_terms: [{ id: '1', display_name: 'Paris' }] }
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(mockData), { status: 200 }))

    const result = await fetchAutocomplete('Paris', 3)

    expect(result).toEqual(mockData)
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      RequestInit?,
    ][]
    const callUrl = calls[0]?.[0]
    expect(callUrl).toBeDefined()
    expect(callUrl).toContain('user_input=Paris')
    expect(callUrl).toContain('num_results=3')
    expect(callUrl).toContain('api_version=1.2.0')
  })
})

describe('fetchUserMarkets', () => {
  it('returns market data', async () => {
    const mockData = { market: 'Seoul', country_code: 'KR', user_markets: [] }
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(mockData), { status: 200 }))

    const result = await fetchUserMarkets()

    expect(result).toEqual(mockData)
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      RequestInit?,
    ][]
    const callUrl = calls[0]?.[0]
    expect(callUrl).toBeDefined()
    expect(callUrl).toContain('/api/v2/user_markets')
  })
})

describe('fetchStaysSearch', () => {
  it('extracts listings from HTML response', async () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"staysSearch":{"results":{"searchResults":[{"__typename":"StaySearchResult","title":"Room","listingParamOverrides":{"__typename":"ExploreListingParamOverrides"}}]}}}}}
        </script>
      </html>
    `
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(html, { status: 200 }))

    const result = await fetchStaysSearch('Paris')

    expect(result.results).toHaveLength(1)
    expect(result.results[0]?.title).toBe('Room')
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('error', { status: 500 }))

    await expect(fetchStaysSearch('Paris')).rejects.toThrow('upstream returned 500')
  })
})

describe('fetchStayDetail', () => {
  it('extracts detail from HTML response', async () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"stayProductDetailPage":{"sections":{"sections":[{"__typename":"SectionContainer","sectionId":"TITLE"}],"metadata":null}}}}}
        </script>
      </html>
    `
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(html, { status: 200 }))

    const result = await fetchStayDetail('123')

    expect(result.sections).toHaveLength(1)
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('error', { status: 404 }))

    await expect(fetchStayDetail('123')).rejects.toThrow('upstream returned 404')
  })
})
