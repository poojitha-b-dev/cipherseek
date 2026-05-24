// frontend/src/pages/ForgotPassword.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword({ onBack }) {
  const { forgotPassword } = useAuth();

  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState("");

  // Resend tracking — max 3 attempts
  const [resendCount, setResendCount]   = useState(1); // first send counts as 1
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  const MAX_SENDS = 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
      setResendCount(1);
    } catch (err) {
      // Backend returns specific messages for unknown email / unverified account
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= MAX_SENDS) return;
    setResendLoading(true);
    setResendStatus("");
    try {
      await forgotPassword(email);
      const newCount = resendCount + 1;
      setResendCount(newCount);
      const remaining = MAX_SENDS - newCount;
      setResendStatus(
        remaining > 0
          ? `Reset link resent! (${remaining} resend${remaining !== 1 ? "s" : ""} remaining)`
          : "Reset link resent! No more resends available."
      );
    } catch (err) {
      setResendStatus(err.message || "Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Success / inbox check screen ──────────────────────────────────────────
  if (submitted) {
    const resendsLeft = MAX_SENDS - resendCount;
    return (
      <div className="auth-screen">
        <div className="auth-glow" />
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">📬</div>
            <h2 className="auth-title">Check your inbox</h2>
            <p className="auth-subtitle">Password reset instructions sent</p>
          </div>

          <div style={{ padding: "8px 0 24px" }}>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              A password reset link has been sent to <strong>{email}</strong>.
            </div>

            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20, lineHeight: 1.7 }}>
              The link expires in <strong style={{ color: "var(--text)" }}>1 hour</strong>.
              Check your spam folder if you don't see it within a few minutes.
            </p>

            {resendStatus && (
              <p style={{
                fontSize: 13, marginBottom: 14,
                color: resendStatus.toLowerCase().includes("failed") ? "var(--error)" : "var(--success)"
              }}>
                {resendStatus}
              </p>
            )}

            {resendsLeft > 0 ? (
              <button
                className="btn btn-secondary btn-full"
                onClick={handleResend}
                disabled={resendLoading}
                style={{ marginBottom: 12 }}
              >
                {resendLoading
                  ? <span className="spinner" />
                  : `Resend reset link (${resendsLeft} left)`
                }
              </button>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12, textAlign: "center" }}>
                Maximum resends reached. Check your spam folder or contact support.
              </p>
            )}

            <button className="btn btn-primary btn-full" onClick={onBack}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Request form ──────────────────────────────────────────────────────────
  return (
    <div className="auth-screen">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔑</div>
          <h1 className="auth-title">PPSE</h1>
          <p className="auth-subtitle">Reset your password</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="form-title">Forgot Password</h2>

          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20, lineHeight: 1.7 }}>
            Enter your account email and we'll send you a reset link.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              required
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Send Reset Link"}
          </button>

          <p className="auth-switch">
            <button type="button" className="link-btn" onClick={onBack}>
              ← Back to Login
            </button>
          </p>
        </form>

        <div className="auth-badges">
          <span className="badge">AES-256 Encrypted</span>
          <span className="badge">PEKS Scheme</span>
          <span className="badge">Zero-Knowledge Search</span>
        </div>
      </div>
    </div>
  );
}
