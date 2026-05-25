// frontend/src/pages/Login.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Eye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login({ onSwitch, onForgotPassword }) {
  const { login, resendVerification } = useAuth();

  const [form, setForm]           = useState({ email: "", password: "" });
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);

  // Per-field errors — driven by errorType from backend, no string matching
  const [emailErr, setEmailErr]       = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [generalErr, setGeneralErr]   = useState("");

  // Email-not-verified state
  const [unverified, setUnverified]       = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg]         = useState("");
  const [limitReached, setLimitReached]   = useState(false);
  const [resendDone, setResendDone]       = useState(false);

  const clearErrors = () => {
    setEmailErr(""); setPasswordErr(""); setGeneralErr("");
    setUnverified(false); setResendMsg("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === "email")    setEmailErr("");
    if (name === "password") setPasswordErr("");
    setGeneralErr("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);
    try {
      await login(form.email, form.password);
      // Success → AuthContext sets isAuthenticated → App re-renders
    } catch (err) {
      switch (err.errorType) {
        case "email_not_found":
          setEmailErr("No account found.");
          break;
        case "wrong_password":
          setPasswordErr("Incorrect password.");
          break;
        case "email_not_verified":
          setUnverified(true);
          setUnverifiedEmail(err.email || form.email);
          setGeneralErr("Please verify your email first.");
          break;
        default:
          setGeneralErr(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (limitReached || resendDone) return;
    setResendLoading(true);
    setResendMsg("");
    try {
      await resendVerification(unverifiedEmail);
      setResendDone(true);
      setResendMsg("Verification email sent! Check your inbox and spam folder.");
    } catch (err) {
      if (err.limitReached) {
        setLimitReached(true);
        setResendMsg("Verification resend limit reached.");
      } else {
        setResendMsg("Failed to resend. Please try again.");
      }
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

          {/* General / verification banner */}
          {generalErr && (
            <div className="alert alert-error">
              {generalErr}
              {unverified && (
                <div style={{ marginTop: 10 }}>
                  {resendMsg && (
                    <p style={{ fontSize: 12, marginBottom: 6,
                      color: limitReached || resendMsg.includes("Failed") ? "var(--error)" : "var(--success)" }}>
                      {resendMsg}
                    </p>
                  )}
                  {!limitReached && !resendDone && (
                    <button type="button" className="link-btn"
                      onClick={handleResend} disabled={resendLoading}
                      style={{ fontSize: 13 }}>
                      {resendLoading ? "Sending…" : "Resend verification email"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Email */}
          <div className="field">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" name="email"
              placeholder="your@email.com" value={form.email}
              onChange={handleChange}
              style={emailErr ? { borderColor: "var(--error)" } : {}}
              required />
            {emailErr && <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>{emailErr}</p>}
          </div>

          {/* Password + eye toggle */}
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
              <input className="field-input"
                type={showPw ? "text" : "password"} name="password"
                placeholder="••••••••" value={form.password}
                onChange={handleChange}
                style={passwordErr ? { borderColor: "var(--error)" } : {}}
                required />
              <button type="button" className="eye-toggle" tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {passwordErr && <p style={{ fontSize: 12, color: "var(--error)", marginTop: 4 }}>{passwordErr}</p>}
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
