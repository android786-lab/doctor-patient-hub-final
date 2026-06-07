import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

import cors from 'cors'

import cookieParser from 'cookie-parser'

import 'dotenv/config'

import securityHeaders from './src/middleware/securityHeaders.js'

import connectCloudinary from './config/cloudinary.js'



import healthRouter from './routes/healthRoute.js'

import adminRouter from './routes/adminRoute.js'

import doctorRouter from './routes/doctorRoute.js'

import userRouter from './routes/userRoute.js'

import aiRouter from './routes/aiRoute.js'

import assistantRouter from './routes/assistantRoute.js'



import authRoutes from './src/routes/auth.js'

import doctorsRoutes from './src/routes/doctors.js'

import patientsRoutes from './src/routes/patients.js'

import appointmentsRoutes from './src/routes/appointments.js'

import paymentsRoutes from './src/routes/payments.js'

import historyRoutes from './src/routes/history.js'
import prescriptionsRoutes from './src/routes/prescriptions.js'

import clinicsRoutes from './src/routes/clinics.js'
import adminPortalRoutes from './src/routes/adminPortal.js'
import assistantPortalRoutes from './src/routes/assistantPortal.js'
import superAdminPortalRoutes from './src/routes/superAdminPortal.js'
import patientPortalRoutes from './src/routes/patientPortal.js'



const app = express()

const port = process.env.PORT || 4000

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
]
  .filter(Boolean)
  .map((o) => o.replace(/\/$/, ''))



try {

  connectCloudinary()

} catch (err) {

  console.error('Cloudinary init failed:', err.message)

}



app.use(securityHeaders)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      const normalized = origin.replace(/\/$/, '')
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true)
      }
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use(cookieParser())

app.use(express.json())

app.use(express.urlencoded({ extended: true }))



app.use('/health', healthRouter)



/** Module 1 doc-aligned API (keeps legacy routes below) */

app.use('/api/auth', authRoutes)

app.use('/api/doctors', doctorsRoutes)

app.use('/api/patients', patientsRoutes)

app.use('/api/appointments', appointmentsRoutes)

app.use('/api/payments', paymentsRoutes)

app.use('/api/history', historyRoutes)

app.use('/api/prescriptions', prescriptionsRoutes)

app.use('/api/clinics', clinicsRoutes)

app.use('/api/admin', adminPortalRoutes)
app.use('/api/superadmin', superAdminPortalRoutes)
app.use('/api/assistant', assistantPortalRoutes)
app.use('/api/patient', patientPortalRoutes)

/** Legacy routes — still used by working UI */

app.use('/api/admin', adminRouter)

app.use('/api/doctor', doctorRouter)

app.use('/api/user', userRouter)

app.use('/api/ai', aiRouter)

app.use('/api/assistant', assistantRouter)



app.get('/', (_req, res) =>

  res.json({ status: 'ok', message: 'Doctor Hub API', module: 1 })

)



app.get('/api/health', (_req, res) => {

  res.json({ ok: true, service: 'doctor-hub-api' })

})



app.use((err, req, res, next) => {
  if (err?.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: 'Origin not allowed' })
  }
  if (err?.name === 'MulterError' || /Only JPG|PNG|5MB|file/i.test(err?.message || '')) {
    return res.status(400).json({ success: false, message: err.message })
  }
  console.error('Unhandled error:', err.message)
  res.status(500).json({ success: false, message: 'Internal server error' })
})



if (process.env.VERCEL !== '1') {

  app.listen(port, () => {

    console.log(`Server started on PORT:${port}`)

    if (!process.env.JWT_SECRET) {

      console.error('WARNING: JWT_SECRET missing — login will fail')

    }

  })

}



export default app


