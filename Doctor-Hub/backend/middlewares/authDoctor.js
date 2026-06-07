import {
  getBearerOrHeaderToken,
  verifyJwt,
  authErrorMessage,
} from './token.js'
import { resolveAssistantAssignment } from '../src/utils/assistantRows.js'

const authDoctor = async (req, res, next) => {
  const dtoken = getBearerOrHeaderToken(req, 'dtoken')
  const unified = getBearerOrHeaderToken(req, 'token')

  const token = dtoken || unified
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token missing',
    })
  }

  try {
    const decoded = verifyJwt(token)
    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid doctor token — please login again',
      })
    }

    if (decoded.role === 'assistant') {
      const assignment = await resolveAssistantAssignment(decoded.id)
      if (!assignment?.doctorUserId) {
        return res.status(403).json({
          success: false,
          message:
            'No doctor linked to this assistant. Ask admin to assign you to a doctor first.',
        })
      }
      req.user = {
        id: assignment.doctorUserId,
        email: decoded.email,
        role: 'assistant',
        assistantUserId: decoded.id,
        doctorRowId: assignment.doctorRowId,
      }
      req.assistantAssignment = assignment
      return next()
    }

    if (decoded.role && decoded.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'doctor',
    }
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: authErrorMessage(error),
      code: 'AUTH_INVALID',
    })
  }
}

export default authDoctor
