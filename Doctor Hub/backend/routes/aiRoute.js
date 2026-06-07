import express from 'express'
import jwt from 'jsonwebtoken'
import { predictDisease } from '../controllers/aiController.js'

const router = express.Router()

router.post('/predict-disease', (req, res, next) => {
  const { token } = req.headers
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.body.userId = decoded.id
    } catch {
      /* guest mode */
    }
  }
  predictDisease(req, res, next)
})

export default router
