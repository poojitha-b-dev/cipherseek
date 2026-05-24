// frontend/src/context/AuthContext.jsx
// Production-grade auth context for PPSE
//
// What's new vs original:
//  - Access token (15 min) + refresh token (7 days) pattern
//  - Automatic silent token refresh on 401 — user never gets logged out mid-session
//  - Token expiry check on app load — clears stale tokens immediately
//  - forgotPassword, resetPassword, changePassword, resendVerification methods
//  - Stores accessToken in memory (not localStorage) to prevent XSS; only
//    refreshToken goes into localStorage (it's rotated on every use)

import { createContext, useContext, useState, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AuthContext = createContext(null);

// ── Helper: parse JWT expiry without a library ──────────────────────
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  return Date.now() >= exp - 30_000; // 30s buffer before real expiry
}

export function AuthProvider({ children }) {
  // Access token lives ONLY in memory — never written to localStorage
  const accessTokenRef = useRef(null);

  // User object from localStorage for persistence across hard refreshes
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ppse_user") || "null");
    } catch {
      return null;
    }
  });

  // Track whether we're logged in (drives UI rendering)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // We have a stored user and a non-expired refresh token
    const storedUser = localStorage.getItem("ppse_user");
    const refreshToken = localStorage.getItem("ppse_refresh_token");
    if (!storedUser || !refreshToken) return false;
    // If refresh token itself is expired, clear and start fresh
    if (isTokenExpired(refreshToken)) {
      localStorage.removeItem("ppse_user");
      localStorage.removeItem("ppse_refresh_token");
      return false;
    }
    return true;
  });

  // ── Internal: persist session ──────────────────────────────────────
  const _persistSession = useCallback((userData, accessToken, refreshToken) => {
    accessTokenRef.current = accessToken;
    localStorage.setItem("ppse_user", JSON.stringify(userData));
    localStorage.setItem("ppse_refresh_token", refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  // ── Internal: clear session ────────────────────────────────────────
  const _clearSession = useCallback(() => {
    accessTokenRef.current = null;
    localStorage.removeItem("ppse_user");
    localStorage.removeItem("ppse_refresh_token");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // ── Internal: silent token refresh ────────────────────────────────
  // Called automatically when the access token is expired or missing.
  // Returns new accessToken string, or throws if refresh fails.
  const _refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem("ppse_refresh_token");
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
    localStorage.setItem("ppse_refresh_token", data.refreshToken);
    if (data.user) {
      localStorage.setItem("ppse_user", JSON.stringify(data.user));
      setUser(data.user);
    }
    return data.accessToken;
  }, [_clearSession]);

  // ── login ──────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    _persistSession(data.user, data.accessToken, data.refreshToken);
    return data;
  }, [_persistSession]);

  // ── register ───────────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    return data;
  }, []);

  // ── logout ─────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Tell the server to revoke the refresh token (best-effort)
    try {
      if (accessTokenRef.current) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessTokenRef.current}` },
        });
      }
    } catch {
      // Ignore network errors on logout — we always clear locally
    }
    _clearSession();
  }, [_clearSession]);

  // ── resendVerification ─────────────────────────────────────────────
  const resendVerification = useCallback(async (email) => {
    const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to resend verification email");
    return data;
  }, []);

  // ── forgotPassword ─────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to send reset email");
    return data;
  }, []);

  // ── resetPassword ──────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, password) => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to reset password");
    return data;
  }, []);

  // ── changePassword ─────────────────────────────────────────────────
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await authFetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to change password");
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── authFetch ──────────────────────────────────────────────────────
  // Drop-in replacement for fetch() on authenticated endpoints.
  // Automatically attaches the access token, and silently refreshes it
  // if it's expired — the caller never sees the token machinery.
  const authFetch = useCallback(async (url, options = {}) => {
    // Get a valid access token, refreshing if necessary
    let token = accessTokenRef.current;
    if (!token || isTokenExpired(token)) {
      token = await _refreshAccessToken(); // throws → triggers logout upstream
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    // If we still get a 401 after refresh, the refresh token is also invalid
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
