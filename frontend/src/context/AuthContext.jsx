// frontend/src/context/AuthContext.jsx
//
// KEY CHANGE — session storage strategy:
//   Refresh token is stored in sessionStorage (not localStorage).
//   sessionStorage is cleared automatically when the tab/browser is closed,
//   so the user is always logged out on a fresh tab/window open.
//   User profile is also in sessionStorage for the same reason.
//   The in-memory accessToken (ref) already disappears on page close.
//
// Other fixes:
//   - login() maps errorType from backend to specific field errors
//   - resendVerification() tracks remaining resends from backend response
//   - Unlimited login/logout — no artificial caps

import { createContext, useContext, useState, useCallback, useRef } from "react";
import API_URL from "../api";

const AuthContext = createContext(null);

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    // 30s buffer so we refresh before the server rejects it
    return Date.now() >= payload.exp * 1000 - 30_000;
  } catch {
    return true;
  }
}

function clearStorage() {
  // Clear both sessionStorage (current) and localStorage (old keys) on wipe
  sessionStorage.removeItem("ppse_user");
  sessionStorage.removeItem("ppse_refresh_token");
  localStorage.removeItem("ppse_user");
  localStorage.removeItem("ppse_token");
  localStorage.removeItem("ppse_refresh_token");
}

export function AuthProvider({ children }) {
  // Access token lives only in memory — gone on page close
  const accessTokenRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      // Migrate any old localStorage session to sessionStorage on first load
      const oldUser = localStorage.getItem("ppse_user");
      const oldRefresh = localStorage.getItem("ppse_refresh_token") || localStorage.getItem("ppse_token");
      if (oldUser && oldRefresh) {
        // There was an old session — wipe it. User must log in again.
        clearStorage();
      }
      return JSON.parse(sessionStorage.getItem("ppse_user") || "null");
    } catch {
      clearStorage();
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const storedUser = sessionStorage.getItem("ppse_user");
      const refreshToken = sessionStorage.getItem("ppse_refresh_token");
      if (!storedUser || !refreshToken) return false;
      if (isTokenExpired(refreshToken)) {
        clearStorage();
        return false;
      }
      return true;
    } catch {
      clearStorage();
      return false;
    }
  });

  const _persistSession = useCallback((userData, accessToken, refreshToken) => {
    accessTokenRef.current = accessToken;
    // sessionStorage — cleared automatically when tab/browser closes
    sessionStorage.setItem("ppse_user", JSON.stringify(userData));
    sessionStorage.setItem("ppse_refresh_token", refreshToken);
    // Remove any stale localStorage keys
    localStorage.removeItem("ppse_user");
    localStorage.removeItem("ppse_token");
    localStorage.removeItem("ppse_refresh_token");
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const _clearSession = useCallback(() => {
    accessTokenRef.current = null;
    clearStorage();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const _refreshAccessToken = useCallback(async () => {
    const refreshToken = sessionStorage.getItem("ppse_refresh_token");
    if (!refreshToken || isTokenExpired(refreshToken)) {
      _clearSession();
      throw new Error("Session expired. Please log in again.");
    }
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      _clearSession();
      throw new Error("Session expired. Please log in again.");
    }
    const data = await res.json();
    accessTokenRef.current = data.accessToken;
    sessionStorage.setItem("ppse_refresh_token", data.refreshToken);
    if (data.user) {
      sessionStorage.setItem("ppse_user", JSON.stringify(data.user));
      setUser(data.user);
    }
    return data.accessToken;
  }, [_clearSession]);

  // ── login ─────────────────────────────────────────────────────────────────
  // Throws an error with errorType attached so Login.jsx can route to the
  // correct field (email field vs password field) without string matching.
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Login failed.");
      err.errorType = data.errorType || "unknown";
      err.needsVerification = data.needsVerification || false;
      err.email = data.email || email;
      throw err;
    }
    _persistSession(data.user, data.accessToken, data.refreshToken);
    return data;
  }, [_persistSession]);

  // ── register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Registration failed.");
      err.errorType = data.errorType || "unknown";
      throw err;
    }
    return data;
  }, []);

  // ── logout — unlimited, no caps ───────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      if (accessTokenRef.current) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessTokenRef.current}` },
        });
      }
    } catch { /* ignore network errors on logout */ }
    _clearSession();
  }, [_clearSession]);

  // ── resendVerification — returns remaining count from backend ─────────────
  const resendVerification = useCallback(async (email) => {
    const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Failed to resend verification email.");
      err.limitReached = data.limitReached || false;
      err.resendCount = data.resendCount || 0;
      throw err;
    }
    return data; // includes { resendCount, resendRemaining }
  }, []);

  // ── forgotPassword ────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Failed to send reset email.");
      err.errorType = data.errorType || "unknown";
      throw err;
    }
    return data;
  }, []);

  // ── resetPassword ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, password) => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to reset password.");
    return data;
  }, []);

  // ── changePassword ────────────────────────────────────────────────────────
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    let token = accessTokenRef.current;
    if (!token || isTokenExpired(token)) {
      token = await _refreshAccessToken();
    }
    const res = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to change password.");
    return data;
  }, [_refreshAccessToken]);

  // ── authFetch — wraps all authenticated API calls ─────────────────────────
  const authFetch = useCallback(async (url, options = {}) => {
    let token = accessTokenRef.current;
    if (!token || isTokenExpired(token)) {
      token = await _refreshAccessToken();
    }
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      _clearSession();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  }, [_refreshAccessToken, _clearSession]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      register,
      logout,
      authFetch,
      resendVerification,
      forgotPassword,
      resetPassword,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
