// backend/utils/mailer.js

const nodemailer = require('nodemailer');

// Create transporter once (reused across requests)
// connectionTimeout: fail fast (10s) instead of hanging for minutes
// greetingTimeout: how long to wait for server greeting
// socketTimeout: max time for any single operation
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '465', 10),
  secure: process.env.MAIL_SECURE !== 'false', // true for port 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  connectionTimeout: 10000,  // 10s — fail fast if SMTP unreachable
  greetingTimeout: 10000,    // 10s — fail fast if server doesn't respond
  socketTimeout: 15000,      // 15s — max time per operation
});

// ── Shared email shell ─────────────────────────────────────────────
function buildHtmlEmail({ title, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0e17; font-family: 'DM Sans', Arial, sans-serif; }
    .wrapper { max-width: 520px; margin: 0 auto; padding: 40px 16px; }
    .card {
      background: #111827;
      border-radius: 14px;
      border: 1px solid rgba(99,120,255,0.18);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1a2235 0%, #0f172a 100%);
      padding: 32px 40px 24px;
      border-bottom: 1px solid rgba(99,120,255,0.15);
      text-align: center;
    }
    .logo { font-size: 36px; margin-bottom: 8px; }
    .app-name {
      font-family: 'Space Mono', monospace;
      font-size: 18px;
      font-weight: 700;
      color: #6378ff;
      letter-spacing: 3px;
    }
    .app-tagline { font-size: 12px; color: #8892b0; margin-top: 4px; }
    .body { padding: 32px 40px; }
    .body h2 { color: #e8eaf6; font-size: 22px; font-weight: 700; margin: 0 0 8px; }
    .body p { color: #8892b0; font-size: 14px; line-height: 1.7; margin: 0 0 20px; }
    .cta-btn {
      display: block;
      width: 100%;
      max-width: 320px;
      margin: 0 auto 24px;
      padding: 14px 0;
      background: #6378ff;
      color: #fff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      border-radius: 10px;
      text-align: center;
    }
    .url-fallback {
      background: #1a2235;
      border: 1px solid rgba(99,120,255,0.18);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: #6378ff;
      word-break: break-all;
      margin-bottom: 24px;
    }
    .warning {
      background: rgba(251,191,36,0.08);
      border: 1px solid rgba(251,191,36,0.25);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #fbbf24;
      margin-bottom: 24px;
    }
    .footer { padding: 20px 40px; border-top: 1px solid rgba(99,120,255,0.1); text-align: center; }
    .footer p { font-size: 12px; color: #4a5568; margin: 0; line-height: 1.6; }
    .badges { display: flex; justify-content: center; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
    .badge {
      font-size: 10px; color: #8892b0;
      background: #1a2235;
      border: 1px solid rgba(99,120,255,0.15);
      border-radius: 20px;
      padding: 3px 10px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">🔐</div>
        <div class="app-name">PPSE</div>
        <div class="app-tagline">Privacy-Preserving Searchable Encryption</div>
      </div>
      <div class="body">${bodyHtml}</div>
      <div class="footer">
        <p>You received this email because an action was taken on your PPSE account.<br />
        If you did not initiate this, you can safely ignore this email.</p>
        <div class="badges">
          <span class="badge">AES-256 Encrypted</span>
          <span class="badge">PEKS Scheme</span>
          <span class="badge">Zero-Knowledge Search</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Send email verification ────────────────────────────────────────
async function sendVerificationEmail(to, username, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = buildHtmlEmail({
    title: 'Verify your PPSE email',
    bodyHtml: `
      <h2>Verify your email</h2>
      <p>Hi <strong style="color:#e8eaf6">${username}</strong>,</p>
      <p>Thanks for creating your PPSE account. Click the button below to verify your
      email address and activate your account. This link expires in <strong style="color:#e8eaf6">24 hours</strong>.</p>
      <a href="${verifyUrl}" class="cta-btn">Verify Email Address</a>
      <p style="font-size:13px;color:#4a5568;text-align:center;margin-bottom:8px">
        Button not working? Copy and paste this link:
      </p>
      <div class="url-fallback">${verifyUrl}</div>
      <div class="warning">
        ⚠️ If you did not create a PPSE account, no further action is needed.
      </div>
    `,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || `"PPSE Security" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Verify your PPSE email address',
    html,
    text: `Verify your PPSE email\n\nHi ${username},\n\nPlease verify your email:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create a PPSE account, ignore this email.`,
  });
}

// ── Send password reset ────────────────────────────────────────────
async function sendPasswordResetEmail(to, username, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = buildHtmlEmail({
    title: 'Reset your PPSE password',
    bodyHtml: `
      <h2>Reset your password</h2>
      <p>Hi <strong style="color:#e8eaf6">${username}</strong>,</p>
      <p>We received a request to reset the password for your PPSE account. Click the
      button below to choose a new password. This link expires in <strong style="color:#e8eaf6">1 hour</strong>.</p>
      <a href="${resetUrl}" class="cta-btn">Reset Password</a>
      <p style="font-size:13px;color:#4a5568;text-align:center;margin-bottom:8px">
        Button not working? Copy and paste this link:
      </p>
      <div class="url-fallback">${resetUrl}</div>
      <div class="warning">
        ⚠️ If you did not request a password reset, ignore this email. The link expires automatically.
      </div>
    `,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || `"PPSE Security" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Reset your PPSE password',
    html,
    text: `Reset your PPSE password\n\nHi ${username},\n\nPassword reset link:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
