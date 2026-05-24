// frontend/src/App.jsx
// Adds URL-aware routing for the new auth pages:
//   /verify-email?token=...    → VerifyEmail page (linked from email)
//   /reset-password?token=...  → ResetPassword page (linked from email)
//   /forgot-password           → ForgotPassword page
//   /change-password           → ChangePassword page (authenticated)
//
// All other routing behaviour is unchanged from the original.

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

// ── Read the current URL path / query params ───────────────────────
function getCurrentRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  return { path, params };
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [route] = useState(getCurrentRoute);

  // ── Handle special URL-based routes (from email links) ────────────
  // These must work whether the user is logged in or not.
  if (route.path === "/verify-email") {
    return <VerifyEmail token={route.params.get("token")} />;
  }
  if (route.path === "/reset-password") {
    return <ResetPassword token={route.params.get("token")} />;
  }
  if (route.path === "/forgot-password") {
    return <ForgotPassword onBack={() => navigateTo("/")} />;
  }

  // ── Unauthenticated app-state routing ─────────────────────────────
  if (!isAuthenticated) {
    // Keep "forgot-password" accessible as an in-app state too
    if (page === "forgot-password") {
      return <ForgotPassword onBack={() => setPage("login")} />;
    }
    return page === "register" ? (
      <Register onSwitch={() => setPage("login")} />
    ) : (
      <Login
        onSwitch={() => setPage("register")}
        onForgotPassword={() => setPage("forgot-password")}
      />
    );
  }

  // ── Authenticated routing ─────────────────────────────────────────
  // Redirect to dashboard once logged in (handles stale page state)
  useEffect(() => {
    if (isAuthenticated && (page === "login" || page === "register" || page === "forgot-password")) {
      setPage("dashboard");
    }
  }, [isAuthenticated, page]);

  return (
    <div className="app-shell">
      <Navbar page={page} setPage={setPage} />
      <main className="main-content">
        {page === "dashboard" && <Dashboard setPage={setPage} />}
        {page === "upload" && <Upload />}
        {page === "search" && <Search />}
        {page === "about" && <About />}
        {page === "change-password" && <ChangePassword onBack={() => setPage("dashboard")} />}
      </main>
    </div>
  );
}

// Simple helper for redirecting after email-link landing
function navigateTo(path) {
  window.location.href = path;
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
