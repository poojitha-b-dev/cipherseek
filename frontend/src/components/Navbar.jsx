import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "upload",    label: "Encrypt & Store", icon: "⬢" },
  { id: "search",    label: "Search", icon: "◎" },
  { id: "about",     label: "About", icon: "◈" },
];

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
      viewBox="0 0 24 24" fill="none" stroke="#6366f1"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" stroke="#6366f1" strokeWidth="2" />
    </svg>
  );
}

export default function Navbar({ page, setPage }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (id) => {
    setPage(id);
    setMenuOpen(false);
  };

  return (
    <nav className="navbar" style={{ position: "relative" }}>
      {/* Brand */}
      <div className="navbar-brand">
        <ShieldIcon />
        <div>
          <div className="brand-title">PPSE</div>
          <div className="brand-sub">Privacy-Preserving Searchable Encryption</div>
        </div>
      </div>

      {/* Desktop nav links */}
      <div className="nav-links">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? "active" : ""}`}
            onClick={() => navigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="navbar-right">
        <button className="theme-toggle" onClick={toggle} title="Toggle theme">
          {dark ? "☀" : "🌙"}
        </button>
        <div className="user-pill">
          <span className="user-avatar">{user?.username?.[0]?.toUpperCase() || "U"}</span>
          <span className="user-name">{user?.username || user?.email}</span>
        </div>
        <button className="logout-btn" onClick={logout}>Logout</button>

        {/* Hamburger — mobile only */}
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-btn ${page === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}