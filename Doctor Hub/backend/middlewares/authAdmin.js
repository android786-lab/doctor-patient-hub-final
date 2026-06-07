import {
  getBearerOrHeaderToken,
  verifyJwt,
  authErrorMessage,
} from './token.js'

const authAdmin = async (req, res, next) => {
  const atoken = getBearerOrHeaderToken(req, 'atoken')
  const unified = getBearerOrHeaderToken(req, 'token')

  if (unified) {
    try {
      const decoded = verifyJwt(unified)
      if (decoded?.role && ['admin', 'super_admin', 'assistant'].includes(decoded.role)) {
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role }
        return next()
      }
    } catch {
      /* fall through to legacy admin token */
    }
  }

  if (!atoken) {
    return res.status(401).json({ success: false, message: 'Not Authorized Login Again' })
  }

  try {
    const token_decode = verifyJwt(atoken)

    if (typeof token_decode === 'object' && token_decode?.role) {
      if (['admin', 'super_admin', 'assistant'].includes(token_decode.role)) {
        req.user = {
          id: token_decode.id,
          email: token_decode.email,
          role: token_decode.role,
        }
        return next()
      }
    }

    const superExpected =
      process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD
        ? `${process.env.SUPER_ADMIN_EMAIL}${process.env.SUPER_ADMIN_PASSWORD}`
        : null
    const adminExpected = `${process.env.ADMIN_EMAIL}${process.env.ADMIN_PASSWORD}`

    if (superExpected && token_decode === superExpected) {
      req.user = {
        id: 'env-super-admin',
        email: process.env.SUPER_ADMIN_EMAIL,
        role: 'super_admin',
      }
      return next()
    }

    if (token_decode === adminExpected) {
      req.user = { id: 'env-admin', email: process.env.ADMIN_EMAIL, role: 'admin' }
      return next()
    }

    return res.status(401).json({
      success: false,
      message: 'Not Authorized Login Again',
      code: 'AUTH_INVALID',
    })
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: authErrorMessage(error),
      code: 'AUTH_INVALID',
    })
  }
}

export default authAdmin
