import { getBearerOrHeaderToken, verifyJwt, authErrorMessage } from '../../middlewares/token.js'
import { resolveAssistantAssignment } from '../utils/assistantRows.js'

/** Patient (token) or doctor / assistant-on-behalf-of-doctor for appointment chat. */
export default async function authConsultParticipant(req, res, next) {
  const dtoken = getBearerOrHeaderToken(req, 'dtoken')
  const token = getBearerOrHeaderToken(req, 'token')
  const auth = dtoken || token

  if (!auth) {
    return res.status(401).json({ success: false, message: 'Login required' })
  }

  try {
    const decoded = verifyJwt(auth)
    if (!decoded?.id) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    if (decoded.role === 'assistant') {
      const assignment = await resolveAssistantAssignment(decoded.id)
      if (!assignment?.doctorUserId) {
        return res.status(403).json({ success: false, message: 'No doctor assigned to assistant' })
      }
      req.consultUser = {
        id: assignment.doctorUserId,
        email: decoded.email,
        role: 'doctor',
      }
      req.assistantAssignment = assignment
      return next()
    }

    const role =
      decoded.role === 'doctor' || dtoken
        ? 'doctor'
        : decoded.role === 'patient' || !decoded.role
          ? 'patient'
          : null

    if (!role) {
      return res.status(403).json({ success: false, message: 'Only patient or doctor can use chat' })
    }

    req.consultUser = { id: decoded.id, email: decoded.email, role }
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: authErrorMessage(error),
    })
  }
}
