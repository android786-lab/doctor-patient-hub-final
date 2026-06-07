import express from 'express'

const healthRouter = express.Router()

// Lightweight health check — no DB, no external calls
healthRouter.get('/', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    })
})

export default healthRouter
