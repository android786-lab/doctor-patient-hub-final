import axiosClient from '../lib/axiosClient'
import { createContext, useState } from 'react'
import { toast } from 'react-toastify'

export const AdminContext = createContext()

function readAdminToken() {
  const stored = localStorage.getItem('aToken')
  const looksLikeJwt = stored && stored.split('.').length === 3
  if (stored && !looksLikeJwt) localStorage.removeItem('aToken')
  return looksLikeJwt && stored !== 'null' && stored !== 'undefined' ? stored : ''
}

const AdminContextProvider = (props) => {
  const [aToken, setAToken] = useState(readAdminToken)
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [dashData, setDashData] = useState(false)
  const [dashLoading, setDashLoading] = useState(false)
  const [dashError, setDashError] = useState('')

  const clearAdminSession = () => {
    localStorage.removeItem('aToken')
    setAToken('')
  }

  const handleAuthError = (error, data) => {
    if (error?.isAuthError || data?.code === 'AUTH_INVALID') {
      clearAdminSession()
      toast.info('Please login again')
      return true
    }
    return false
  }

  const getAllDoctors = async () => {
    try {
      const { data } = await axiosClient.get(backendUrl + '/api/admin/all-doctors', {
        headers: { atoken: aToken },
      })
      if (data.success) setDoctors(data.doctors)
      else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const changeAvailability = async (docId) => {
    try {
      const { data } = await axiosClient.post(
        backendUrl + '/api/admin/change-availability',
        { docId },
        { headers: { atoken: aToken } }
      )
      if (data.success) {
        toast.success(data.message)
        getAllDoctors()
      } else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const getAllAppointments = async () => {
    try {
      const { data } = await axiosClient.get(backendUrl + '/api/admin/appointments', {
        headers: { atoken: aToken },
      })
      if (data.success) {
        const list = Array.isArray(data.appointments) ? data.appointments : []
        setAppointments([...list].reverse())
      }
      else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axiosClient.post(
        backendUrl + '/api/admin/cancel-appointment',
        { appointmentId },
        { headers: { atoken: aToken } }
      )
      if (data.success) {
        toast.success(data.message)
        getAllAppointments()
      } else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const getDashData = async () => {
    if (!aToken) return
    setDashLoading(true)
    setDashError('')
    try {
      const { data } = await axiosClient.get(backendUrl + '/api/admin/dashboard', {
        headers: { atoken: aToken },
      })
      if (data.success) {
        setDashData(data.dashData)
      } else if (!handleAuthError(null, data)) {
        setDashError(data.message || 'Could not load dashboard')
        toast.error(data.message)
      }
    } catch (error) {
      if (!handleAuthError(error)) {
        setDashError(error.message)
        if (!error?.isNetworkError) toast.error(error.message)
      }
    } finally {
      setDashLoading(false)
    }
  }

  const value = {
    aToken,
    setAToken,
    backendUrl,
    doctors,
    getAllDoctors,
    changeAvailability,
    appointments,
    setAppointments,
    getAllAppointments,
    cancelAppointment,
    getDashData,
    dashData,
    dashLoading,
    dashError,
    clearAdminSession,
  }

  return (
    <AdminContext.Provider value={value}>{props.children}</AdminContext.Provider>
  )
}

export default AdminContextProvider
