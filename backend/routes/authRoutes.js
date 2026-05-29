// backend/routes/authRoutes.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dns = require('dns').promises;
const connection = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authLimiter, passwordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dbQuery(sql, params) {
  return new Promise((resolve, reject) =>
    connection.query(sql, params, (err, results) =>
      err ? reject(err) : resolve(results)
    )
  );
}

function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Username: letters, digits, underscore, dot only
const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

// Lightweight disposable-domain blocklist
// Add more domains as needed — this covers the most common throwaway providers
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'spam4.me', 'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'trashmail.com',
  'trashmail.at', 'trashmail.io', 'trashmail.me', 'trashmail.net',
  'dispostable.com', 'maildrop.cc', 'mailnull.com', 'spamgourmet.com',
  'spamgourmet.net', 'spamgourmet.org', 'spamgourmet.com', 'binkmail.com',
  'bobmail.info', 'chammy.info', 'devnullmail.com', 'letthemeatspam.com',
  'mailnew.com', 'no-spam.ws', 'obobbo.com', 'spamfree24.org', 'spoofmail.de',
  'tempe-mail.com', 'tempinbox.com', 'trashdevil.com', 'trashdevil.de',
  'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
]);

async function isFakeDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  // MX record check — real email domains always have MX records
  try {
    const records = await dns.resolveMx(domain);
    return !records || records.length === 0;
  } catch {
    // DNS lookup failed — could be a real but obscure domain; allow through
    return false;
  }
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const trimUser = username.trim();
  const trimEmail = email.toLowerCase().trim();

  // Username format
  if (trimUser.length < 2 || trimUser.length > 30) {
    return res.status(400).json({ message: 'Username must be between 2 and 30 characters.' });
  }
  if (!USERNAME_RE.test(trimUser)) {
    return res.status(400).json({
      message: 'Username can only contain letters, numbers, underscores (_) and dots (.).',
    });
  }

  // Email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // Fake / disposable email
  const fake = await isFakeDomain(trimEmail);
  if (fake) {
    return res.status(400).json({
      message: 'Please use a real email address. Disposable/temporary emails are not allowed.',
    });
  }

  // Password length
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    // Check email AND username in one query
    const existing = await dbQuery(
      'SELECT email, username FROM users WHERE email = ? OR username = ? LIMIT 2',
      [trimEmail, trimUser]
    );

    for (const row of existing) {
      if (row.email === trimEmail) {
        return res.status(409).json({
          message: 'Email already exists.',
          errorType: 'email_exists',
        });
      }
      if (row.username === trimUser) {
        return res.status(409).json({
          message: 'Username already taken.',
          errorType: 'username_taken',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await dbQuery(
      `INSERT INTO users
         (username, email, password_hash, email_verified,
          verification_token, verification_expires,
          resend_count, resend_reset_at)
       VALUES (?, ?, ?, 0, ?, ?, 0, NULL)`,
      [trimUser, trimEmail, passwordHash, verifyToken, verifyExpiry]
    );

    // After — logs the full error so Railway shows the SMTP code
    sendVerificationEmail(trimEmail, trimUser, verifyToken).catch(err =>
      console.error('Verification email failed:', err.code, err.message, err.response || '')
    );

    return res.status(201).json({ message: 'Account created. Please check your email to verify.' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ─── GET /api/auth/verify-email/:token ───────────────────────────────────────
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const rows = await dbQuery(
      'SELECT id, email_verified, verification_expires FROM users WHERE verification_token = ? LIMIT 1',
      [token]
    );
    if (!rows.length) {
      return res.status(400).json({ message: 'Invalid or already used verification link.' });
    }
    const user = rows[0];
    if (user.email_verified) {
      return res.status(200).json({ message: 'Email already verified. You can log in.' });
    }
    if (new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({
        message: 'Verification link has expired. Please request a new one.',
      });
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

// ─── POST /api/auth/resend-verification ──────────────────────────────────────
// Hard limit: 3 resends per 24-hour window per account
router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const rows = await dbQuery(
      'SELECT id, username, email_verified, resend_count, resend_reset_at FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    // Always return 200 for unknown emails — prevents account enumeration
    if (!rows.length || rows[0].email_verified) {
      return res.status(200).json({ message: 'If eligible, a new verification link has been sent.' });
    }

    const user = rows[0];
    const now = new Date();
    const resetAt = user.resend_reset_at ? new Date(user.resend_reset_at) : null;
    let count = (!resetAt || now > resetAt) ? 0 : (user.resend_count || 0);

    if (count >= 3) {
      return res.status(429).json({
        message: 'Verification resend limit reached.',
        limitReached: true,
      });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newCount = count + 1;
    const newReset = (resetAt && now < resetAt) ? resetAt : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await dbQuery(
      `UPDATE users SET verification_token = ?, verification_expires = ?,
       resend_count = ?, resend_reset_at = ? WHERE id = ?`,
      [newToken, newExpiry, newCount, newReset, user.id]
    );

    sendVerificationEmail(email, user.username, newToken).catch(err =>
      console.error('Resend email failed:', err.message)
    );

    return res.status(200).json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const rows = await dbQuery(
      'SELECT id, username, email, password_hash, email_verified FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: 'No account found.',
        errorType: 'email_not_found',
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({
        message: 'Incorrect password.',
        errorType: 'wrong_password',
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email first.',
        errorType: 'email_not_verified',
        needsVerification: true,
        email: user.email,
      });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await dbQuery(
      'UPDATE users SET refresh_token_hash = ?, refresh_token_expires = ?, last_login = NOW() WHERE id = ?',
      [refreshHash, refreshExp, user.id]
    );

    return res.status(200).json({
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required.' });

  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const rows = await dbQuery(
      'SELECT id, username, email, refresh_token_expires FROM users WHERE id = ? AND refresh_token_hash = ? LIMIT 1',
      [decoded.userId, hash]
    );

    if (!rows.length || new Date() > new Date(rows[0].refresh_token_expires)) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    const user = rows[0];
    const newAccess = signAccessToken(user.id);
    const newRefresh = signRefreshToken(user.id);
    const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
    const newExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await dbQuery(
      'UPDATE users SET refresh_token_hash = ?, refresh_token_expires = ? WHERE id = ?',
      [newHash, newExp, user.id]
    );

    return res.status(200).json({
      accessToken: newAccess,
      refreshToken: newRefresh,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    await dbQuery(
      'UPDATE users SET refresh_token_hash = NULL, refresh_token_expires = NULL WHERE id = ?',
      [req.user.userId]
    );
    return res.status(200).json({ message: 'Logged out.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', passwordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const rows = await dbQuery(
      'SELECT id, username, email_verified, reset_count, reset_reset_at FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'No account found.',
        errorType: 'email_not_found',
      });
    }

    const user = rows[0];
    if (!user.email_verified) {
      return res.status(400).json({
        message: 'Please verify your email before resetting your password.',
        errorType: 'email_not_verified',
      });
    }

    // Max 3 reset emails per hour
    const now = new Date();
    const resetAt = user.reset_reset_at ? new Date(user.reset_reset_at) : null;
    let count = (!resetAt || now > resetAt) ? 0 : (user.reset_count || 0);

    if (count >= 3) {
      return res.status(429).json({
        message: 'Reset limit reached. Please wait before trying again.',
        limitReached: true,
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const newCount = count + 1;
    const newReset = (resetAt && now < resetAt) ? resetAt : new Date(Date.now() + 60 * 60 * 1000);

    await dbQuery(
      `UPDATE users SET reset_token_hash = ?, reset_token_expires = ?,
       reset_count = ?, reset_reset_at = ? WHERE id = ?`,
      [resetHash, resetExp, newCount, newReset, user.id]
    );

    sendPasswordResetEmail(email, user.username, resetToken).catch(err =>
      console.error('Reset email failed:', err.message)
    );

    return res.status(200).json({ message: 'Password reset link sent. Check your inbox.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', passwordLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const rows = await dbQuery(
      'SELECT id, reset_token_expires FROM users WHERE reset_token_hash = ? LIMIT 1',
      [hash]
    );
    if (!rows.length) {
      return res.status(400).json({ message: 'Invalid or already used reset link.' });
    }
    if (new Date() > new Date(rows[0].reset_token_expires)) {
      return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await dbQuery(
      `UPDATE users SET password_hash = ?,
       reset_token_hash = NULL, reset_token_expires = NULL,
       refresh_token_hash = NULL, refresh_token_expires = NULL
       WHERE id = ?`,
      [passwordHash, rows[0].id]
    );

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', authenticateUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both passwords are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'New password must differ from current password.' });
  }
  try {
    const rows = await dbQuery('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.userId]);
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await dbQuery('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.userId]);
    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT id, username, email, email_verified, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS BLOCK to backend/routes/authRoutes.js
// Paste it just before the final line:  module.exports = router;
// ─────────────────────────────────────────────────────────────────────────────

// ─── POST /api/auth/change-username ──────────────────────────────────────────
router.post('/change-username', authenticateUser, async (req, res) => {
  const { newUsername } = req.body;

  if (!newUsername || !newUsername.trim()) {
    return res.status(400).json({ message: 'Username cannot be empty.' });
  }

  const trimmed = newUsername.trim();

  // Match the exact same rules used in /register
  if (trimmed.length < 2 || trimmed.length > 30) {
    return res.status(400).json({ message: 'Username must be between 2 and 30 characters.' });
  }
  if (!USERNAME_RE.test(trimmed)) {
    return res.status(400).json({
      message: 'Username can only contain letters, numbers, underscores (_) and dots (.).',
    });
  }

  try {
    // Check if the new username is already taken by someone else
    const existing = await dbQuery(
      'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
      [trimmed, req.user.userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }

    await dbQuery('UPDATE users SET username = ? WHERE id = ?', [trimmed, req.user.userId]);

    return res.status(200).json({ message: 'Username updated successfully.', username: trimmed });
  } catch (err) {
    console.error('Change username error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});
module.exports = router;
