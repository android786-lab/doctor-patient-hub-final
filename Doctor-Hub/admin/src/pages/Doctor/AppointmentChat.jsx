import { useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import AppointmentChatPanel from '@doctor-hub/ui/AppointmentChatPanel.jsx'
import { DoctorContext } from '../../context/DoctorContext'
import { AdminContext } from '../../context/AdminContext'
import { roleFromToken } from '../../utils/staffRole.js'

export default function DoctorAppointmentChat() {
  const { appointmentId } = useParams()
  const { dToken, backendUrl: doctorBackend } = useContext(DoctorContext)
  const { aToken, backendUrl: adminBackend } = useContext(AdminContext)

  const staffRole = aToken ? roleFromToken(aToken) : null
  const isAssistant = staffRole === 'assistant'
  const token = dToken || aToken
  const backendUrl = doctorBackend || adminBackend

  const authHeaders = useMemo(
    () => () =>
      isAssistant
        ? { atoken: token, token, dtoken: token }
        : { dtoken: token, token },
    [token, isAssistant]
  )

  return (
    <div className="p-6 lg:p-8">
      <AppointmentChatPanel
        appointmentId={appointmentId}
        backendUrl={backendUrl}
        authHeaders={authHeaders}
        backLink={isAssistant ? '/assistant/messages' : '/doctor/messages'}
        backLabel="← Messages"
      />
      <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-slate-500">
        Use <strong>Start video call</strong> below — the patient joins the same room from their chat.
      </p>
    </div>
  )
}
