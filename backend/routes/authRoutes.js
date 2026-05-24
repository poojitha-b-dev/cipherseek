// backend/routes/authRoutes.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const connection = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authLimiter, passwordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function dbQuery(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Check whether an email address has a valid MX record (i.e. the domain
 * actually receives email). This is a lightweight DNS check — it does NOT
 * guarantee the mailbox exists, but it will catch fake domains like
 * "user@notarealdomain123.com" or typos like "user@gmai.com".
 *
 * For Gmail specifically we also do a quick HEAD request to the Google
 * accounts API to see if the address is associated with a Google account.
 */
function checkMxRecord(domain) {
  return new Promise((resolve) => {
    const dns = require('dns');
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * For Gmail addresses: hit the Google account-lookup endpoint.
 * Returns true if Google confirms the account exists, false otherwise.
 * Falls back to true (don't block) on network error so we never
 * accidentally block a valid user due to a transient failure.
 */
function checkGmailExists(email) {
  return new Promise((resolve) => {
    const url = `https://mail.google.com/mail/gxlu?email=${encodeURIComponent(email)}`;
    const req = https.request(url, { method: 'HEAD', timeout: 4000 }, (res) => {
      // Google returns Set-Cookie header only when the account exists
      const cookies = res.headers['set-cookie'];
      resolve(Array.isArray(cookies) && cookies.length > 0);
    });
    req.on('error', () => resolve(true));   // network error → don't block
    req.on('timeout', () => { req.destroy(); resolve(true); });
    req.end();
  });
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const emailLower = email.toLowerCase().trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // ── Domain / mailbox existence check ────────────────────────────
  const domain = emailLower.split('@')[1];

  const hasMx = await checkMxRecord(domain);
  if (!hasMx) {
    return res.status(400).json({
      message: `The domain "${domain}" does not appear to accept email. Please use a real email address.`,
    });
  }

  // For Gmail specifically, verify the account exists
  const isGmail = domain === 'gmail.com';
  if (isGmail) {
    const gmailExists = await checkGmailExists(emailLower);
    if (!gmailExists) {
      return res.status(400).json({
        message: `No Gmail account found with that address. Please double-check your email.`,
      });
    }
  }

  try {
    const existing = await dbQuery(
      'SELECT id, email FROM users WHERE email = ? OR username = ? LIMIT 1',
      [emailLower, username]
    );

    if (existing.length > 0) {
      if (existing[0].email === emailLower) {
        return res.status(400).json({ message: 'An account with this email already exists. Try logging in instead.' });
      }
      return res.status(400).json({ message: 'That username is already taken. Please choose a different one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await dbQuery(
      `INSERT INTO users (username, email, password_hash, email_verified, verification_token, verification_expires)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [username, emailLower, passwordHash, verificationToken, verificationExpires]
    );

    try {
      await sendVerificationEmail(emailLower, username, verificationToken);
    } catch (mailErr) {
      console.error('Verification email send failed:', mailErr.message);
    }

    return res.status(201).json({
      message: 'Account created! Please check your email inbox to verify your account before logging in.',
      ...(process.env.NODE_ENV !== 'production' && { devVerificationToken: verificationToken }),
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/verify-email/:token
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
      return res.status(400).json({ message: 'Verification link has expired. Please request a new one from the login page.' });
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
// ─────────────────────────────────────────────
router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body;
  const generic = { message: 'If that email exists and is unverified, a new link has been sent.' };
  if (!email) return res.status(200).json(generic);

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
// Returns SEPARATE error messages for wrong email vs wrong password
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

    // ── Wrong email ───────────────────────────────────────────────
    if (rows.length === 0) {
      return res.status(401).json({
        message: 'No account found with that email address.',
        errorType: 'email_not_found',
      });
    }

    const user = rows[0];

    // ── Wrong password ────────────────────────────────────────────
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Incorrect password. Please try again.',
        errorType: 'wrong_password',
      });
    }

    // ── Not verified ──────────────────────────────────────────────
    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Check your inbox (and spam folder).',
        needsVerification: true,
        email: user.email,
      });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
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
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required.' });

  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

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
// ─────────────────────────────────────────────
router.post('/forgot-password', passwordLimiter, async (req, res) => {
  const { email } = req.body;
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
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await dbQuery(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
      [resetTokenHash, resetExpiry, user.id]
    );
    try {
      await sendPasswordResetEmail(email, user.username, resetToken);
    } catch (mailErr) {
      console.error('Reset email failed:', mailErr.message);
    }
    return res.status(200).json(generic);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
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
    await dbQuery(
      `UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL,
       refresh_token_hash = NULL, refresh_token_expires = NULL WHERE id = ?`,
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
    return res.status(400).json({ message: 'New password must differ from your current password.' });
  }
  try {
    const rows = await dbQuery(
      'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect.' });
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await dbQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.userId]);
    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT id, username, email, email_verified, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;