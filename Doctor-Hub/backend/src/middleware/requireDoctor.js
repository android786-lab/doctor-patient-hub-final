/** Only users with role doctor (not assistant acting as doctor). */
export default function requireDoctor(req, res, next) {
  if (req.user?.role === 'assistant') {
    return res.status(403).json({
      success: false,
      message: 'This action requires a doctor account',
    })
  }
  if (req.user?.role && req.user.role !== 'doctor') {
    return res.status(403).json({ success: false, message: 'Doctor access only' })
  }
  next()
}
