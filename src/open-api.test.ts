import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { generateOpenApiSpec } from './open-api.js'

describe('generateOpenApiSpec', () => {
  it('generates a valid OpenAPI spec', () => {
    const app = createApp()
    const spec = generateOpenApiSpec(app)

    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info).toBeDefined()
    expect((spec.info as Record<string, unknown>).title).toBe('Airbnb API Plugin')
    expect((spec.info as Record<string, unknown>).version).toBe('0.1.0')
    expect(Array.isArray(spec.servers)).toBe(true)
    expect(spec.paths).toBeDefined()
  })
})
