import axios from 'axios'
import { toast } from 'react-toastify'

const client = axios.create()

function isNetworkError(error) {
  const msg = error?.message || ''
  return !error?.response && /network error|fetch failed/i.test(msg)
}

let lastNetworkToastAt = 0

function friendlyAuthMessage(message) {
  if (!message || typeof message !== 'string') return message
  if (/invalid signature|jwt malformed|jwt expired|not authorized/i.test(message)) {
    return 'Session expired — please sign in again'
  }
  return message
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const raw = error.response?.data?.message || error.message
    const message = friendlyAuthMessage(raw)

    if (error.response?.status === 401 || error.response?.data?.code === 'AUTH_INVALID') {
      localStorage.removeItem('aToken')
      localStorage.removeItem('dToken')
      const err = new Error(message)
      err.isAuthError = true
      return Promise.reject(err)
    }

    const err = new Error(
      friendlyAuthMessage(error.response?.data?.message) ||
        (error.response?.status
          ? `Request failed (${error.response.status})`
          : error.message)
    )
    if (isNetworkError(error)) {
      err.isNetworkError = true
      const now = Date.now()
      if (now - lastNetworkToastAt > 12000) {
        lastNetworkToastAt = now
        toast.error(
          import.meta.env.PROD
            ? 'Backend not reachable. Check VITE_BACKEND_URL and that the API is deployed.'
            : 'Backend not reachable. Run npm run dev from Doctor Hub folder (API on http://localhost:4000).'
        )
      }
    }
    return Promise.reject(err)
  }
)

export default client
