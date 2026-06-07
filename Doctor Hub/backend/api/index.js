/**
 * Vercel serverless entry — re-exports Express app from server.js.
 * Local dev still uses `node server.js` / `npm run dev` unchanged.
 */
import app from '../server.js'

export default app
