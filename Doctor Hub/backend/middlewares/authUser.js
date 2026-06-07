import authMiddleware from '../src/middleware/authMiddleware.js'
import {
  getBearerOrHeaderToken,
  verifyJwt,
  authErrorMessage,
} from './token.js'

const authUser = async (req, res, next) => {
  const token = getBearerOrHeaderToken(req, 'token')
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not Authorized Login Again' })
  }

  try {
    const decoded = verifyJwt(token)
    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user token — please login again',
      })
    }

    if (decoded.role && decoded.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this role',
      })
    }

    if (!req.body) req.body = {}
    req.body.userId = decoded.id
    req.userId = decoded.id
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'patient',
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

export { authMiddleware }
export default authUser
