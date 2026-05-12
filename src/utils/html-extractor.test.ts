import { describe, expect, it } from 'vitest'
import { extractDetailData, extractSearchData } from './html-extractor.js'

describe('extractSearchData', () => {
  it('returns empty results when no data found', () => {
    const result = extractSearchData('<html><body>empty</body></html>')
    expect(result.searchResults).toEqual([])
  })

  it('extracts search results from embedded script', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"staysSearch":{"results":{"searchResults":[{"__typename":"StaySearchResult","title":"Room in Paris","listingParamOverrides":{"__typename":"ExploreListingParamOverrides"}}]}}}}}
        </script>
      </html>
    `
    const result = extractSearchData(html)
    expect(result.searchResults).toHaveLength(1)
    expect((result.searchResults[0] as Record<string, unknown>).title).toBe('Room in Paris')
  })

  it('skips malformed script content', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"staysSearch":{"results":{"searchResults":[{"__typename":"StaySearchResult"}]}}}}}
          not json
        </script>
      </html>
    `
    const result = extractSearchData(html)
    expect(result.searchResults).toEqual([])
  })

  it('handles JSON with escaped characters', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"staysSearch":{"results":{"searchResults":[{"__typename":"StaySearchResult","title":"Room \\"quoted\\"","listingParamOverrides":{"__typename":"ExploreListingParamOverrides"}}]}}}}}
        </script>
      </html>
    `
    const result = extractSearchData(html)
    expect(result.searchResults).toHaveLength(1)
    expect((result.searchResults[0] as Record<string, unknown>).title).toBe('Room "quoted"')
  })

  it('skips unparseable JSON objects', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"staysSearch":{"results":{"searchResults":[{"__typename":"StaySearchResult","listingParamOverrides":{"__typename":"ExploreListingParamOverrides"}}]}}{broken}}}}}
        </script>
      </html>
    `
    const result = extractSearchData(html)
    expect(result.searchResults).toEqual([])
  })

  it('continues to next script after parse failure', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"staysSearch":{"results":{"searchResults":[{"__typename":"StaySearchResult","listingParamOverrides":{"__typename":"ExploreListingParamOverrides"}}]}}{broken}}}}}
        </script>
        <script>
          {"data":{"presentation":{"staysSearch":{"results":{"searchResults":[{"__typename":"StaySearchResult","title":"Room in London","listingParamOverrides":{"__typename":"ExploreListingParamOverrides"}}]}}}}}
        </script>
      </html>
    `
    const result = extractSearchData(html)
    expect(result.searchResults).toHaveLength(1)
    expect((result.searchResults[0] as Record<string, unknown>).title).toBe('Room in London')
  })
})

describe('extractDetailData', () => {
  it('returns empty sections when no data found', () => {
    const result = extractDetailData('<html><body>empty</body></html>')
    expect(result.sections).toEqual([])
    expect(result.metadata).toBeNull()
  })

  it('extracts detail sections from embedded script', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"stayProductDetailPage":{"sections":{"sections":[{"__typename":"SectionContainer","sectionId":"TITLE"}],"metadata":{"__typename":"StayPDPMetadata"}}}}}}
        </script>
      </html>
    `
    const result = extractDetailData(html)
    expect(result.sections).toHaveLength(1)
    expect(result.metadata).toEqual({ __typename: 'StayPDPMetadata' })
  })

  it('skips unparseable detail JSON', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"stayProductDetailPage":{"sections":{"sections":[{"__typename":"SectionContainer"}],"metadata":null}}}}{broken}}}}
        </script>
      </html>
    `
    const result = extractDetailData(html)
    expect(result.sections).toEqual([])
    expect(result.metadata).toBeNull()
  })

  it('continues to next script after detail parse failure', () => {
    const html = `
      <html>
        <script>
          {"data":{"presentation":{"stayProductDetailPage":{"sections":{"sections":[{"__typename":"SectionContainer"}],"metadata":null}}}}{broken}}}}
        </script>
        <script>
          {"data":{"presentation":{"stayProductDetailPage":{"sections":{"sections":[{"__typename":"SectionContainer","sectionId":"TITLE"}],"metadata":{"__typename":"StayPDPMetadata"}}}}}}
        </script>
      </html>
    `
    const result = extractDetailData(html)
    expect(result.sections).toHaveLength(1)
    expect(result.metadata).toEqual({ __typename: 'StayPDPMetadata' })
  })
})
