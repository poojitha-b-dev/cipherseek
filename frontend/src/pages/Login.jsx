// frontend/src/pages/Login.jsx
// Only change from original: added "Forgot password?" link that calls onForgotPassword prop.
// All existing markup, CSS classes, and behaviour preserved.

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login({ onSwitch, onForgotPassword }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // When login fails with needsVerification, offer resend
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const { resendVerification } = useAuth();
  const [resendStatus, setResendStatus] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendStatus("");
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      // Check if the server told us verification is needed
      // (The fetch response with needsVerification:true is thrown as a plain Error;
      //  we re-parse the message to detect it gracefully.)
      if (err.message && err.message.toLowerCase().includes("verify your email")) {
        setNeedsVerification(true);
        setVerificationEmail(form.email);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus("Sending…");
    try {
      await resendVerification(verificationEmail);
      setResendStatus("Verification email sent! Check your inbox.");
    } catch {
      setResendStatus("Failed to resend. Please try again.");
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔐</div>
          <h1 className="auth-title">PPSE</h1>
          <p className="auth-subtitle">Privacy-Preserving Searchable Encryption</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="form-title">Sign In</h2>

          {error && (
            <div className="alert alert-error">
              {error}
              {needsVerification && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={handleResend}
                    style={{ fontSize: 13 }}
                  >
                    Resend verification email
                  </button>
                </div>
              )}
              {resendStatus && (
                <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
                  {resendStatus}
                </p>
              )}
            </div>
          )}

          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label className="field-label">
              Password
              {/* Forgot password link sits on the same line as the label */}
              {onForgotPassword && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={onForgotPassword}
                  style={{ marginLeft: "auto", fontSize: 12, fontWeight: 400 }}
                >
                  Forgot password?
                </button>
              )}
            </label>
            <div className="password-wrapper">
              <input
                className="field-input"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>

          <p className="auth-switch">
            Don't have an account?{" "}
            <button type="button" className="link-btn" onClick={onSwitch}>
              Register
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
