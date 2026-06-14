import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import api from '../services/api.js'
import { API_BASE_URL, LANDING_PATH, ROLES } from '../utils/constants.js'
import { decodeJwtPayload } from '../utils/jwt.js'
import { currencySymbolWithSpace, formatMoney } from '@doctor-hub/constants/currency.js'
import { friendlyUserMessage } from '../utils/friendlyUserMessage.js'

export const AuthContext = createContext(null)

function readStoredToken() {
  const t = localStorage.getItem('token')
  const looksLikeJwt = t && t.split('.').length === 3
  if (t && !looksLikeJwt) localStorage.removeItem('token')
  return looksLikeJwt && t !== 'null' && t !== 'undefined' ? t : ''
}

function userFromToken(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.id) return null
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role || ROLES.PATIENT,
  }
}

export function AuthProvider({ children }) {
  const currencySymbol = currencySymbolWithSpace()
  const backendUrl = import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')

  const [user, setUser] = useState(null)
  const [token, setTokenState] = useState(readStoredToken)
  const [isLoading, setIsLoading] = useState(true)
  const [doctors, setDoctors] = useState([])

  const setToken = useCallback((value) => {
    const next = value || ''
    if (next) localStorage.setItem('token', next)
    else localStorage.removeItem('token')
    setTokenState(next)
    setUser(next ? userFromToken(next) : null)
  }, [])

  const clearSession = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* cookie may already be cleared */
    }
    localStorage.removeItem('token')
    setTokenState('')
    setUser(null)
  }, [])

  useEffect(() => {
    const stored = readStoredToken()
    if (stored) {
      setTokenState(stored)
      setUser(userFromToken(stored))
    }
    setIsLoading(false)
  }, [])

  const getDoctorsData = useCallback(async () => {
    try {
      const { data } = await api.get('/doctors/legacy/list')
      if (data?.success && Array.isArray(data.doctors)) {
        setDoctors(data.doctors)
      } else if (Array.isArray(data)) {
        setDoctors(data)
      } else if (data?.message) {
        toast.error(friendlyUserMessage(data.message))
      }
    } catch (error) {
      if (!error.isAuthError && !error.isNetworkError) {
        toast.error(friendlyUserMessage(error.message))
      }
    }
  }, [])

  const loadUserProfileData = useCallback(async () => {
    if (!token) return
    try {
      const { data: me } = await api.get('/auth/me')
      if (me?.user) {
        setUser((prev) => ({
          ...prev,
          ...me.user,
          name: me.user.name || me.user.full_name || prev?.name,
          full_name: me.user.full_name || me.user.name || prev?.full_name,
          role: me.user.role || prev?.role || ROLES.PATIENT,
        }))
        return
      }
    } catch {
      /* try legacy endpoints */
    }

    try {
      let data
      try {
        ;({ data } = await api.get('/patients/profile'))
      } catch {
        ;({ data } = await api.get('/auth/me'))
      }
      if (data?.success && data.userData) {
        setUser((prev) => ({
          ...prev,
          ...data.userData,
          name: data.userData.name || prev?.name,
          full_name: data.userData.name || prev?.full_name,
          role: prev?.role || ROLES.PATIENT,
          address: data.userData.address || { line1: '', line2: '' },
          gender: data.userData.gender || '',
          dob: data.userData.dob || '',
        }))
      }
    } catch (error) {
      if (error.isAuthError) clearSession()
    }
  }, [token, clearSession])

  useEffect(() => {
    if (token) loadUserProfileData()
  }, [token, loadUserProfileData])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (!data?.token || !data?.user) {
      throw new Error(data?.message || 'Login failed')
    }
    setToken(data.token)
    setUser({
      ...data.user,
      name: data.user.name || data.user.full_name,
      full_name: data.user.full_name || data.user.name,
    })
    return data
  }

  const register = async (payload) => {
    const { data, status } = await api.post('/auth/register', payload)
    if (status !== 201 && data?.message !== 'Registered successfully') {
      throw new Error(data?.message || 'Registration failed')
    }
    return data
  }

  const logout = async () => {
    await clearSession()
    window.location.replace(LANDING_PATH)
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      userData: user,
      setUserData: setUser,
      token,
      setToken,
      isLoading,
      login,
      register,
      logout,
      clearSession,
      doctors,
      getDoctorsData,
      loadUserProfileData,
      currencySymbol,
      formatMoney,
      backendUrl,
      role: user?.role || null,
    }),
    [
      user,
      token,
      isLoading,
      doctors,
      getDoctorsData,
      loadUserProfileData,
      currencySymbol,
      backendUrl,
      setToken,
      clearSession,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}

export default AuthProvider
