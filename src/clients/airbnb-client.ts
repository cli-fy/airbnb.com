import { fetchJson, fetchWithTimeout } from '../utils/fetch.js'
import { extractDetailData, extractSearchData } from '../utils/html-extractor.js'

const BASE_URL = 'https://www.airbnb.com'
const API_KEY = 'd306zoyjsyarp7ifhu67rjxn52tv0t20'

function buildHeaders(): Record<string, string> {
  return {
    'X-Airbnb-API-Key': API_KEY,
    'X-CSRF-Without-Token': '1',
    Referer: `${BASE_URL}/`,
    'Content-Type': 'application/json',
  }
}

export interface AutocompleteSuggestion {
  readonly id: string
  readonly display_name: string
  readonly suggestion_type: string
  readonly vertical_type: string
  readonly location?: {
    readonly location_name: string
    readonly google_place_id: string
    readonly country_code: string
    readonly bounding_box?: {
      readonly sw_lat: number
      readonly sw_lng: number
      readonly ne_lat: number
      readonly ne_lng: number
    }
  }
}

export interface AutocompleteResponse {
  readonly autocomplete_terms: readonly AutocompleteSuggestion[]
}

export interface MarketInfo {
  readonly market: string
  readonly country_code: string
  readonly locale: string
}

export interface UserMarketsResponse {
  readonly market: string
  readonly country_code: string
  readonly user_markets: readonly MarketInfo[]
}

export interface SearchListing {
  readonly __typename: string
  readonly title?: string
  readonly subtitle?: string
  readonly avgRatingLocalized?: string
  readonly contextualPictures?: readonly unknown[]
  readonly structuredDisplayPrice?: unknown
  readonly badges?: readonly unknown[]
}

export interface SearchResponse {
  readonly results: readonly SearchListing[]
}

export interface DetailResponse {
  readonly sections: readonly unknown[]
  readonly metadata: unknown
}

export async function fetchAutocomplete(query: string, limit = 5): Promise<AutocompleteResponse> {
  const url = new URL(`${BASE_URL}/api/v2/autocompletes-personalized`)
  url.searchParams.set('locale', 'en')
  url.searchParams.set('currency', 'USD')
  url.searchParams.set('country', 'US')
  url.searchParams.set('key', API_KEY)
  url.searchParams.set('language', 'en')
  url.searchParams.set('num_results', String(limit))
  url.searchParams.set('user_input', query)
  url.searchParams.set('api_version', '1.2.0')
  url.searchParams.set('vertical_refinement', 'homes')
  url.searchParams.set('region', '-1')
  url.searchParams.set(
    'options',
    'should_filter_by_vertical_refinement|hide_nav_results|should_show_stays|simple_search',
  )

  return fetchJson<AutocompleteResponse>(url.toString(), {
    headers: buildHeaders(),
  })
}

export async function fetchUserMarkets(): Promise<UserMarketsResponse> {
  const url = new URL(`${BASE_URL}/api/v2/user_markets`)
  url.searchParams.set('locale', 'en')
  url.searchParams.set('currency', 'USD')
  url.searchParams.set('language', 'en')

  return fetchJson<UserMarketsResponse>(url.toString(), {
    headers: buildHeaders(),
  })
}

export async function fetchStaysSearch(location: string): Promise<SearchResponse> {
  const encodedLocation = encodeURIComponent(location)
  const url = `${BASE_URL}/s/${encodedLocation}/homes`

  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!response.ok) {
    throw new Error(`upstream returned ${response.status}`)
  }

  const html = await response.text()
  const extracted = extractSearchData(html)

  return {
    results: extracted.searchResults as SearchListing[],
  }
}

export async function fetchStayDetail(listingId: string): Promise<DetailResponse> {
  const url = `${BASE_URL}/rooms/${listingId}`

  console.error('[DEBUG] fetchStayDetail: fetching', url)
  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  console.error('[DEBUG] fetchStayDetail: response status', response.status)
  if (!response.ok) {
    throw new Error(`upstream returned ${response.status}`)
  }

  const html = await response.text()
  console.error('[DEBUG] fetchStayDetail: html length', html.length)
  const extracted = extractDetailData(html)
  console.error('[DEBUG] fetchStayDetail: sections', extracted.sections.length, 'metadata', !!extracted.metadata)

  return {
    sections: extracted.sections,
    metadata: extracted.metadata,
  }
}
