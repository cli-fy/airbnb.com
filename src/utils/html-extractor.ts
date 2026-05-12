interface ExtractedSearchData {
  readonly searchResults: readonly unknown[]
}

interface ExtractedDetailData {
  readonly sections: readonly unknown[]
  readonly metadata: unknown
}

export function extractSearchData(html: string): ExtractedSearchData {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g

  for (const match of html.matchAll(scriptRegex)) {
    const scriptContent = match[1]
    if (scriptContent === undefined) continue
    const content = scriptContent.trim()
    if (
      content.includes('"__typename":"StaySearchResult"') &&
      content.includes('listingParamOverrides')
    ) {
      const jsonStr = findJsonObject(content, '{"data":{"presentation"')
      if (jsonStr !== null) {
        try {
          const parsed = JSON.parse(jsonStr) as {
            data: {
              presentation: {
                staysSearch: {
                  results: {
                    searchResults: unknown[]
                  }
                }
              }
            }
          }
          return {
            searchResults: parsed.data.presentation.staysSearch.results.searchResults,
          }
        } catch {
          // Continue to next script tag
        }
      }
    }
  }

  return { searchResults: [] }
}

export function extractDetailData(html: string): ExtractedDetailData {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g

  for (const match of html.matchAll(scriptRegex)) {
    const scriptContent = match[1]
    if (scriptContent === undefined) continue
    const content = scriptContent.trim()
    if (
      (content.includes('"__typename":"SectionDetail"') ||
        content.includes('"__typename":"SectionContainer"')) &&
      content.includes('stayProductDetailPage')
    ) {
      const jsonStr = findJsonObject(content, '{"data":{"presentation"')
      if (jsonStr !== null) {
        try {
          const parsed = JSON.parse(jsonStr) as {
            data: {
              presentation: {
                stayProductDetailPage: {
                  sections: {
                    sections: unknown[]
                    metadata: unknown
                  }
                }
              }
            }
          }
          return {
            sections: parsed.data.presentation.stayProductDetailPage.sections.sections,
            metadata: parsed.data.presentation.stayProductDetailPage.sections.metadata,
          }
        } catch {
          // Continue to next script tag
        }
      }
    }
  }

  return { sections: [], metadata: null }
}

function findJsonObject(content: string, startMarker: string): string | null {
  const start = content.indexOf(startMarker)
  if (start < 0) return null

  let depth = 0
  let inString = false
  let isEscaped = false
  let jsonStr = ''

  for (let i = start; i < content.length; i++) {
    const ch = content[i]
    jsonStr += ch

    if (isEscaped) {
      isEscaped = false
      continue
    }
    if (ch === '\\') {
      isEscaped = true
      continue
    }
    if (ch === '"' && !inString) {
      inString = true
      continue
    }
    if (ch === '"' && inString) {
      inString = false
      continue
    }
    if (!inString) {
      if (ch === '{') depth++
      if (ch === '}') depth--
      if (depth === 0 && ch === '}') {
        break
      }
    }
  }

  return jsonStr
}
