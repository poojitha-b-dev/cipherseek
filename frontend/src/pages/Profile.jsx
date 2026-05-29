// frontend/src/pages/Profile.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import API_URL from "../api";

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)          score++;
  if (password.length >= 12)         score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[a-z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { level: "weak",   label: "Weak",   color: "#e24b4a", width: "25%"  };
  if (score <= 3) return { level: "fair",   label: "Fair",   color: "#ef9f27", width: "50%"  };
  if (score <= 4) return { level: "medium", label: "Medium", color: "#639922", width: "70%"  };
  return             { level: "strong", label: "Strong", color: "#1d9e75", width: "100%" };
}

const EyeIcon = ({ visible }) => visible ? (
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

// ── Username Panel ────────────────────────────────────────────────────────────
function UsernamePanel({ user, authFetch }) {
  const [newUsername, setNewUsername]         = useState("");
  const [msg, setMsg]                         = useState({ text: "", type: "" });
  const [loading, setLoading]                 = useState(false);
  const [successDone, setSuccessDone]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    const trimmed = newUsername.trim();
    if (!trimmed) { setMsg({ text: "Username cannot be empty.", type: "error" }); return; }
    if (trimmed === user?.username) { setMsg({ text: "That's already your username.", type: "error" }); return; }

    setLoading(true);
    try {
      const res  = await authFetch(`${API_URL}/api/auth/change-username`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newUsername: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update username.");

      // Persist updated username in sessionStorage so it survives a refresh
      const stored = JSON.parse(sessionStorage.getItem("cipherseek_user") || "{}");
      sessionStorage.setItem("cipherseek_user", JSON.stringify({ ...stored, username: data.username }));

      setMsg({ text: `Username changed to "${data.username}" successfully!`, type: "success" });
      setNewUsername("");
      setSuccessDone(true);
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-panel">
      <div className="panel-top">
        <span className="panel-icon">◉</span>
        <div>
          <h2 className="panel-title">Change Username</h2>
          <p className="panel-desc">Current: <strong style={{ color: "var(--text)" }}>{user?.username ?? "—"}</strong></p>
        </div>
      </div>

      {successDone ? (
        <div className="alert alert-success" style={{ marginTop: 16 }}>
          ✅ Username updated! Refresh the page to see the new name in the navbar.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          {msg.text && (
            <div className={`alert ${msg.type === "success" ? "alert-success" : "alert-error"}`}>
              {msg.text}
            </div>
          )}
          <div className="field">
            <label className="field-label">New Username</label>
            <input
              className="field-input"
              type="text"
              placeholder="2–30 characters, letters / numbers / _ ."
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Update Username"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Password Panel ────────────────────────────────────────────────────────────
function PasswordPanel({ changePassword }) {
  const [form, setForm]           = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [newTouched, setNewTouched] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const strength = getPasswordStrength(form.newPass);
  const isAcceptable = ["medium", "strong"].includes(strength.level);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isAcceptable) { setError("Please use a stronger password (at least Medium strength)."); return; }
    if (form.newPass !== form.confirm) { setError("New passwords do not match."); return; }
    if (form.current === form.newPass) { setError("New password must differ from current password."); return; }

    setLoading(true);
    try {
      await changePassword(form.current, form.newPass);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="profile-panel">
        <div className="panel-top">
          <span className="panel-icon">🔑</span>
          <div>
            <h2 className="panel-title">Change Password</h2>
            <p className="panel-desc">Secure your account</p>
          </div>
        </div>
        <div className="alert alert-success" style={{ marginTop: 16 }}>
          ✅ Password changed successfully! Your session remains active.
        </div>
      </div>
    );
  }

  return (
    <div className="profile-panel">
      <div className="panel-top">
        <span className="panel-icon">🔑</span>
        <div>
          <h2 className="panel-title">Change Password</h2>
          <p className="panel-desc">Secure your account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label className="field-label">Current Password</label>
          <div className="password-wrapper">
            <input
              className="field-input"
              type={showCurrent ? "text" : "password"}
              placeholder="Your current password"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              disabled={loading}
              required
            />
            <button type="button" className="eye-toggle"
              onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
              <EyeIcon visible={showCurrent} />
            </button>
          </div>
        </div>

        <div className="field">
          <label className="field-label">New Password</label>
          <div className="password-wrapper">
            <input
              className="field-input"
              type={showNew ? "text" : "password"}
              placeholder="Min 8 characters"
              value={form.newPass}
              onChange={(e) => setForm({ ...form, newPass: e.target.value })}
              onFocus={() => setNewTouched(true)}
              disabled={loading}
              required
            />
            <button type="button" className="eye-toggle"
              onClick={() => setShowNew(v => !v)} tabIndex={-1}>
              <EyeIcon visible={showNew} />
            </button>
          </div>
          {newTouched && form.newPass.length > 0 && (
            <div className="strength-section">
              <div className="strength-bar-track">
                <div className="strength-bar-fill"
                  style={{ width: strength.width, backgroundColor: strength.color }} />
              </div>
              <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
        </div>

        <div className="field">
          <label className="field-label">Confirm New Password</label>
          <input
            className="field-input"
            type="password"
            placeholder="Repeat new password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            disabled={loading}
            required
          />
          {form.confirm.length > 0 && (
            <p className="confirm-match"
              style={{ color: form.newPass === form.confirm ? "#1d9e75" : "#e24b4a" }}>
              {form.newPass === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary" type="submit"
            disabled={loading || !isAcceptable}>
            {loading ? <span className="spinner" /> : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function Profile({ onBack }) {
  const { user, authFetch, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState("username");

  const initials = user?.username?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <div className="page profile-page-wrap">

        {/* ── Page header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Profile Settings</h1>
            <p className="page-sub">Manage your account details</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={onBack}>← Back</button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="profile-layout">

          {/* LEFT — user card + tab buttons */}
          <aside className="profile-sidebar">
            {/* User card */}
            <div className="profile-user-card">
              <div className="profile-avatar-lg">{initials}</div>
              <div className="profile-user-info">
                <p className="profile-user-name">{user?.username ?? "—"}</p>
                <p className="profile-user-email">{user?.email ?? ""}</p>
              </div>
            </div>

            {/* Tab buttons */}
            <nav className="profile-nav">
              <button
                className={`profile-nav-btn ${activeTab === "username" ? "active" : ""}`}
                onClick={() => setActiveTab("username")}
              >
                <span className="pnb-icon">◉</span>
                <span>Change Username</span>
              </button>
              <button
                className={`profile-nav-btn ${activeTab === "password" ? "active" : ""}`}
                onClick={() => setActiveTab("password")}
              >
                <span className="pnb-icon">🔑</span>
                <span>Change Password</span>
              </button>
            </nav>
          </aside>

          {/* RIGHT — active panel */}
          <div className="profile-content">
            {activeTab === "username" && (
              <UsernamePanel user={user} authFetch={authFetch} />
            )}
            {activeTab === "password" && (
              <PasswordPanel changePassword={changePassword} />
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* ── Layout ── */
        .profile-page-wrap {
          max-width: 900px;
        }

        .profile-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          align-items: start;
        }

        /* ── Sidebar ── */
        .profile-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .profile-user-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        .profile-avatar-lg {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          font-size: 1.6rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 4px var(--accent-glow);
          flex-shrink: 0;
        }

        .profile-user-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .profile-user-email {
          font-size: 0.78rem;
          color: var(--text-2);
          margin: 0;
          word-break: break-all;
        }

        /* ── Sidebar nav ── */
        .profile-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .profile-nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-2);
          background: var(--bg-2);
          border: 1px solid var(--border);
          text-align: left;
          transition: all 0.18s;
          cursor: pointer;
          width: 100%;
        }

        .profile-nav-btn:hover {
          color: var(--text);
          border-color: var(--border-h);
          background: var(--bg-3);
        }

        .profile-nav-btn.active {
          color: var(--accent);
          background: var(--accent-glow);
          border-color: var(--border-h);
        }

        .pnb-icon { font-size: 15px; flex-shrink: 0; }

        /* ── Right panel ── */
        .profile-panel {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px;
        }

        .panel-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }

        .panel-icon {
          font-size: 1.4rem;
          line-height: 1;
        }

        .panel-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 2px;
        }

        .panel-desc {
          font-size: 13px;
          color: var(--text-2);
          margin: 0;
        }

        /* ── Responsive ── */

        /* Tablet */
        @media (max-width: 768px) {
          .profile-layout {
            grid-template-columns: 1fr;
          }

          .profile-sidebar {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .profile-user-card {
            flex-direction: row;
            text-align: left;
            flex: 1;
            min-width: 200px;
          }

          .profile-nav {
            flex-direction: row;
            flex: 1;
            min-width: 200px;
          }

          .profile-nav-btn {
            flex: 1;
            justify-content: center;
          }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .profile-panel {
            padding: 20px 16px;
          }

          .profile-sidebar {
            flex-direction: column;
          }

          .profile-user-card {
            flex-direction: column;
            text-align: center;
          }

          .profile-nav {
            flex-direction: row;
          }

          .profile-nav-btn {
            font-size: 13px;
            padding: 10px 10px;
            gap: 6px;
          }
        }
      `}</style>
    </>
  );
}