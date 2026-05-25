// backend/utils/mailer.js
const brevo = require('@getbrevo/brevo');

const transactionalApi = new brevo.TransactionalEmailsApi();

transactionalApi.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

async function verifyMailer() {
  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set.');
    return;
  }

  console.log('✅ Brevo mailer ready.');
}

verifyMailer();

function buildHtmlEmail({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#0a0e17;font-family:Arial,sans-serif}
    .wrapper{max-width:520px;margin:0 auto;padding:40px 16px}
    .card{background:#111827;border-radius:14px;border:1px solid rgba(99,120,255,.18);overflow:hidden}
    .header{background:linear-gradient(135deg,#1a2235,#0f172a);padding:32px 40px 24px;border-bottom:1px solid rgba(99,120,255,.15);text-align:center}
    .logo{font-size:36px;margin-bottom:8px}
    .app-name{font-size:18px;font-weight:700;color:#6378ff;letter-spacing:3px}
    .app-tagline{font-size:12px;color:#8892b0;margin-top:4px}
    .body{padding:32px 40px}
    .body h2{color:#e8eaf6;font-size:22px;font-weight:700;margin:0 0 8px}
    .body p{color:#8892b0;font-size:14px;line-height:1.7;margin:0 0 20px}
    .cta-btn{display:block;width:100%;max-width:320px;margin:0 auto 24px;padding:14px 0;background:#6378ff;color:#fff!important;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;text-align:center}
    .url-fallback{background:#1a2235;border:1px solid rgba(99,120,255,.18);border-radius:8px;padding:12px 16px;font-size:12px;color:#6378ff;word-break:break-all;margin-bottom:24px}
    .warning{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:8px;padding:12px 16px;font-size:13px;color:#fbbf24;margin-bottom:24px}
    .footer{padding:20px 40px;border-top:1px solid rgba(99,120,255,.1);text-align:center}
    .footer p{font-size:12px;color:#4a5568;margin:0;line-height:1.6}
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

      <div class="body">
        ${bodyHtml}
      </div>

      <div class="footer">
        <p>
          You received this because an action was taken on your PPSE account.<br/>
          If you did not initiate this, you can safely ignore this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendMail({ to, subject, html, text }) {
  const email = new brevo.SendSmtpEmail();

  email.sender = {
    name: 'PPSE Security',
    email: process.env.MAIL_USER
  };

  email.to = [{ email: to }];

  email.subject = subject;
  email.htmlContent = html;
  email.textContent = text;

  try {
    const result = await transactionalApi.sendTransacEmail(email);

    console.log(`✅ Email sent to ${to}`);

    return result;
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    throw err;
  }
}

async function sendVerificationEmail(to, username, token) {
  const url =
    `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await sendMail({
    to,
    subject: 'Verify your PPSE email address',

    html: buildHtmlEmail({
      title: 'Verify Email',

      bodyHtml: `
        <h2>Verify your email</h2>

        <p>
          Hi <strong style="color:#e8eaf6">${username}</strong>,
        </p>

        <p>
          Click below to verify your email address.
          This link expires in 24 hours.
        </p>

        <a href="${url}" class="cta-btn">
          Verify Email Address
        </a>

        <div class="url-fallback">
          ${url}
        </div>
      `
    }),

    text:
`Hi ${username},

Verify your email:

${url}`
  });
}

async function sendPasswordResetEmail(to, username, token) {
  const url =
    `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await sendMail({
    to,
    subject: 'Reset your PPSE password',

    html: buildHtmlEmail({
      title: 'Reset Password',

      bodyHtml: `
        <h2>Reset your password</h2>

        <p>
          Hi <strong style="color:#e8eaf6">${username}</strong>,
        </p>

        <p>
          Click below to reset your password.
          This link expires in 1 hour.
        </p>

        <a href="${url}" class="cta-btn">
          Reset Password
        </a>

        <div class="url-fallback">
          ${url}
        </div>
      `
    }),

    text:
`Hi ${username},

Reset your password:

${url}`
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};