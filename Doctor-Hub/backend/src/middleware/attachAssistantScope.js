import { resolveAssistantAssignment } from '../utils/assistantRows.js'

/** After authAdmin: loads assigned doctor for assistant role. */
export default async function attachAssistantScope(req, res, next) {
  if (req.user?.role !== 'assistant') {
    return next()
  }

  try {
    const assignment = await resolveAssistantAssignment(req.user.id)
    if (!assignment) {
      return res.status(403).json({
        success: false,
        message:
          'No doctor assigned to your assistant account. Ask admin or super admin to link you under Assign.',
      })
    }
    req.assistantAssignment = assignment
    return next()
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}
