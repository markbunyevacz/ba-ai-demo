const DEFAULT_API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')
const DEFAULT_AUTH_BASE_URL = (import.meta.env?.VITE_AUTH_URL || '/auth').replace(/\/$/, '')

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData

const buildUrl = (base, endpoint, params) => {
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = new URL(`${base}${sanitizedEndpoint}`, window.location.origin)

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item))
      } else {
        url.searchParams.set(key, value)
      }
    })
  }

  return url.toString()
}

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }

  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    return text
  }
}

const request = async (endpoint, { method = 'GET', params, data, body, headers = {}, apiBase = DEFAULT_API_BASE_URL, ...options } = {}) => {
  const url = buildUrl(apiBase, endpoint, params)
  const config = {
    method,
    headers: new Headers(headers),
    ...options,
  }

  if (body !== undefined) {
    config.body = body
  } else if (data !== undefined) {
    if (isFormData(data)) {
      config.body = data
    } else {
      if (!config.headers.has('Content-Type')) {
        config.headers.set('Content-Type', 'application/json')
      }
      config.body = JSON.stringify(data)
    }
  }

  const response = await fetch(url, config)
  const parsedBody = await parseResponseBody(response)

  if (!response.ok) {
    const message =
      (parsedBody && (parsedBody.detail || parsedBody.error || parsedBody.message)) ||
      `HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.body = parsedBody
    throw error
  }

  return parsedBody
}

const uploadFile = async (file, endpoint = '/upload', { fields = {}, params, apiBase, signal } = {}) => {
  const formData = new FormData()
  formData.append('file', file)

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    formData.append(key, value)
  })

  return request(endpoint, {
    method: 'POST',
    body: formData,
    params,
    apiBase,
    signal,
  })
}

const apiClient = {
  API_BASE_URL: DEFAULT_API_BASE_URL,
  AUTH_BASE_URL: DEFAULT_AUTH_BASE_URL,
  request,
  uploadFile,
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, data, options) => request(endpoint, { method: 'POST', data, ...options }),
  put: (endpoint, data, options) => request(endpoint, { method: 'PUT', data, ...options }),
  patch: (endpoint, data, options) => request(endpoint, { method: 'PATCH', data, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
}

export default apiClient
