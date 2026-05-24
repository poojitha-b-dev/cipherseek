// frontend/src/pages/Login.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const EyeIcon = ({ open }) => open ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function Login({ onSwitch, onForgotPassword }) {
  const { login, resendVerification } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Separate error states per field + verification state
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
    setNeedsVerification(false);
    setResendStatus("");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear the relevant field error as the user types
    if (e.target.name === "email") setEmailError("");
    if (e.target.name === "password") setPasswordError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);
    try {
      await login(form.email, form.password);
      // On success, AuthContext sets isAuthenticated → App re-renders automatically
    } catch (err) {
      // The error object from login() carries errorType and needsVerification
      if (err.needsVerification) {
        setNeedsVerification(true);
        setVerificationEmail(err.email || form.email);
        setGeneralError(err.message);
      } else if (err.message && err.message.toLowerCase().includes("no account")) {
        setEmailError(err.message);
      } else if (err.message && (
        err.message.toLowerCase().includes("incorrect password") ||
        err.message.toLowerCase().includes("password")
      )) {
        setPasswordError(err.message);
      } else {
        setGeneralError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendStatus("");
    try {
      await resendVerification(verificationEmail);
      setResendStatus("Verification email resent! Check your inbox and spam folder.");
    } catch {
      setResendStatus("Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
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

          {/* General error (e.g. verification needed) */}
          {generalError && (
            <div className="alert alert-error">
              {generalError}
              {needsVerification && (
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="link-btn"
                    onClick={handleResend} disabled={resendLoading}
                    style={{ fontSize: 13 }}>
                    {resendLoading ? "Sending…" : "Resend verification email"}
                  </button>
                  {resendStatus && (
                    <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)" }}>
                      {resendStatus}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email" name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              style={emailError ? { borderColor: "var(--error)" } : {}}
              required
            />
            {/* Per-field email error */}
            {emailError && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>
                {emailError}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field-label" style={{ display: "flex", alignItems: "center" }}>
              Password
              {onForgotPassword && (
                <button type="button" className="link-btn" onClick={onForgotPassword}
                  style={{ marginLeft: "auto", fontSize: 12, fontWeight: 400 }}>
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
                style={passwordError ? { borderColor: "var(--error)" } : {}}
                required
              />
              <button type="button" className="eye-toggle" tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {/* Per-field password error */}
            {passwordError && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>
                {passwordError}
              </p>
            )}
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>

          <p className="auth-switch">
            Don't have an account?{" "}
            <button type="button" className="link-btn" onClick={onSwitch}>Register</button>
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