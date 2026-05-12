import { describe, expect, it, vi } from 'vitest'
import { FetchError, fetchJson, fetchWithTimeout } from './fetch.js'

describe('fetchWithTimeout', () => {
  it('returns response on success', async () => {
    const mockResponse = new Response('ok')
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse)

    const result = await fetchWithTimeout('https://example.com/test')

    expect(result).toBe(mockResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/test',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('aborts after timeout', async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('should have been aborted')), 100)
        }),
    )

    await expect(fetchWithTimeout('https://example.com/test', {}, 1)).rejects.toThrow()
  })
})

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    const data = { foo: 'bar' }
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }))

    const result = await fetchJson<typeof data>('https://example.com/api')

    expect(result).toEqual(data)
  })

  it('throws FetchError on non-ok status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('error', { status: 502 }))

    await expect(fetchJson('https://example.com/api')).rejects.toThrow(FetchError)
    await expect(fetchJson('https://example.com/api')).rejects.toThrow('upstream returned 502')
  })
})
