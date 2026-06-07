import jwt from 'jsonwebtoken'

function extractToken(req) {
  if (req.cookies?.token) return req.cookies.token

  const auth = req.headers.authorization
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }

  const headerToken =
    req.headers.token || req.headers.dtoken || req.headers.atoken
  if (headerToken && typeof headerToken === 'string') return headerToken.trim()

  return null
}

export default function authMiddleware(req, res, next) {
  const token = extractToken(req)

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (!decoded?.id) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    }

    if (!req.body) req.body = {}
    req.body.userId = decoded.id
    req.userId = decoded.id

    next()
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired'
        : err.name === 'JsonWebTokenError'
          ? 'Invalid token'
          : err.message || 'Authentication failed'
    return res.status(401).json({ message, code: 'AUTH_INVALID' })
  }
}

export { extractToken }
