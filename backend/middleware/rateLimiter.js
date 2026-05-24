// backend/middleware/rateLimiter.js
// Simple in-memory rate limiter — no extra npm packages needed.
// For production at scale, swap with express-rate-limit + Redis.

const windows = new Map(); // key → { count, resetAt }

function createLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    // Use IP as key; trust proxy must be set in server.js for Railway
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let entry = windows.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      windows.set(key, entry);
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({ message: message || 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// General auth endpoints: 20 requests per 15 minutes per IP
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests from this IP. Please wait 15 minutes before trying again.',
});

// Password-sensitive endpoints: 5 requests per hour per IP
const passwordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts. Please wait 1 hour before trying again.',
});

module.exports = { authLimiter, passwordLimiter };
