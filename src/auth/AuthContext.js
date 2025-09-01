
import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Cek jika ada data user di localStorage saat aplikasi pertama kali dimuat
    const storedUser = localStorage.getItem('user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });

  const login = async (username, password) => {
    try {
      // Ambil semua user dari db.json
      const response = await axios.get('http://localhost:3001/users');
      const users = response.data;
      // Cari user yang cocok
      const foundUser = users.find(u => u.username === username && u.password === password);

      if (foundUser) {
        const userData = { id: foundUser.id, username: foundUser.username, name: foundUser.name };
        setUser(userData);
        // Simpan data user di localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      } else {
        throw new Error('Username atau password salah.');
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    // Hapus data user dari localStorage
    localStorage.removeItem('user');
  };

  const value = { user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook kustom untuk menggunakan AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
