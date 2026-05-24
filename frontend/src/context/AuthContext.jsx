// frontend/src/context/AuthContext.jsx

import { createContext, useContext, useState, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const AuthContext = createContext(null);

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    return Date.now() >= payload.exp * 1000 - 30_000;
  } catch {
    return true;
  }
}

// Wipe ALL old token keys (old format used ppse_token, new uses ppse_refresh_token)
function clearStorage() {
  localStorage.removeItem("ppse_user");
  localStorage.removeItem("ppse_token");          // old key — must purge
  localStorage.removeItem("ppse_refresh_token");  // new key
}

export function AuthProvider({ children }) {
  const accessTokenRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      // If there's an old-format token (ppse_token) but no refresh token,
      // wipe everything so the app doesn't crash on load.
      const oldToken = localStorage.getItem("ppse_token");
      const refreshToken = localStorage.getItem("ppse_refresh_token");
      if (oldToken && !refreshToken) {
        clearStorage();
        return null;
      }
      return JSON.parse(localStorage.getItem("ppse_user") || "null");
    } catch {
      clearStorage();
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const storedUser = localStorage.getItem("ppse_user");
      const refreshToken = localStorage.getItem("ppse_refresh_token");
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
    localStorage.setItem("ppse_user", JSON.stringify(userData));
    localStorage.setItem("ppse_refresh_token", refreshToken);
    // Remove old key if present
    localStorage.removeItem("ppse_token");
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

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      // Attach the raw response fields so Login.jsx can read needsVerification
      const err = new Error(data.message || "Login failed");
      err.needsVerification = data.needsVerification || false;
      err.email = data.email || email;
      throw err;
    }
    _persistSession(data.user, data.accessToken, data.refreshToken);
    return data;
  }, [_persistSession]);

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

  const logout = useCallback(async () => {
    try {
      if (accessTokenRef.current) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessTokenRef.current}` },
        });
      }
    } catch { /* ignore */ }
    _clearSession();
  }, [_clearSession]);

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
    if (!res.ok) throw new Error(data.message || "Failed to change password");
    return data;
  }, [_refreshAccessToken]);

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
      user, isAuthenticated,
      login, register, logout, authFetch,
      resendVerification, forgotPassword, resetPassword, changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}