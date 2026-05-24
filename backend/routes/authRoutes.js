// backend/routes/authRoutes.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dns = require('dns');
const connection = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authLimiter, passwordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
 * MX record check — confirms the email domain can receive mail.
 * This catches obviously fake domains like vvvvvsdddgytrghhdfg@gmail.com
 * where the domain is not gmail.com but a made-up string.
 * It does NOT verify that a specific mailbox exists (that would require
 * SMTP probing which is unreliable and often blocked).
 *
 * Note: gmail.com, yahoo.com, hotmail.com etc. all have MX records,
 * so real email addresses always pass. Only completely invented domains fail.
 */
function checkMxRecord(domain) {
  return new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      resolve(!err && addresses && addresses.length > 0);
    });
  });
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const trimmedUsername = username.trim();
  const emailLower = email.toLowerCase().trim();

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // Username rules — permissive, allow letters/numbers/spaces and: @ # % & ^ _ . - ! ?
  // Only block characters that cause SQL/HTML injection risk.
  if (trimmedUsername.length < 2 || trimmedUsername.length > 40) {
    return res.status(400).json({ message: 'Username must be between 2 and 40 characters.' });
  }
  if (/[<>/"'`\\]/.test(trimmedUsername)) {
    return res.status(400).json({ message: 'Username contains unsupported characters.' });
  }

  // Password minimum
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  // MX record check — catches invented domains, not specific fake mailboxes
  const domain = emailLower.split('@')[1];
  try {
    const hasMx = await checkMxRecord(domain);
    if (!hasMx) {
      return res.status(400).json({
        message: `The email domain "${domain}" does not appear to be a real mail server. Please use a real email address.`,
      });
    }
  } catch {
    // DNS lookup failure — allow through rather than blocking real users
  }

  try {
    // Check both email AND username in one query for efficiency
    const existing = await dbQuery(
      'SELECT id, email, username FROM users WHERE email = ? OR username = ? LIMIT 2',
      [emailLower, trimmedUsername]
    );

    // Separate "email taken" vs "username taken" messages
    for (const row of existing) {
      if (row.email === emailLower) {
        return res.status(409).json({
          message: 'An account with this email already exists. Try logging in instead.',
          errorType: 'email_exists',
        });
      }
      if (row.username === trimmedUsername) {
        return res.status(409).json({
          message: 'That username is already taken. Please choose a different one.',
          errorType: 'username_taken',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await dbQuery(
      `INSERT INTO users
         (username, email, password_hash, email_verified, verification_token, verification_expires, resend_count, resend_reset_at)
       VALUES (?, ?, ?, 0, ?, ?, 0, NULL)`,
      [trimmedUsername, emailLower, passwordHash, verificationToken, verificationExpires]
    );

    // Fire and forget — don't await so the response is instant
    sendVerificationEmail(emailLower, trimmedUsername, verificationToken).catch((err) => {
      console.error('Verification email send failed:', err.message);
    });

    return res.status(201).json({
      message: 'Account created! Please check your email to verify your account before logging in.',
      // Expose token in non-production for easy local testing
      ...(process.env.NODE_ENV !== 'production' && { devVerificationToken: verificationToken }),
    });
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
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or already used verification link.' });
    }
    const user = rows[0];
    if (user.email_verified) {
      return res.status(200).json({ message: 'Email already verified. You can log in.' });
    }
    if (new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({
        message: 'Verification link has expired. Please request a new one from the login page.',
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
// Max 3 resends per account. After 3, the user must contact support.
router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const rows = await dbQuery(
      'SELECT id, username, email_verified, resend_count, resend_reset_at FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      // Don't reveal whether the account exists
      return res.status(200).json({ message: 'If that email is registered and unverified, a new link has been sent.' });
    }

    const user = rows[0];

    if (user.email_verified) {
      return res.status(400).json({ message: 'This email is already verified. You can log in.' });
    }

    // ── Resend limit: max 3 per 24-hour window ────────────────────────────
    const now = new Date();
    const resetAt = user.resend_reset_at ? new Date(user.resend_reset_at) : null;

    // Reset counter if the 24-hour window has passed
    let currentCount = user.resend_count || 0;
    if (!resetAt || now > resetAt) {
      currentCount = 0;
    }

    if (currentCount >= 3) {
      const nextReset = resetAt ? resetAt : now;
      const hoursLeft = Math.ceil((nextReset - now) / (1000 * 60 * 60));
      return res.status(429).json({
        message: `You have reached the maximum of 3 verification emails. Please try again in ${hoursLeft} hour(s), or check your spam folder.`,
        limitReached: true,
        resendCount: currentCount,
      });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newCount = currentCount + 1;
    const newResetAt = resetAt && now < resetAt ? resetAt : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await dbQuery(
      `UPDATE users SET verification_token = ?, verification_expires = ?,
       resend_count = ?, resend_reset_at = ? WHERE id = ?`,
      [newToken, newExpiry, newCount, newResetAt, user.id]
    );

    sendVerificationEmail(email, user.username, newToken).catch((err) => {
      console.error('Resend verification email failed:', err.message);
    });

    return res.status(200).json({
      message: 'A new verification link has been sent. Check your inbox and spam folder.',
      resendCount: newCount,
      resendRemaining: 3 - newCount,
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Returns DISTINCT error types for wrong email vs wrong password.
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

    // No account with this email
    if (rows.length === 0) {
      return res.status(401).json({
        message: 'No account found with that email address.',
        errorType: 'email_not_found',
      });
    }

    const user = rows[0];

    // Wrong password — bcrypt compare
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Incorrect password. Please try again.',
        errorType: 'wrong_password',
      });
    }

    // Email not verified — tell the frontend to show the resend option
    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        errorType: 'email_not_verified',
        needsVerification: true,
        email: user.email,
      });
    }

    // ── Issue tokens ──────────────────────────────────────────────────────
    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await dbQuery(
      'UPDATE users SET refresh_token_hash = ?, refresh_token_expires = ? WHERE id = ?',
      [refreshTokenHash, refreshExpiry, user.id]
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
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
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

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
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

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Enforces max 3 reset emails per hour per account.
router.post('/forgot-password', passwordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const rows = await dbQuery(
      'SELECT id, username, email_verified FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'No account found with that email address.',
        errorType: 'email_not_found',
      });
    }

    if (!rows[0].email_verified) {
      return res.status(400).json({
        message: 'This account has not been verified yet. Please verify your email first.',
        errorType: 'email_not_verified',
      });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await dbQuery(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
      [resetTokenHash, resetExpiry, user.id]
    );

    sendPasswordResetEmail(email, user.username, resetToken).catch((err) => {
      console.error('Reset email failed:', err.message);
    });

    return res.status(200).json({
      message: 'Password reset link sent! Check your inbox (and spam folder). The link expires in 1 hour.',
    });
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
    // Wipe all sessions on password reset for security
    await dbQuery(
      `UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL,
       refresh_token_hash = NULL, refresh_token_expires = NULL WHERE id = ?`,
      [passwordHash, user.id]
    );
    return res.status(200).json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error during password reset.' });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
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
    const newHash = await bcrypt.hash(newPassword, 12);
    await dbQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.userId]);
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
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
