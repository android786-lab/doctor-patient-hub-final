import axios from 'axios'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../utils/constants.js'
import {
  isNetworkError,
  notifyNetworkErrorOnce,
  NETWORK_ERROR_HINT,
} from '../utils/networkError.js'
import { friendlyUserMessage } from '../utils/friendlyUserMessage.js'

function friendlyAuthMessage(message) {
  return friendlyUserMessage(message)
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.headers.token = token
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const raw = error.response?.data?.message || error.message
    const message = friendlyAuthMessage(raw)

    const isAuthRoute = /\/auth\/(login|register|forgot-password)/.test(error.config?.url || '')
    if (
      !isAuthRoute &&
      (error.response?.status === 401 || error.response?.data?.code === 'AUTH_INVALID')
    ) {
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
    err.response = error.response
    if (isNetworkError(err)) {
      err.isNetworkError = true
      if (notifyNetworkErrorOnce()) toast.error(NETWORK_ERROR_HINT)
    }
    return Promise.reject(err)
  }
)

export default api
