import rateLimit from 'express-rate-limit'

/** Brute-force protection for login/register/forgot-password */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: false,
})
