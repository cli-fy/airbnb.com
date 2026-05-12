import { z } from '@hono/zod-openapi'

export const StayDetailParamsSchema = z
  .object({
    id: z.string().min(1).openapi({
      description: 'Airbnb listing ID',
      example: '32705269',
    }),
  })
  .openapi('StayDetailParams')

export const StayDetailResponseSchema = z
  .object({
    id: z.string().openapi({ example: '32705269' }),
    sections: z.array(z.record(z.unknown())).openapi({
      description: 'Listing detail sections',
    }),
    metadata: z.record(z.unknown()).nullable().openapi({
      description: 'Listing metadata',
    }),
  })
  .openapi('StayDetailResponse')
