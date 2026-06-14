import axios from 'axios'
import { toast } from 'react-toastify'
import { friendlyUserMessage, NETWORK_UNAVAILABLE } from '../utils/friendlyUserMessage.js'

const client = axios.create({
  withCredentials: true,
})

function isNetworkError(error) {
  const msg = error?.message || ''
  return !error?.response && /network error|fetch failed/i.test(msg)
}

let lastNetworkToastAt = 0

function friendlyAuthMessage(message) {
  return friendlyUserMessage(message)
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const raw = error.response?.data?.message || error.message
    const message = friendlyAuthMessage(raw)

    if (error.response?.status === 401 || error.response?.data?.code === 'AUTH_INVALID') {
      localStorage.removeItem('aToken')
      localStorage.removeItem('dToken')
      localStorage.removeItem('token')
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
        toast.error(NETWORK_UNAVAILABLE)
      }
    }
    return Promise.reject(err)
  }
)

export default client
