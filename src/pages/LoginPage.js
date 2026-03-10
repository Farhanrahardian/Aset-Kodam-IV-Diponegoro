import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import "./LoginPage.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedIn = await auth.login(username, password);
      if (loggedIn) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Gagal untuk login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-form-container">
        <div className="login-form-wrapper">
          <div className="login-header">
            <img src="/logo-kodam-diponegoro.png" alt="Logo Kodam" className="form-logo" />
            <h3>SELAMAT DATANG</h3>
            <p>Aplikasi Data Aset & Yardip</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username (NRP)</label>
              <div className="password-input-wrapper">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan NRP / Username"
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan Password"
                  required
                  disabled={loading}
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle me-2"></i>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Mempersiapkan...
                </>
              ) : (
                "MASUK KE APLIKASI"
              )}
            </button>
          </form>

          <div className="login-footer mt-4">
            <p className="text-muted small">&copy; 2025 Kodam IV/Diponegoro</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
