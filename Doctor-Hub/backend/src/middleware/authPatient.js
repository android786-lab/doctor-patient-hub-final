import authMiddleware from './authMiddleware.js'

export default function authPatient(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' })
    }
    next()
  })
}
