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

function UsernamePanel({ user, authFetch, onUsernameUpdated }) {
  const [newUsername, setNewUsername] = useState("");
  const [msg, setMsg]                 = useState({ text: "", type: "" });
  const [loading, setLoading]         = useState(false);

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

      // Update sessionStorage so it persists on refresh
      const stored = JSON.parse(sessionStorage.getItem("cipherseek_user") || "{}");
      sessionStorage.setItem("cipherseek_user", JSON.stringify({ ...stored, username: data.username }));

      // Tell parent to update the displayed name in the sidebar
      onUsernameUpdated(data.username);
      setMsg({ text: "Username updated successfully!", type: "success" });
      setNewUsername("");
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prf-panel">
      <h2 className="prf-panel-title">Change Username</h2>
      <p className="prf-panel-sub">Current: <strong style={{ color: "var(--text)" }}>{user?.username ?? "—"}</strong></p>

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
    </div>
  );
}

function PasswordPanel() {
  const { changePassword } = useAuth();
  const [form, setForm]           = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [newTouched, setNewTouched] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const strength   = getPasswordStrength(form.newPass);
  const isAcceptable = ["medium", "strong"].includes(strength.level);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isAcceptable)                        { setError("Please use a stronger password (at least Medium strength)."); return; }
    if (form.newPass !== form.confirm)         { setError("New passwords do not match."); return; }
    if (form.current === form.newPass)         { setError("New password must differ from current password."); return; }

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
      <div className="prf-panel">
        <h2 className="prf-panel-title">Change Password</h2>
        <p className="prf-panel-sub">Secure your account</p>
        <div className="alert alert-success" style={{ marginTop: 20 }}>
          ✅ Password changed successfully! Your session remains active.
        </div>
      </div>
    );
  }

  return (
    <div className="prf-panel">
      <h2 className="prf-panel-title">Change Password</h2>
      <p className="prf-panel-sub">Secure your account</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label className="field-label">Current Password</label>
          <div className="password-wrapper">
            <input className="field-input" type={showCurrent ? "text" : "password"}
              placeholder="Your current password" value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              disabled={loading} required />
            <button type="button" className="eye-toggle"
              onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
              <EyeIcon visible={showCurrent} />
            </button>
          </div>
        </div>

        <div className="field">
          <label className="field-label">New Password</label>
          <div className="password-wrapper">
            <input className="field-input" type={showNew ? "text" : "password"}
              placeholder="Min 8 characters" value={form.newPass}
              onChange={(e) => setForm({ ...form, newPass: e.target.value })}
              onFocus={() => setNewTouched(true)} disabled={loading} required />
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
          <input className="field-input" type="password"
            placeholder="Repeat new password" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            disabled={loading} required />
          {form.confirm.length > 0 && (
            <p className="confirm-match"
              style={{ color: form.newPass === form.confirm ? "#1d9e75" : "#e24b4a" }}>
              {form.newPass === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary" type="submit" disabled={loading || !isAcceptable}>
            {loading ? <span className="spinner" /> : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, authFetch } = useAuth();
  const [activeTab, setActiveTab]   = useState("username");
  // Local copy of username so it updates instantly after change
  const [displayName, setDisplayName] = useState(user?.username ?? "—");

  const initials = displayName?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <div className="page prf-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Profile Settings</h1>
            <p className="page-sub">Manage your account details</p>
          </div>
        </div>

        {/* One single joined box */}
        <div className="prf-box">

          {/* LEFT sidebar */}
          <aside className="prf-sidebar">
            {/* User info */}
            <div className="prf-user">
              <div className="prf-avatar">{initials}</div>
              <p className="prf-name">{displayName}</p>
              <p className="prf-email">{user?.email ?? ""}</p>
            </div>

            {/* Divider */}
            <div className="prf-sidebar-divider" />

            {/* Nav */}
            <nav className="prf-nav">
              <button
                className={`prf-nav-btn ${activeTab === "username" ? "active" : ""}`}
                onClick={() => setActiveTab("username")}
              >
                <span>◉</span> Change Username
              </button>
              <button
                className={`prf-nav-btn ${activeTab === "password" ? "active" : ""}`}
                onClick={() => setActiveTab("password")}
              >
                <span>🔑</span> Change Password
              </button>
            </nav>
          </aside>

          {/* Vertical divider between sidebar and content */}
          <div className="prf-divider" />

          {/* RIGHT content */}
          <div className="prf-content">
            {activeTab === "username" && (
              <UsernamePanel
                user={{ ...user, username: displayName }}
                authFetch={authFetch}
                onUsernameUpdated={(name) => setDisplayName(name)}
              />
            )}
            {activeTab === "password" && <PasswordPanel />}
          </div>
        </div>
      </div>

      <style>{`
        .prf-page { max-width: 860px; }

        /* The single joined box */
        .prf-box {
          display: grid;
          grid-template-columns: 220px 1px 1fr;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          min-height: 420px;
        }

        /* ── Sidebar ── */
        .prf-sidebar {
          display: flex;
          flex-direction: column;
          padding: 28px 20px;
          background: var(--bg-3);
        }

        .prf-user {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
          padding-bottom: 4px;
        }

        .prf-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 4px var(--accent-glow);
          margin-bottom: 6px;
        }

        .prf-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .prf-email {
          font-size: 11px;
          color: var(--text-2);
          margin: 0;
          word-break: break-all;
        }

        .prf-sidebar-divider {
          height: 1px;
          background: var(--border);
          margin: 20px 0;
        }

        /* Nav buttons */
        .prf-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .prf-nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
          background: transparent;
          border: 1px solid transparent;
          text-align: left;
          cursor: pointer;
          transition: all 0.18s;
          width: 100%;
        }

        .prf-nav-btn:hover {
          color: var(--text);
          background: var(--bg-2);
          border-color: var(--border);
        }

        .prf-nav-btn.active {
          color: var(--accent);
          background: var(--accent-glow);
          border-color: var(--border-h);
        }

        /* Vertical divider line */
        .prf-divider {
          background: var(--border);
          width: 1px;
        }

        /* Right content area */
        .prf-content {
          padding: 0;
          min-width: 0;
        }

        .prf-panel {
          padding: 28px;
          height: 100%;
          box-sizing: border-box;
        }

        .prf-panel-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
        }

        .prf-panel-sub {
          font-size: 13px;
          color: var(--text-2);
          margin: 0;
        }

        /* ── Responsive: tablet ── */
        @media (max-width: 700px) {
          .prf-box {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1px auto;
          }

          .prf-sidebar {
            padding: 20px;
          }

          .prf-user {
            flex-direction: row;
            text-align: left;
            gap: 14px;
          }

          .prf-avatar { margin-bottom: 0; flex-shrink: 0; }

          .prf-nav {
            flex-direction: row;
          }

          .prf-nav-btn {
            flex: 1;
            justify-content: center;
          }

          .prf-sidebar-divider { display: none; }

          /* Horizontal divider between sidebar and content on mobile */
          .prf-divider {
            width: 100%;
            height: 1px;
          }

          .prf-panel { padding: 20px; }
        }

        /* ── Responsive: small mobile ── */
        @media (max-width: 400px) {
          .prf-user { flex-direction: column; text-align: center; }
          .prf-nav-btn { font-size: 12px; padding: 9px 8px; gap: 5px; }
        }
      `}</style>
    </>
  );
}