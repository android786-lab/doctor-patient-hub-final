import { useContext, useMemo } from 'react'
import { AdminContext } from '../../context/AdminContext'
import MessagesInbox from '@doctor-hub/ui/MessagesInbox.jsx'

export default function AssistantMessages() {
  const { aToken, backendUrl } = useContext(AdminContext)

  const authHeaders = useMemo(
    () => () => ({ atoken: aToken, token: aToken, dtoken: aToken }),
    [aToken]
  )

  return (
    <MessagesInbox
      backendUrl={backendUrl}
      authHeaders={authHeaders}
      role="assistant"
      title="Messages"
      description="Patient messages for your assigned doctor. You can reply on behalf of the clinic."
    />
  )
}
