const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  const isFormData = options.body instanceof FormData
  return fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then((res) => {
    if (res.status === 401 && localStorage.getItem('token')) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return res
  })
}
