export function buildUrl(base, path = '') {
  if (!path) return base
  if (/^https?:/i.test(path)) return path
  if (path.startsWith('/')) {
    return `${base.replace(/\/$/, '')}${path}`
  }
  return `${base.replace(/\/$/, '')}/${path}`
}

export async function apiRequest({
  base,
  path,
  method = 'GET',
  body,
  headers = {},
  signal,
  token
}) {
  const url = buildUrl(base, path)
  const requestHeaders = new Headers(headers)

  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', token.startsWith('Bearer') ? token : `Bearer ${token}`)
  }

  let payload = body
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    payload = JSON.stringify(body)
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }
  }

  const started = performance.now()
  const response = await fetch(url, {
    method,
    body: payload,
    headers: requestHeaders,
    signal
  })

  const duration = Math.round(performance.now() - started)
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    data = text
  }

  if (!response.ok) {
    const error = new Error('Request failed')
    error.status = response.status
    error.data = data
    error.duration = duration
    throw error
  }

  return {
    status: response.status,
    duration,
    data
  }
}
