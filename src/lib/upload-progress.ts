/**
 * Upload progress for the admin. `fetch` cannot report how much of a request body has
 * been sent, so multipart uploads (the only requests with a File in them) are sent through
 * an XMLHttpRequest instead, which can, and the result is handed back as a Response so the
 * caller notices nothing. Everything else keeps using the browser's fetch untouched.
 */

export type UploadProgress = {
  /** True while an upload is in flight. */
  active: boolean
  /** Bytes sent so far and the total, when the browser reports them. */
  loaded: number
  total: number
}

const IDLE: UploadProgress = { active: false, loaded: 0, total: 0 }

let state: UploadProgress = IDLE
const listeners = new Set<() => void>()
let installed = false

function publish(next: UploadProgress) {
  state = next
  for (const listener of listeners) {
    listener()
  }
}

export function getUploadProgress(): UploadProgress {
  return state
}

export function subscribeUploadProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function hasFile(body: FormData): boolean {
  for (const value of body.values()) {
    if (typeof value !== 'string') {
      return true
    }
  }
  return false
}

function headerEntries(headers: HeadersInit | undefined): [string, string][] {
  if (!headers) {
    return []
  }
  if (headers instanceof Headers) {
    return Array.from(headers.entries())
  }
  if (Array.isArray(headers)) {
    return headers.map(([key, value]) => [key, value])
  }
  return Object.entries(headers)
}

function parseResponseHeaders(raw: string): Headers {
  const headers = new Headers()
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const index = line.indexOf(':')
    if (index > 0) {
      headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim())
    }
  }
  return headers
}

function sendWithProgress(
  input: RequestInfo | URL,
  init: RequestInit,
  body: FormData,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = input instanceof Request ? input : null
    const url = request ? request.url : String(input)
    const method = (init.method ?? request?.method ?? 'POST').toUpperCase()
    const xhr = new XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.responseType = 'blob'
    xhr.withCredentials = init.credentials !== 'omit'
    for (const [key, value] of headerEntries(init.headers ?? request?.headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.upload.onprogress = (event) => {
      publish({
        active: true,
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : 0,
      })
    }
    xhr.onload = () => {
      publish(IDLE)
      resolve(
        new Response(xhr.response as Blob, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseResponseHeaders(xhr.getAllResponseHeaders()),
        }),
      )
    }
    xhr.onerror = () => {
      publish(IDLE)
      reject(new TypeError('Network request failed'))
    }
    xhr.onabort = () => {
      publish(IDLE)
      reject(new DOMException('The upload was aborted', 'AbortError'))
    }
    if (init.signal) {
      init.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }
    publish({ active: true, loaded: 0, total: 0 })
    xhr.send(body)
  })
}

/** Routes uploads through XMLHttpRequest so their progress can be shown. Idempotent. */
export function installUploadProgress(): void {
  if (installed || typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') {
    return
  }
  installed = true
  const original = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const body = init?.body
    if (body instanceof FormData && hasFile(body)) {
      return sendWithProgress(input, init ?? {}, body)
    }
    return original(input, init)
  }
}
