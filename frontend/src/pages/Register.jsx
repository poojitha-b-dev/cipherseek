// frontend/src/pages/Register.jsx
// Change from original: the success state now shows "Check your inbox" instead of
// "Account Created — Go to Login", since email verification is now required.
// Password strength meter and all other UI are unchanged.

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: "weak", label: "Weak", color: "#e24b4a", width: "25%" };
  if (score <= 3) return { level: "fair", label: "Fair", color: "#ef9f27", width: "50%" };
  if (score <= 4) return { level: "medium", label: "Medium", color: "#639922", width: "70%" };
  return { level: "strong", label: "Strong", color: "#1d9e75", width: "100%" };
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("One special character (!@#$...)");
  return errors;
}

export default function Register({ onSwitch }) {
  const { register, resendVerification } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState(null); // null = not yet registered
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const strength = getPasswordStrength(form.password);
  const validationErrors = validatePassword(form.password);
  const isPasswordAcceptable = ["medium", "strong"].includes(strength.level);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordAcceptable) {
      setError("Please use a stronger password (at least Medium strength).");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      setRegisteredEmail(form.email); // triggers the "check inbox" screen
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendStatus("");
    try {
      await resendVerification(registeredEmail);
      setResendStatus("A new verification email has been sent!");
    } catch {
      setResendStatus("Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // ── Post-registration: "Check your inbox" screen ─────────────────
  if (registeredEmail) {
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
              We sent a verification link to <strong>{registeredEmail}</strong>.
              Click the link in that email to activate your account.
            </div>

            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 20, lineHeight: 1.7 }}>
              The link expires in <strong style={{ color: "var(--text)" }}>24 hours</strong>.
              Check your spam folder if you don't see it within a few minutes.
            </p>

            {resendStatus && (
              <p style={{ fontSize: 13, marginBottom: 14, color: "var(--success)" }}>
                {resendStatus}
              </p>
            )}

            <button
              className="btn btn-secondary btn-full"
              onClick={handleResend}
              disabled={resendLoading}
              style={{ marginBottom: 12 }}
            >
              {resendLoading ? <span className="spinner" /> : "Resend verification email"}
            </button>

            <button className="btn btn-primary btn-full" onClick={onSwitch}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form (unchanged from original) ───────────────────
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

          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              name="username"
              placeholder="johndoe"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

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

            {passwordTouched && form.password.length > 0 && (
              <div className="strength-section">
                <div className="strength-bar-track">
                  <div
                    className="strength-bar-fill"
                    style={{ width: strength.width, backgroundColor: strength.color }}
                  />
                </div>
                <span className="strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
                {!isPasswordAcceptable && (
                  <div className="password-hints">
                    <p className="hints-title">Your password needs:</p>
                    <ul className="hints-list">
                      {validationErrors.map((e) => (
                        <li key={e} className="hint-item">
                          <span className="hint-dot" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

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
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
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
            {form.confirm.length > 0 && (
              <p className="confirm-match" style={{ color: form.password === form.confirm ? "#1d9e75" : "#e24b4a" }}>
                {form.password === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading || !isPasswordAcceptable}
          >
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>

          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" className="link-btn" onClick={onSwitch}>
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
