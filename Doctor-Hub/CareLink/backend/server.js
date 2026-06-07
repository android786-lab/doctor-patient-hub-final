import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import userRouter from './routes/userRoute.js'
import healthRouter from './routes/healthRoute.js'

const app = express()
const port = process.env.PORT || 4000

// Initialize Cloudinary once at startup (non-blocking)
try {
    connectCloudinary()
} catch (err) {
    console.error('Cloudinary init failed:', err.message)
}

app.use(express.json())
app.use(cors())

// Health check — must be before any heavy middleware
app.use('/health', healthRouter)

app.use('/api/admin', adminRouter)
app.use('/api/doctor', doctorRouter)
app.use('/api/user', userRouter)

app.get('/', (_req, res) => res.json({ status: 'ok', message: 'API Working' }))

// Global error handler — prevents cold-start crashes from leaking stack traces
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err.message)
    res.status(500).json({ success: false, message: 'Internal server error' })
})

// Only listen when running locally, not on Vercel serverless
if (process.env.VERCEL !== '1') {
    app.listen(port, () => console.log(`Server started on PORT:${port}`))
}

export default app
