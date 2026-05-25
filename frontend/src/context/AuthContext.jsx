// frontend/src/context/AuthContext.jsx
//
// JWT is stored ONLY in:
//   - accessToken  → React ref (in-memory, gone on page close)
//   - refreshToken → sessionStorage (cleared on tab/browser close)
// No JWT is ever written to localStorage.

import { createContext, useContext, useState, useCallback, useRef } from "react";
import API_URL from "../api";

const AuthContext = createContext(null);

function isTokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return !exp || Date.now() >= exp * 1000 - 30_000;
  } catch {
    return true;
  }
}

function clearStorage() {
  sessionStorage.removeItem("ppse_user");
  sessionStorage.removeItem("ppse_refresh_token");
  // Also wipe any old localStorage keys from previous versions
  localStorage.removeItem("ppse_user");
  localStorage.removeItem("ppse_token");
  localStorage.removeItem("ppse_refresh_token");
}

export function AuthProvider({ children }) {
  const accessTokenRef = useRef(null); // memory only — gone on close

  const [user, setUser] = useState(() => {
    try {
      // Wipe any stale localStorage session on first load
      if (localStorage.getItem("ppse_refresh_token") || localStorage.getItem("ppse_token")) {
        clearStorage();
        return null;
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
      const rt = sessionStorage.getItem("ppse_refresh_token");
      if (!storedUser || !rt || isTokenExpired(rt)) { clearStorage(); return false; }
      return true;
    } catch {
      clearStorage();
      return false;
    }
  });

  const _persist = useCallback((userData, accessToken, refreshToken) => {
    accessTokenRef.current = accessToken;
    sessionStorage.setItem("ppse_user", JSON.stringify(userData));
    sessionStorage.setItem("ppse_refresh_token", refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const _clear = useCallback(() => {
    accessTokenRef.current = null;
    clearStorage();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const _refreshAccessToken = useCallback(async () => {
    const rt = sessionStorage.getItem("ppse_refresh_token");
    if (!rt || isTokenExpired(rt)) { _clear(); throw new Error("Session expired."); }

    const res  = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { _clear(); throw new Error("Session expired."); }

    const data = await res.json();
    accessTokenRef.current = data.accessToken;
    sessionStorage.setItem("ppse_refresh_token", data.refreshToken);
    if (data.user) { sessionStorage.setItem("ppse_user", JSON.stringify(data.user)); setUser(data.user); }
    return data.accessToken;
  }, [_clear]);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Login failed.");
      err.errorType        = data.errorType || "unknown";
      err.needsVerification = data.needsVerification || false;
      err.email            = data.email || email;
      throw err;
    }
    _persist(data.user, data.accessToken, data.refreshToken);
    return data;
  }, [_persist]);

  // ── register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (username, email, password) => {
    const res  = await fetch(`${API_URL}/api/auth/register`, {
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

  // ── logout — unlimited ────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      if (accessTokenRef.current) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessTokenRef.current}` },
        });
      }
    } catch { /* ignore */ }
    _clear();
  }, [_clear]);

  // ── resendVerification ────────────────────────────────────────────────────
  const resendVerification = useCallback(async (email) => {
    const res  = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Failed to resend.");
      err.limitReached = data.limitReached || false;
      throw err;
    }
    return data;
  }, []);

  // ── forgotPassword ────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const res  = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Failed.");
      err.errorType    = data.errorType || "unknown";
      err.limitReached = data.limitReached || false;
      throw err;
    }
    return data;
  }, []);

  // ── resetPassword ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, password) => {
    const res  = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed.");
    return data;
  }, []);

  // ── changePassword ────────────────────────────────────────────────────────
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    let token = accessTokenRef.current;
    if (!token || isTokenExpired(token)) token = await _refreshAccessToken();
    const res  = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed.");
    return data;
  }, [_refreshAccessToken]);

  // ── authFetch ─────────────────────────────────────────────────────────────
  const authFetch = useCallback(async (url, options = {}) => {
    let token = accessTokenRef.current;
    if (!token || isTokenExpired(token)) token = await _refreshAccessToken();
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { _clear(); throw new Error("Session expired."); }
    return res;
  }, [_refreshAccessToken, _clear]);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated,
      login, register, logout, authFetch,
      resendVerification, forgotPassword, resetPassword, changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
