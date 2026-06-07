import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'

const PaymentSuccess = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext)
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Verifying payment...')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sessionId = params.get('session_id')
    if (!sessionId) {
      setStatus('No session id found')
      toast.error('No session id found')
      setTimeout(() => navigate('/my-appointments'), 1500)
      return
    }

    const verify = async () => {
      try {
        const { data } = await axios.post(
          backendUrl + '/api/user/verifySTRIPE',
          { session_id: sessionId },
          { headers: { token } }
        )
        if (data.success) {
          setStatus('Payment successful!')
          toast.success(data.message || 'Payment successful')
          try {
            getDoctorsData && getDoctorsData()
          } catch (e) {}
          setTimeout(() => navigate('/my-appointments'), 1200)
        } else {
          setStatus('Payment verification failed')
          toast.error(data.message || 'Payment verification failed')
          setTimeout(() => navigate('/my-appointments'), 1400)
        }
      } catch (error) {
        console.error(error)
        setStatus('Error verifying payment')
        toast.error(error.message || 'Error verifying payment')
        setTimeout(() => navigate('/my-appointments'), 1400)
      }
    }

    verify()
  }, [location.search, backendUrl, token, navigate, getDoctorsData])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="dh-card w-full max-w-md px-6 py-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">✓</div>
        <p className="text-base font-medium text-slate-700 sm:text-lg">{status}</p>
        <p className="mt-2 text-sm text-slate-500">Redirecting to your appointments…</p>
      </div>
    </div>
  )
}

export default PaymentSuccess
