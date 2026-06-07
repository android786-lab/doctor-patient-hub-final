import { useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import AppointmentChatPanel from '@doctor-hub/ui/AppointmentChatPanel.jsx'
import { AppContext } from '../../context/AppContext.jsx'
export default function PatientAppointmentChat() {
  const { appointmentId } = useParams()
  const { backendUrl, token } = useContext(AppContext)

  const authHeaders = useMemo(() => () => ({ token }), [token])

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AppointmentChatPanel
        appointmentId={appointmentId}
        backendUrl={backendUrl}
        authHeaders={authHeaders}
        backLink="/patient/messages"
        backLabel="← Messages"
      />
      <p className="mt-3 text-center text-xs text-slate-500">
        Messages refresh automatically. Use <strong>Start video call</strong> in the chat card for the
        same room as your doctor.
      </p>
    </div>
  )
}
