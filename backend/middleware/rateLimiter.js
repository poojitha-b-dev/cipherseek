// backend/middleware/rateLimiter.js
// In-memory rate limiter — no extra packages needed.
// For production scale, replace with express-rate-limit + Redis.

const windows = new Map();

function createLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    const ip  = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let entry = windows.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      windows.set(key, entry);
    }
    entry.count++;

    if (entry.count > max) {
      const retry = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retry));
      return res.status(429).json({ message });
    }
    next();
  };
}

// General auth: 20 req / 15 min per IP
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests. Please wait 15 minutes before trying again.',
});

// Password endpoints: 5 req / hour per IP
const passwordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many attempts. Please wait 1 hour before trying again.',
});

module.exports = { authLimiter, passwordLimiter };
