export interface RequestOptions extends RequestInit {
  json?: unknown
  retry?: number
  signal?: AbortSignal
}

export class HttpError extends Error {
  status: number
  url: string
  body?: unknown
  constructor(status: number, url: string, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.url = url
    this.body = body
  }
}

async function parseBody(res: Response) {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function http<T = unknown>(url: string, opts: RequestOptions = {}): Promise<T> {
  const { json, retry = 0, headers, ...rest } = opts
  const init: RequestInit = {
    ...rest,
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  }

  let attempt = 0
  for (;;) {
    const res = await fetch(url, init)
    if (res.ok) {
      if (res.status === 204) return undefined as T
      return (await res.json()) as T
    }
    if (res.status >= 500 && attempt < retry) {
      attempt++
      await new Promise((r) => setTimeout(r, 200 * attempt))
      continue
    }
    const body = await parseBody(res)
    throw new HttpError(res.status, url, `Request failed ${res.status}`, body)
  }
}
