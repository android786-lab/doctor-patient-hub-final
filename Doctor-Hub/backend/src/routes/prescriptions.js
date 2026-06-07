import { Router } from 'express'

const router = Router()

router.delete('/:id', (_req, res) => {
  return res.status(403).json({ message: 'Prescriptions cannot be deleted' })
})

router.patch('/:id', (_req, res) => {
  return res.status(403).json({ message: 'Prescriptions cannot be edited' })
})

router.put('/:id', (_req, res) => {
  return res.status(403).json({ message: 'Prescriptions cannot be edited' })
})

export default router
