/** Standalone Vercel function — tests that /api/health deploys (no Express import). */
export default function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.status(200).end(
    JSON.stringify({ ok: true, service: 'doctor-hub-api', via: 'api/health.js' })
  )
}
