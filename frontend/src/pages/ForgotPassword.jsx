// frontend/src/pages/ForgotPassword.jsx

import { useState } from "react";
import API_URL from "../api";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        // 404 = no account with that email
        // 400 = account not verified yet
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.7 }}>
              The link expires in <strong style={{ color: "var(--text)" }}>1 hour</strong>.
              Check your spam folder if you don't see the email shortly.
            </p>
            <button className="btn btn-primary btn-full" onClick={onBack}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            Enter the email address associated with your account and we'll send you
            a link to reset your password.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
