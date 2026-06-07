import { useContext, useMemo } from 'react'
import { AppContext } from '../../context/AppContext.jsx'
import MessagesInbox from '@doctor-hub/ui/MessagesInbox.jsx'

export default function PatientMessages() {
  const { token, backendUrl } = useContext(AppContext)

  const authHeaders = useMemo(() => () => ({ token }), [token])

  return (
    <MessagesInbox
      backendUrl={backendUrl}
      authHeaders={authHeaders}
      role="patient"
      title="Messages"
      description="Secure chat with your doctors for confirmed appointments. Video call is available inside each thread."
    />
  )
}
