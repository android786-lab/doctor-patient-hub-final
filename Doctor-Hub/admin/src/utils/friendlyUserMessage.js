const TECHNICAL_HINT =
  /supabase\/|sql editor|\.env|vite_|npm run|localhost:\d+|project folder|backend logs|smtp settings on the server|schema cache|does not exist|table missing|references profiles|super_admin_|storage bucket missing|permission error/i

export function friendlyUserMessage(
  message,
  fallback = 'Something went wrong. Please try again or contact support.'
) {
  if (!message || typeof message !== 'string') return fallback
  if (/invalid signature|jwt malformed|jwt expired|not authorized/i.test(message)) {
    return 'Session expired — please sign in again'
  }
  if (/535|badcredentials|invalid login|smtp|gsmtp/i.test(message)) {
    return 'We could not send the reset email. Please try again later or contact the hospital help desk.'
  }
  if (TECHNICAL_HINT.test(message)) return fallback
  return message
}

export const NETWORK_UNAVAILABLE =
  'Unable to connect to the server. Please check your connection and try again.'

export const CHAT_UNAVAILABLE =
  'Chat is not available right now. Please try again later or contact hospital support.'
