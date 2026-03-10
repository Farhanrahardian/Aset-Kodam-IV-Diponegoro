import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import axiosAuth from "../utils/axiosAuth";
import { FaLock, FaKey, FaShieldAlt, FaCheckCircle } from "react-icons/fa";
import "./SettingsPage.css";

const API_URL = "http://localhost:3001";

const SettingsPage = () => {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Password baru tidak cocok.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError("Password baru minimal 8 karakter dan harus mengandung huruf dan angka.");
      return;
    }

    setLoading(true);
    try {
      await axiosAuth.put(`${API_URL}/auth/change-password`, {
        oldPassword,
        newPassword,
      });

      setMessage("Password berhasil diperbarui.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <FaShieldAlt />
          </div>
          <div>
            <h1 className="page-title">Pengaturan Akun</h1>
            <p className="page-subtitle">Kelola keamanan akun Anda</p>
          </div>
        </div>
      </div>

      <div className="settings-content">
        {/* User Info Card */}
        <div className="info-card">
          <div className="info-header">
            <FaLock className="info-icon" />
            <h3>Informasi Akun</h3>
          </div>
          <div className="info-body">
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value">{user?.username || "-"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Nama Lengkap</span>
              <span className="info-value">{user?.name || "-"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className="info-value">
                <span className={`role-badge ${user?.role === 'admin' ? 'admin' : 'user'}`}>
                  {user?.role === 'admin' ? 'Administrator' : 'Pengguna'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="settings-card">
          <div className="card-header">
            <FaKey className="card-icon" />
            <h3>Ganti Password</h3>
          </div>
          
          <div className="card-body">
            {message && (
              <div className="alert alert-success">
                <FaCheckCircle className="alert-icon" />
                <span>{message}</span>
              </div>
            )}
            
            {error && (
              <div className="alert alert-error">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form className="password-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="oldPassword">Password Lama</label>
                  <input
                    type="password"
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password lama"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newPassword">Password Baru</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter (huruf + angka)"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
