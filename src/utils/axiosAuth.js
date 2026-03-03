// src/utils/axiosAuth.js
// ============================================================
// Helper ini menggantikan semua pemakaian `axios` di frontend.
// Secara otomatis:
//   1. Menambahkan header Authorization: Bearer <token>
//   2. Jika server balas 401/403 (token expired/invalid) →
//      user di-logout otomatis dan diarahkan ke halaman login
// ============================================================

import axios from "axios";

const axiosAuth = axios.create();

// ── Request interceptor: tambah token di setiap request ──
axiosAuth.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.token) {
          config.headers["Authorization"] = `Bearer ${userData.token}`;
        }
      } catch (_) {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401/403 (token expired) ──
axiosAuth.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Hapus data user & redirect ke login
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosAuth;