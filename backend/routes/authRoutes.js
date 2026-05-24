// backend/routes/authRoutes.js
// Production-grade authentication routes for PPSE
// Handles: register, verify-email, login, refresh-token,
//           forgot-password, reset-password, change-password, me

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const connection = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authLimiter, passwordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Wrap connection.query in a Promise so we can use async/await cleanly */
function dbQuery(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

/** Sign a short-lived access token (15 min) */
function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

/** Sign a long-lived refresh token (7 days) */
function signRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// Creates account, sends verification email
// ─────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email address.' });
  }

  try {
    // Check duplicate email or username
    const existing = await dbQuery(
      'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [email.toLowerCase(), username]
    );
    if (existing.length > 0) {
      // Deliberately vague to prevent user enumeration
      return res.status(400).json({ message: 'An account with that email or username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await dbQuery(
      `INSERT INTO users
         (username, email, password_hash, email_verified, verification_token, verification_expires)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [username, email.toLowerCase(), passwordHash, verificationToken, verificationExpires]
    );

    // Send verification email (non-blocking — failure shouldn't block the response)
    try {
      await sendVerificationEmail(email, username, verificationToken);
    } catch (mailErr) {
      console.error('Verification email failed to send:', mailErr.message);
      // We still let registration succeed; user can request resend later
    }

    return res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      // In development, echo the token so you can test without a real inbox
      ...(process.env.NODE_ENV !== 'production' && { devVerificationToken: verificationToken }),
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/verify-email/:token
// Verifies the email address via the link clicked in inbox
// ─────────────────────────────────────────────
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const rows = await dbQuery(
      'SELECT id, email_verified, verification_expires FROM users WHERE verification_token = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or already used verification link.' });
    }

    const user = rows[0];

    if (user.email_verified) {
      return res.status(200).json({ message: 'Email already verified. You can log in.' });
    }

    if (new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({ message: 'Verification link has expired. Please request a new one.' });
    }

    await dbQuery(
      'UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    return res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ message: 'Server error during verification.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/resend-verification
// Re-sends verification email if the original expired
// ─────────────────────────────────────────────
router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required.' });

  // Always respond generically to prevent enumeration
  const generic = { message: 'If that email exists and is unverified, a new link has been sent.' };

  try {
    const rows = await dbQuery(
      'SELECT id, username, email_verified FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase()]
    );

    if (rows.length === 0 || rows[0].email_verified) {
      return res.status(200).json(generic);
    }

    const user = rows[0];
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await dbQuery(
      'UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?',
      [newToken, newExpiry, user.id]
    );

    try {
      await sendVerificationEmail(email, user.username, newToken);
    } catch (mailErr) {
      console.error('Resend verification email failed:', mailErr.message);
    }

    return res.status(200).json(generic);
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Returns access token + refresh token
// ─────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const rows = await dbQuery(
      'SELECT id, username, email, password_hash, email_verified FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase()]
    );

    // Generic message to prevent user enumeration
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email,
      });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    // Store hashed refresh token in DB
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await dbQuery(
      'UPDATE users SET refresh_token_hash = ?, refresh_token_expires = ?, last_login = NOW() WHERE id = ?',
      [refreshTokenHash, refreshExpiry, user.id]
    );

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// Issues a new access token using a valid refresh token
// ─────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required.' });
  }

  try {
    // Verify JWT signature first
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    // Verify hash is stored in DB and hasn't expired
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const rows = await dbQuery(
      'SELECT id, username, email, refresh_token_expires FROM users WHERE id = ? AND refresh_token_hash = ? LIMIT 1',
      [decoded.userId, refreshTokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Refresh token revoked or not recognized.' });
    }

    const user = rows[0];

    if (new Date() > new Date(user.refresh_token_expires)) {
      return res.status(401).json({ message: 'Refresh token expired. Please log in again.' });
    }

    // Issue a new access token (and rotate the refresh token)
    const newAccessToken = signAccessToken(user.id);
    const newRefreshToken = signRefreshToken(user.id);
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const newRefreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await dbQuery(
      'UPDATE users SET refresh_token_hash = ?, refresh_token_expires = ? WHERE id = ?',
      [newRefreshHash, newRefreshExpiry, user.id]
    );

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ message: 'Server error during token refresh.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// Revokes the refresh token stored in DB
// ─────────────────────────────────────────────
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    await dbQuery(
      'UPDATE users SET refresh_token_hash = NULL, refresh_token_expires = NULL WHERE id = ?',
      [req.user.userId]
    );
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Server error during logout.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a password reset link to the registered email
// ─────────────────────────────────────────────
router.post('/forgot-password', passwordLimiter, async (req, res) => {
  const { email } = req.body;

  // Always respond the same way to prevent enumeration
  const generic = { message: 'If an account with that email exists, a password reset link has been sent.' };

  if (!email) return res.status(200).json(generic);

  try {
    const rows = await dbQuery(
      'SELECT id, username, email_verified FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase()]
    );

    if (rows.length === 0 || !rows[0].email_verified) {
      return res.status(200).json(generic);
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await dbQuery(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
      [resetTokenHash, resetExpiry, user.id]
    );

    try {
      await sendPasswordResetEmail(email, user.username, resetToken);
    } catch (mailErr) {
      console.error('Reset email failed to send:', mailErr.message);
    }

    return res.status(200).json(generic);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// Validates reset token and sets the new password
// ─────────────────────────────────────────────
router.post('/reset-password', passwordLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const rows = await dbQuery(
      'SELECT id, reset_token_expires FROM users WHERE reset_token_hash = ? LIMIT 1',
      [resetTokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or already used reset link.' });
    }

    const user = rows[0];

    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Update password, clear reset token, revoke all refresh tokens (force re-login everywhere)
    await dbQuery(
      `UPDATE users
       SET password_hash = ?,
           reset_token_hash = NULL,
           reset_token_expires = NULL,
           refresh_token_hash = NULL,
           refresh_token_expires = NULL
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    return res.status(200).json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error during password reset.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/change-password
// Authenticated: changes password when user knows the current one
// ─────────────────────────────────────────────
router.post('/change-password', authenticateUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'New password must differ from current password.' });
  }

  try {
    const rows = await dbQuery(
      'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await dbQuery(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.user.userId]
    );

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// Returns the current user profile (used on app reload to validate token)
// ─────────────────────────────────────────────
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT id, username, email, email_verified, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
