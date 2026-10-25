const BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  constructor(message, { status, fields } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

async function request(path, { timeout = 10000, signal, ...opts } = {}) {
  const ctrl = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    ctrl.abort()
  }, timeout)
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true })

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      signal: ctrl.signal,
      credentials: 'omit', // the API is cookie-less; never send ambient credentials
      cache: 'no-store',
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new ApiError(body.error || `Request failed (${res.status})`, {
        status: res.status,
        fields: body.fields,
      })
    }
    return body
  } catch (err) {
    if (timedOut) throw new ApiError('The server took too long to respond.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// Static hosting (GitHub Pages) has no API: profile.json ships with the site
// and the contact form is replaced by email/LinkedIn links.
export const STATIC_SITE = import.meta.env.VITE_STATIC === 'true'

export const getProfile = (signal) =>
  request(STATIC_SITE ? `${import.meta.env.BASE_URL}profile.json` : '/api/profile', { signal })

export const sendContact = (payload) =>
  request('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(payload),
    timeout: 20000,
  })
