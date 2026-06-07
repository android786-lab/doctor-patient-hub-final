import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

const MedicalHistory = () => {
  const { backendUrl, token } = useContext(AppContext)
  const navigate = useNavigate()
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!token) {
      toast.warn('Please login first')
      navigate('/login')
      return
    }
    load()
  }, [token])

  const load = async () => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/history/list',
        {},
        { headers: { token } }
      )
      if (data.success) setHistory(data.history)
      else toast.error(data.message)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold text-gray-800">Medical History</h1>
      <p className="text-sm text-gray-500 mt-2">
        Records cannot be deleted — doctors append only (documentation rule)
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {history.length === 0 ? (
          <p className="text-gray-400 text-sm">No records yet.</p>
        ) : (
          history.map((h) => (
            <div key={h.id} className="border rounded-lg p-4 bg-white">
              <p className="font-medium">{h.title}</p>
              <p className="text-sm text-gray-600 mt-1">{h.description}</p>
              {h.diagnosis && (
                <p className="text-xs text-primary mt-2">Diagnosis: {h.diagnosis}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(h.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MedicalHistory
