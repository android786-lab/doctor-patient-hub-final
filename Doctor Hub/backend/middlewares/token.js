import jwt from 'jsonwebtoken'

export function getBearerOrHeaderToken(req, headerName = 'token') {
  if (req.cookies?.token) return req.cookies.token.trim()

  const direct = req.headers[headerName]
  if (direct && typeof direct === 'string') return direct.trim()

  const auth = req.headers.authorization
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }

  return null
}

export function verifyJwt(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set on the server')
  }
  return jwt.verify(token, process.env.JWT_SECRET)
}

export function authErrorMessage(error) {
  if (error.name === 'TokenExpiredError') {
    return 'Session expired — please login again'
  }
  if (error.name === 'JsonWebTokenError') {
    return 'Session invalid — please login again'
  }
  return error.message || 'Authentication failed'
}
