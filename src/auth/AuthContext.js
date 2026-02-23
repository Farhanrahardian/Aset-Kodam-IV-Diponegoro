import React, { createContext, useState, useContext } from "react";
import axios from "axios";

// ✅ UBAH: Ganti port dari 3000 ke 3001
const API_URL = "http://localhost:3001";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Cek jika ada data user di localStorage saat aplikasi pertama kali dimuat
    const storedUser = localStorage.getItem("user");
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });

  const login = async (username, password) => {
    try {
      // Gunakan endpoint login baru di backend
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });

      // Login berhasil, simpan data user
      const userData = response.data.user;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      // Ambil pesan error dari response backend
      const message = error.response?.data?.message || "Gagal untuk login.";
      throw new Error(message);
    }
  };

  const logout = () => {
    setUser(null);
    // Hapus data user dari localStorage
    localStorage.removeItem("user");
  };

  const value = { user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook kustom untuk menggunakan AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
