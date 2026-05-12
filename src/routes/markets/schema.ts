import { z } from '@hono/zod-openapi'

const MarketSchema = z
  .object({
    market: z.string().openapi({ example: 'Seoul' }),
    countryCode: z.string().openapi({ example: 'KR' }),
    locale: z.string().openapi({ example: 'en' }),
  })
  .openapi('Market')

export const MarketsResponseSchema = z
  .object({
    market: z.string().openapi({ example: 'Seoul' }),
    countryCode: z.string().openapi({ example: 'KR' }),
    userMarkets: z.array(MarketSchema).openapi({
      description: 'List of user markets',
    }),
  })
  .openapi('MarketsResponse')
