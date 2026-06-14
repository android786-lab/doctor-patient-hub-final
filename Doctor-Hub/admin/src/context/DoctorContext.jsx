import { createContext, useState } from 'react'
import axiosClient from '../lib/axiosClient'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../utils/constants.js'

export const DoctorContext = createContext()

function readDoctorToken() {
  const stored = localStorage.getItem('dToken')
  const looksLikeJwt = stored && stored.split('.').length === 3
  if (stored && !looksLikeJwt) localStorage.removeItem('dToken')
  return looksLikeJwt && stored !== 'null' ? stored : ''
}

const DoctorContextProvider = (props) => {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')
  const [dToken, setDToken] = useState(readDoctorToken)
  const [appointments, setAppointments] = useState([])
  const [dashData, setDashData] = useState(false)
  const [profileData, setProfileData] = useState(false)

  const clearDoctorSession = () => {
    localStorage.removeItem('dToken')
    setDToken('')
  }

  const headers = () => ({ headers: { dtoken: dToken } })

  const handleAuthError = (error, data) => {
    if (error?.isAuthError || data?.code === 'AUTH_INVALID') {
      clearDoctorSession()
      toast.info('Please sign in again')
      return true
    }
    return false
  }

  const getAppointments = async () => {
    if (!dToken) return
    try {
      const { data } = await axiosClient.get(
        backendUrl + '/api/doctor/appointments',
        headers()
      )
      if (data.success) setAppointments(data.appointments.reverse())
      else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const completeAppointment = async (appointmentId) => {
    try {
      const { data } = await axiosClient.post(
        backendUrl + '/api/doctors/appointments/complete',
        { appointmentId },
        headers()
      )
      if (data.success) {
        toast.success(data.message)
        getAppointments()
        getDashData()
      } else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axiosClient.post(
        backendUrl + '/api/doctors/appointments/cancel',
        { appointmentId },
        headers()
      )
      if (data.success) {
        toast.success(data.message)
        getAppointments()
        getDashData()
      } else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const getDashData = async () => {
    if (!dToken) return
    try {
      const { data } = await axiosClient.get(
        backendUrl + '/api/doctor/dashboard',
        headers()
      )
      if (data.success) setDashData(data.dashData)
      else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const getProfileData = async () => {
    if (!dToken) return
    try {
      const { data } = await axiosClient.get(
        backendUrl + '/api/doctor/profile',
        headers()
      )
      if (data.success) setProfileData(data.profileData || data.profile)
      else if (!handleAuthError(null, data)) toast.error(data.message)
    } catch (error) {
      if (!handleAuthError(error) && !error?.isNetworkError) toast.error(error.message)
    }
  }

  const value = {
    dToken,
    setDToken,
    backendUrl,
    getAppointments,
    appointments,
    setAppointments,
    completeAppointment,
    cancelAppointment,
    getDashData,
    dashData,
    setDashData,
    getProfileData,
    setProfileData,
    profileData,
    clearDoctorSession,
  }

  return (
    <DoctorContext.Provider value={value}>{props.children}</DoctorContext.Provider>
  )
}

export default DoctorContextProvider
