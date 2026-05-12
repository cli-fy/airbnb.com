export class FetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<T> {
  const response = await fetchWithTimeout(url, options, timeoutMs)

  if (!response.ok) {
    throw new FetchError(`upstream returned ${response.status}`, response.status, url)
  }

  return response.json() as Promise<T>
}
