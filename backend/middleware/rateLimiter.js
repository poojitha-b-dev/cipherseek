// backend/middleware/rateLimiter.js
// Rate limiting for authentication endpoints
// Prevents brute-force attacks on login, register, and password reset
//
// Install: npm install express-rate-limit

const rateLimit = require('express-rate-limit');

/**
 * General auth limiter — applied to /register, /login, /resend-verification
 * 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
  // Skip in test/dev if desired:
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Stricter limiter for password operations — /forgot-password, /reset-password
 * 5 requests per hour per IP
 */
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset attempts. Please try again in 1 hour.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { authLimiter, passwordLimiter };
