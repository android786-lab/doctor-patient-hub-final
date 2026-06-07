import { useContext, useMemo } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import MessagesInbox from '@doctor-hub/ui/MessagesInbox.jsx'

export default function DoctorMessages() {
  const { dToken, backendUrl } = useContext(DoctorContext)

  const authHeaders = useMemo(
    () => () => ({ dtoken: dToken, token: dToken }),
    [dToken]
  )

  return (
    <MessagesInbox
      backendUrl={backendUrl}
      authHeaders={authHeaders}
      role="doctor"
      title="Messages"
      description="Chat with your patients for confirmed appointments. Replies appear in real time."
    />
  )
}
