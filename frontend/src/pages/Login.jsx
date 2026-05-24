// frontend/src/pages/Login.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const EyeIcon = ({ open }) => open ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function Login({ onSwitch, onForgotPassword }) {
  const { login, resendVerification } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Per-field errors — uses errorType from backend, not string matching
  const [emailError, setEmailError]     = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  // Unverified account state
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendCount, setResendCount]   = useState(0);
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const MAX_RESENDS = 3;

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
    setNeedsVerification(false);
    setResendStatus("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === "email")    setEmailError("");
    if (name === "password") setPasswordError("");
    setGeneralError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);
    try {
      await login(form.email, form.password);
      // On success, AuthContext sets isAuthenticated → App re-renders automatically
    } catch (err) {
      // Route error to the correct field using errorType — no fragile string matching
      switch (err.errorType) {
        case "email_not_found":
          setEmailError(err.message);
          break;
        case "wrong_password":
          setPasswordError(err.message);
          break;
        case "email_not_verified":
          setNeedsVerification(true);
          setVerificationEmail(err.email || form.email);
          setGeneralError(err.message);
          break;
        default:
          setGeneralError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= MAX_RESENDS) return;
    setResendLoading(true);
    setResendStatus("");
    try {
      const data = await resendVerification(verificationEmail);
      const newCount = data.resendCount ?? resendCount + 1;
      setResendCount(newCount);
      const remaining = MAX_RESENDS - newCount;
      setResendStatus(
        remaining > 0
          ? `Sent! (${remaining} resend${remaining !== 1 ? "s" : ""} remaining)`
          : "Sent! No more resends available — check your spam folder."
      );
    } catch (err) {
      if (err.limitReached) {
        setResendCount(MAX_RESENDS);
        setResendStatus(err.message);
      } else {
        setResendStatus("Failed to resend. Please try again in a moment.");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const resendsLeft = MAX_RESENDS - resendCount;

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

          {/* General / verification banner */}
          {generalError && (
            <div className="alert alert-error">
              {generalError}

              {needsVerification && (
                <div style={{ marginTop: 10 }}>
                  {resendStatus && (
                    <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>
                      {resendStatus}
                    </p>
                  )}
                  {resendsLeft > 0 ? (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={handleResend}
                      disabled={resendLoading}
                      style={{ fontSize: 13 }}
                    >
                      {resendLoading
                        ? "Sending…"
                        : `Resend verification email (${resendsLeft} left)`
                      }
                    </button>
                  ) : (
                    <p style={{ fontSize: 12, color: "var(--text-2)" }}>
                      Maximum resends reached. Check your spam folder or contact support.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Email field */}
          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              style={emailError ? { borderColor: "var(--error)" } : {}}
              required
            />
            {emailError && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>{emailError}</p>
            )}
          </div>

          {/* Password field + eye toggle */}
          <div className="field">
            <label className="field-label" style={{ display: "flex", alignItems: "center" }}>
              Password
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
                style={passwordError ? { borderColor: "var(--error)" } : {}}
                required
              />
              <button
                type="button"
                className="eye-toggle"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {passwordError && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>{passwordError}</p>
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
