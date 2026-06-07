/**
 * Vercel serverless entry — re-exports Express app from server.js.
 * Local dev: unchanged (`npm run dev` uses server.js directly).
 */
import app from '../server.js'

export default app
