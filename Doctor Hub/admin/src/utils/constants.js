export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/api`
    : 'http://localhost:4000/api')
