import { Navigate, useParams } from 'react-router-dom'

/** Legacy URL → appointment chat */
export default function Consultation() {
  const { id } = useParams()
  return <Navigate to={`/patient/appointments/${id}/chat`} replace />
}
