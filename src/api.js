// API base URL: empty in local Vite development (uses vite proxy),
// set VITE_API_URL to the deployed Express API URL in Netlify.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}
