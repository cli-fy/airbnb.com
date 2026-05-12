import { z } from '@hono/zod-openapi'

export const AutocompleteQuerySchema = z
  .object({
    q: z.string().min(1).openapi({
      description: 'Search query for location autocomplete',
      example: 'Paris',
    }),
    limit: z.coerce.number().int().min(1).max(20).default(5).openapi({
      description: 'Maximum number of suggestions to return',
      example: 5,
    }),
  })
  .openapi('AutocompleteQuery')

const AutocompleteSuggestionSchema = z
  .object({
    id: z.string().openapi({ example: 'abc123' }),
    displayName: z.string().openapi({ example: 'Paris, France' }),
    suggestionType: z.string().openapi({ example: 'LOCATION' }),
    verticalType: z.string().openapi({ example: 'homes' }),
    location: z
      .object({
        locationName: z.string().openapi({ example: 'Paris, France' }),
        googlePlaceId: z.string().openapi({ example: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ' }),
        countryCode: z.string().openapi({ example: 'FR' }),
        boundingBox: z
          .object({
            swLat: z.number().openapi({ example: 48.8155622 }),
            swLng: z.number().openapi({ example: 2.2242171 }),
            neLat: z.number().openapi({ example: 48.9021476 }),
            neLng: z.number().openapi({ example: 2.4698511 }),
          })
          .optional(),
      })
      .optional(),
  })
  .openapi('AutocompleteSuggestion')

export const AutocompleteResponseSchema = z
  .object({
    suggestions: z.array(AutocompleteSuggestionSchema).openapi({
      description: 'List of autocomplete suggestions',
    }),
  })
  .openapi('AutocompleteResponse')
