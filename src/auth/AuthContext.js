// src/auth/AuthContext.jsx
import React, { createContext, useState, useContext, useRef, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:3001";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const heartbeatRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  // ── Helpers untuk kirim request dengan token ──
  const authHeaders = (token) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  // ── Heartbeat ──────────────────────────────────────────────
  const sendHeartbeat = async (userId, token) => {
    try {
      await fetch(`${API_URL}/users/heartbeat`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ userId }),
      });
      reconnectAttempts.current = 0; // Reset reconnect attempts on success
    } catch (error) {
      // Jangan logout user jika heartbeat gagal!
      // Hanya log error dan coba lagi nanti
      console.warn("Heartbeat gagal (user tetap login):", error.message);
      
      // Retry dengan exponential backoff (max 3x)
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        const retryDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        setTimeout(() => sendHeartbeat(userId, token), retryDelay);
      }
    }
  };

  const startHeartbeat = (userId, token) => {
    // Kirim heartbeat pertama
    sendHeartbeat(userId, token);

    // Set interval untuk heartbeat berikutnya (setiap 30 detik)
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(userId, token);
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    reconnectAttempts.current = 0;
  };

  // ── Restart heartbeat saat reload halaman (user sudah login) ──
  useEffect(() => {
    if (user?.id && user?.token) {
      startHeartbeat(user.id, user.token);
    }
    return () => stopHeartbeat();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ──────────────────────────────────────────────────
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });

      // response.data = { id, username, name, role, token }
      const userData = response.data;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));

      startHeartbeat(userData.id, userData.token);
      return true;
    } catch (error) {
      const message =
        error.response?.data?.message || "Username atau password salah.";
      throw new Error(message);
    }
  };

  // ── Logout ─────────────────────────────────────────────────
  const logout = async () => {
    if (user?.id && user?.token) {
      stopHeartbeat();
      try {
        await fetch(`${API_URL}/users/logout-status`, {
          method: "POST",
          headers: authHeaders(user.token),
          body: JSON.stringify({ userId: user.id }),
        });
      } catch (_) {
        // Tetap logout meski request gagal
      }
    }
    setUser(null);
    localStorage.removeItem("user");
  };

  const value = { user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);