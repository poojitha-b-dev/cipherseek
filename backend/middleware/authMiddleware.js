// backend/middleware/authMiddleware.js
// JWT authentication middleware for protected routes
//
// FIXES vs original:
//  - Expired tokens now return 401 (not 400), so the frontend auto-logout
//    in AuthContext.authFetch() triggers correctly
//  - Distinguishes between "no token", "expired token", and "invalid token"
//    for clearer client-side error handling

const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // 401 so the frontend knows to attempt a token refresh
      return res.status(401).json({ message: 'Token expired.', expired: true });
    }
    // Any other JWT error (malformed, wrong secret, etc.)
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = { authenticateUser };
