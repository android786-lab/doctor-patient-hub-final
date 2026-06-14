import {
  getBearerOrHeaderToken,
  verifyJwt,
  authErrorMessage,
} from './token.js'

const STAFF_ROLES = new Set(['admin', 'super_admin', 'assistant'])

const authAdmin = async (req, res, next) => {
  const atoken = getBearerOrHeaderToken(req, 'atoken')
  const unified = getBearerOrHeaderToken(req, 'token')
  const token = unified || atoken

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not Authorized Login Again' })
  }

  try {
    const decoded = verifyJwt(token)

    if (!decoded?.id || typeof decoded !== 'object') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token — please login again',
        code: 'AUTH_INVALID',
      })
    }

    const role = decoded.role
    if (!STAFF_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role,
    }
    return next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: authErrorMessage(error),
      code: 'AUTH_INVALID',
    })
  }
}

export default authAdmin
