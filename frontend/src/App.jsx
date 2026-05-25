// frontend/src/App.jsx

import { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Search from "./pages/Search";
import About from "./pages/About";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import "./index.css";

function getCurrentRoute() {
  return {
    path:   window.location.pathname,
    params: new URLSearchParams(window.location.search),
  };
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const [page, setPage]     = useState("dashboard");
  const [route]             = useState(getCurrentRoute);

  // FIX: useEffect MUST be at the top — before any conditional returns.
  // Previously it was placed after an early return, which React forbids
  // (Rules of Hooks). This caused a silent crash → blank white page on
  // login and logout.
  useEffect(() => {
    if (isAuthenticated) {
      // Just logged in — make sure we land on dashboard, not a stale auth page
      if (["login", "register", "forgot-password"].includes(page)) {
        setPage("dashboard");
      }
    } else {
      // Just logged out — reset to login view
      setPage("login");
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Email-link routes — work regardless of auth state ─────────────
  if (route.path === "/verify-email") {
    return <VerifyEmail token={route.params.get("token")} />;
  }
  if (route.path === "/reset-password") {
    return <ResetPassword token={route.params.get("token")} />;
  }
  if (route.path === "/forgot-password") {
    return <ForgotPassword onBack={() => { window.history.replaceState({}, "", "/"); setPage("login"); }} />;
  }

  // ── Not logged in ──────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (page === "forgot-password") {
      return <ForgotPassword onBack={() => setPage("login")} />;
    }
    if (page === "register") {
      return <Register onSwitch={() => setPage("login")} />;
    }
    return (
      <Login
        onSwitch={() => setPage("register")}
        onForgotPassword={() => setPage("forgot-password")}
      />
    );
  }

  // ── Logged in ──────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Navbar page={page} setPage={setPage} />
      <main className="main-content">
        {page === "dashboard"       && <Dashboard setPage={setPage} />}
        {page === "upload"          && <Upload />}
        {page === "search"          && <Search />}
        {page === "about"           && <About />}
        {page === "change-password" && <ChangePassword onBack={() => setPage("dashboard")} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}