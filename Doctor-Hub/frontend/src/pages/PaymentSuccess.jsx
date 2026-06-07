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
        const { data } = await axios.post(backendUrl + '/api/user/verifySTRIPE', { session_id: sessionId }, { headers: { token } })
        if (data.success) {
          setStatus('Payment successful!')
          toast.success(data.message || 'Payment successful')
          // refresh appointments and doctors data if available
          try { getDoctorsData && getDoctorsData() } catch (e) {}
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
  }, [location.search])

  return (
    <div className='mt-24 text-center'>
      <p className='text-lg font-medium text-gray-700'>{status}</p>
    </div>
  )
}

export default PaymentSuccess
