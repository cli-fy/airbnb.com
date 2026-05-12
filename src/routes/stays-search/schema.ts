import { z } from '@hono/zod-openapi'

export const StaysSearchQuerySchema = z
  .object({
    location: z.string().min(1).openapi({
      description: 'Location to search for stays',
      example: 'Paris',
    }),
    checkIn: z.string().optional().openapi({
      description: 'Check-in date (YYYY-MM-DD)',
      example: '2025-06-01',
    }),
    checkOut: z.string().optional().openapi({
      description: 'Check-out date (YYYY-MM-DD)',
      example: '2025-06-05',
    }),
    guests: z.coerce.number().int().min(1).max(16).optional().openapi({
      description: 'Number of guests',
      example: 2,
    }),
  })
  .openapi('StaysSearchQuery')

const StaySearchResultSchema = z
  .object({
    title: z.string().optional().openapi({ example: 'Room in Paris' }),
    subtitle: z.string().optional().openapi({
      example: 'Private bedroom with Eiffel Tower view',
    }),
    avgRating: z.string().optional().openapi({ example: '4.98 (229)' }),
    price: z.string().optional().openapi({ example: '$150 total' }),
    pictureUrls: z
      .array(z.string())
      .optional()
      .openapi({
        example: ['https://a0.muscache.com/im/pictures/1.jpg'],
      }),
    badges: z
      .array(z.string())
      .optional()
      .openapi({
        example: ['Guest favorite'],
      }),
  })
  .openapi('StaySearchResult')

export const StaysSearchResponseSchema = z
  .object({
    location: z.string().openapi({ example: 'Paris' }),
    results: z.array(StaySearchResultSchema).openapi({
      description: 'List of stay search results',
    }),
  })
  .openapi('StaysSearchResponse')
