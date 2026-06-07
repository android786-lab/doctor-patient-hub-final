import axios from 'axios'
import { API_BASE_URL } from '../utils/constants.js'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const aToken = localStorage.getItem('aToken')
  const dToken = localStorage.getItem('dToken')
  if (aToken) config.headers.atoken = aToken
  if (dToken) config.headers.dtoken = dToken
  return config
})

export default api
