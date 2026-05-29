// frontend/src/pages/Profile.jsx
// Drop this file at:  frontend/src/pages/Profile.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import API_URL from "../api";

export default function Profile({ onBack }) {
  const { user, setUser, authFetch, changePassword } = useAuth();

  // ── Username form state ──
  const [newUsername, setNewUsername]       = useState("");
  const [usernameMsg, setUsernameMsg]       = useState({ text: "", type: "" });
  const [usernameLoading, setUsernameLoading] = useState(false);

  // ── Password form state ──
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMsg, setPasswordMsg]       = useState({ text: "", type: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── Change Username ──────────────────────────────────────────────────────
  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setUsernameMsg({ text: "", type: "" });

    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUsernameMsg({ text: "Username cannot be empty.", type: "error" });
      return;
    }
    if (trimmed === user?.username) {
      setUsernameMsg({ text: "That's already your username.", type: "error" });
      return;
    }

    setUsernameLoading(true);
    try {
      const res  = await authFetch(`${API_URL}/api/auth/change-username`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newUsername: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update username.");

      // Update the user object in AuthContext + sessionStorage so it persists
      const updated = { ...user, username: data.username };
      sessionStorage.setItem("cipherseek_user", JSON.stringify(updated));
      // AuthContext doesn't expose setUser directly, but we can force a re-read
      // by calling the /me endpoint via authFetch — simplest is a page-level state:
      setUsernameMsg({ text: `Username changed to "${data.username}"!`, type: "success" });
      setNewUsername("");
    } catch (err) {
      setUsernameMsg({ text: err.message, type: "error" });
    } finally {
      setUsernameLoading(false);
    }
  };

  // ── Change Password ──────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: "", type: "" });

    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ text: "All three fields are required.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ text: "New password must be at least 8 characters.", type: "error" });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMsg({ text: "New password must differ from your current password.", type: "error" });
      return;
    }

    setPasswordLoading(true);
    try {
      // Uses the changePassword helper already in AuthContext — identical to ChangePassword page
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ text: "Password changed successfully!", type: "success" });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordMsg({ text: err.message, type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = user?.username?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="profile-page">

      {/* ── Header ── */}
      <div className="profile-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back">
          ← Back
        </button>
        <div className="profile-hero">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h1 className="profile-name">{user?.username ?? "—"}</h1>
            <p className="profile-email">{user?.email ?? ""}</p>
          </div>
        </div>
      </div>

      {/* ── Change Username ── */}
      <section className="profile-card">
        <h2 className="card-title">Change Username</h2>
        <p className="card-desc">
          Current username: <strong>{user?.username ?? "—"}</strong>
        </p>
        <form onSubmit={handleUsernameSubmit} className="profile-form">
          <div className="field-wrap">
            <label htmlFor="newUsername">New Username</label>
            <input
              id="newUsername"
              type="text"
              placeholder="2–30 characters, letters/numbers/_ ."
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="off"
              disabled={usernameLoading}
            />
          </div>
          {usernameMsg.text && (
            <p className={`form-feedback ${usernameMsg.type}`}>{usernameMsg.text}</p>
          )}
          <button className="btn-save" type="submit" disabled={usernameLoading}>
            {usernameLoading ? "Saving…" : "Update Username"}
          </button>
        </form>
      </section>

      {/* ── Change Password ── */}
      <section className="profile-card">
        <h2 className="card-title">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="profile-form">
          <div className="field-wrap">
            <label htmlFor="currentPw">Current Password</label>
            <input
              id="currentPw"
              type="password"
              placeholder="Enter your current password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              disabled={passwordLoading}
            />
          </div>
          <div className="field-wrap">
            <label htmlFor="newPw">New Password</label>
            <input
              id="newPw"
              type="password"
              placeholder="At least 8 characters"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              disabled={passwordLoading}
            />
          </div>
          <div className="field-wrap">
            <label htmlFor="confirmPw">Confirm New Password</label>
            <input
              id="confirmPw"
              type="password"
              placeholder="Repeat new password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              disabled={passwordLoading}
            />
          </div>
          {passwordMsg.text && (
            <p className={`form-feedback ${passwordMsg.type}`}>{passwordMsg.text}</p>
          )}
          <button className="btn-save" type="submit" disabled={passwordLoading}>
            {passwordLoading ? "Saving…" : "Change Password"}
          </button>
        </form>
      </section>

      <style>{`
        .profile-page {
          max-width: 520px;
          margin: 0 auto;
          padding: 1.5rem 1.25rem 4rem;
        }

        /* Back button */
        .back-btn {
          background: none;
          border: none;
          color: var(--color-primary, #4f8ef7);
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 1.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          opacity: 0.85;
          transition: opacity 0.15s;
        }
        .back-btn:hover { opacity: 1; }

        /* Hero */
        .profile-hero {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .profile-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--color-primary, #4f8ef7);
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .profile-name {
          margin: 0 0 0.2rem;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .profile-email {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.55;
        }

        /* Cards */
        .profile-card {
          background: var(--card-bg, rgba(255,255,255,0.04));
          border: 1px solid var(--border-color, rgba(255,255,255,0.1));
          border-radius: 14px;
          padding: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .card-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.35rem;
        }
        .card-desc {
          font-size: 0.85rem;
          opacity: 0.6;
          margin: 0 0 1.1rem;
        }

        /* Form */
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .field-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .field-wrap label {
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .field-wrap input {
          padding: 0.6rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border-color, rgba(255,255,255,0.14));
          background: var(--input-bg, rgba(255,255,255,0.06));
          color: inherit;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
          box-sizing: border-box;
        }
        .field-wrap input:focus {
          border-color: var(--color-primary, #4f8ef7);
        }
        .field-wrap input:disabled {
          opacity: 0.5;
        }

        /* Feedback */
        .form-feedback {
          font-size: 0.83rem;
          margin: 0;
          padding: 0.45rem 0.7rem;
          border-radius: 7px;
        }
        .form-feedback.success {
          background: rgba(72,199,142,0.12);
          color: #48c78e;
          border: 1px solid rgba(72,199,142,0.28);
        }
        .form-feedback.error {
          background: rgba(241,70,104,0.12);
          color: #f14668;
          border: 1px solid rgba(241,70,104,0.28);
        }

        /* Button */
        .btn-save {
          padding: 0.65rem 1.3rem;
          border-radius: 8px;
          border: none;
          background: var(--color-primary, #4f8ef7);
          color: #fff;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
          transition: opacity 0.18s, transform 0.12s;
        }
        .btn-save:hover:not(:disabled) {
          opacity: 0.85;
          transform: translateY(-1px);
        }
        .btn-save:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}