import { submitManualPaymentProof } from '../utils/manualPaymentRows.js'

export async function paymentManual(req, res) {
  try {
    const userId = req.body?.userId || req.userId || req.user?.id
    const appointmentId = req.body?.appointmentId
    const paymentMethod = req.body?.paymentMethod
    const reference = req.body?.reference || req.body?.transactionId

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'appointmentId is required' })
    }
    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Select how you paid (JazzCash, EasyPaisa, etc.)' })
    }

    const result = await submitManualPaymentProof({
      userId,
      appointmentId,
      paymentMethod,
      reference,
      imageFile: req.file,
    })

    return res.json(result)
  } catch (err) {
    console.error('paymentManual:', err)
    return res.status(400).json({ success: false, message: err.message || 'Could not submit payment proof' })
  }
}
