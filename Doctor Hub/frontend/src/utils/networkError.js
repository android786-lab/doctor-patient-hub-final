/** Shared flag so only one "server unreachable" toast shows at a time */
let lastNetworkToastAt = 0

export function isNetworkError(error) {
  const msg = error?.message || ''
  return (
    !error?.response &&
    (/network error/i.test(msg) || /fetch failed/i.test(msg) || error?.code === 'ERR_NETWORK')
  )
}

export function notifyNetworkErrorOnce() {
  const now = Date.now()
  if (now - lastNetworkToastAt < 12000) return false
  lastNetworkToastAt = now
  return true
}

export const NETWORK_ERROR_HINT =
  'Backend not reachable. From project folder run: npm run dev (API should be on http://localhost:4000)'
