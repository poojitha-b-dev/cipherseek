// frontend/src/pages/Register.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak",   color: "#e24b4a", width: "25%" };
  if (score <= 3) return { label: "Fair",   color: "#ef9f27", width: "50%" };
  if (score <= 4) return { label: "Medium", color: "#639922", width: "75%" };
  return              { label: "Strong", color: "#1d9e75", width: "100%" };
}

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

export default function Register({ onSwitch }) {
  const { register, resendVerification } = useAuth();

  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Per-field errors — shown inline under each field
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError]       = useState("");
  const [generalError, setGeneralError]   = useState("");

  // Post-registration state
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const [resendCount, setResendCount]         = useState(0);
  const [resendStatus, setResendStatus]       = useState("");
  const [resendLoading, setResendLoading]     = useState(false);

  const MAX_RESENDS = 3;

  const strength = getPasswordStrength(form.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    // Clear field error as user types
    if (name === "username") setUsernameError("");
    if (name === "email")    setEmailError("");
    setGeneralError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUsernameError("");
    setEmailError("");
    setGeneralError("");

    // Client-side validation
    if (form.password.length < 8) {
      setGeneralError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setGeneralError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      setRegisteredEmail(form.email);
    } catch (err) {
      // Route error to correct field based on errorType from backend
      if (err.errorType === "email_exists") {
        setEmailError(err.message);
      } else if (err.errorType === "username_taken") {
        setUsernameError(err.message);
      } else {
        setGeneralError(err.message || "Registration failed. Please try again.");
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
      const data = await resendVerification(registeredEmail);
      const newCount = data.resendCount ?? resendCount + 1;
      setResendCount(newCount);
      const remaining = MAX_RESENDS - newCount;
      setResendStatus(
        remaining > 0
          ? `Verification email resent! (${remaining} resend${remaining !== 1 ? "s" : ""} remaining)`
          : "Verification email resent! No more resends available — check your spam folder."
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

  // ── "Check your inbox" screen ─────────────────────────────────────────────
  if (registeredEmail) {
    const resendsLeft = MAX_RESENDS - resendCount;
    return (
      <div className="auth-screen">
        <div className="auth-glow" />
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">📬</div>
            <h2 className="auth-title">Check your inbox</h2>
            <p className="auth-subtitle">One more step to activate your account</p>
          </div>

          <div style={{ padding: "0 0 24px" }}>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              We sent a verification link to{" "}
              <strong>{registeredEmail}</strong>. Click that link to activate your account.
            </div>

            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20, lineHeight: 1.7 }}>
              The link expires in <strong style={{ color: "var(--text)" }}>24 hours</strong>.
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
                  : `Resend verification email (${resendsLeft} left)`
                }
              </button>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12, textAlign: "center" }}>
                Maximum resends reached. Check your spam folder or contact support.
              </p>
            )}

            <button className="btn btn-primary btn-full" onClick={onSwitch}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="auth-screen">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔐</div>
          <h1 className="auth-title">PPSE</h1>
          <p className="auth-subtitle">Create your secure account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="form-title">Register</h2>

          {/* General errors (password mismatch, server error, etc.) */}
          {generalError && <div className="alert alert-error">{generalError}</div>}

          {/* Username */}
          <div className="field">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              name="username"
              placeholder="johndoe"
              value={form.username}
              onChange={handleChange}
              style={usernameError ? { borderColor: "var(--error)" } : {}}
              required
            />
            {usernameError && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>{usernameError}</p>
            )}
          </div>

          {/* Email */}
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

          {/* Password + strength */}
          <div className="field">
            <label className="field-label">Password</label>
            <div className="password-wrapper">
              <input
                className="field-input"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={handleChange}
                onFocus={() => setPasswordTouched(true)}
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
            {passwordTouched && form.password.length > 0 && (
              <div className="strength-section">
                <div className="strength-bar-track">
                  <div className="strength-bar-fill"
                    style={{ width: strength.width, backgroundColor: strength.color }} />
                </div>
                <span className="strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="field">
            <label className="field-label">Confirm Password</label>
            <div className="password-wrapper">
              <input
                className="field-input"
                type={showConfirm ? "text" : "password"}
                name="confirm"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="eye-toggle"
                tabIndex={-1}
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {form.confirm.length > 0 && (
              <p className="confirm-match"
                style={{ color: form.password === form.confirm ? "#1d9e75" : "#e24b4a" }}>
                {form.password === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>

          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" className="link-btn" onClick={onSwitch}>Sign In</button>
          </p>
        </form>
      </div>
    </div>
  );
}
