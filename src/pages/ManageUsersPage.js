import React, { useState, useEffect, useCallback } from "react";
import { FaUserPlus, FaEdit, FaTrash, FaSearch, FaCheckCircle, FaCircle, FaClock } from "react-icons/fa";
import Swal from "sweetalert2";
import axiosAuth from "../utils/axiosAuth";
import "./ManageUsersPage.css";

const API_URL = "http://localhost:3001";

const ManageUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [onlineTimestamps, setOnlineTimestamps] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "", password: "", name: "", role: "pengguna",
  });
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axiosAuth.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      setError("Gagal mengambil data pengguna");
    }
  }, []);

  const fetchOnlineStatus = useCallback(async () => {
    try {
      const response = await axiosAuth.get(`${API_URL}/users/online-status`);
      console.log("Online status response:", response.data);
      const statusMap = {};
      const timestampMap = {};
      response.data.forEach((u) => {
        statusMap[u.id] = u.is_online;
        // Gunakan last_active dari database
        // last_active adalah timestamp terakhir user aktif/online
        timestampMap[u.id] = {
          is_online: u.is_online,
          last_active: u.last_active || null,
        };
      });
      setOnlineStatus(statusMap);
      setOnlineTimestamps(timestampMap);
    } catch (err) {
      console.error("Error fetching online status:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchOnlineStatus();
    const interval = setInterval(() => {
      fetchUsers();
      fetchOnlineStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchUsers, fetchOnlineStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (user = null) => {
    setError(""); setModalError("");
    if (user) {
      setIsEditing(true); setCurrentUser(user);
      setFormData({ username: user.username, password: "", name: user.name, role: user.role });
    } else {
      setIsEditing(false); setCurrentUser(null);
      setFormData({ username: "", password: "", name: "", role: "pengguna" });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false); setCurrentUser(null); setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setModalError("");

    if (formData.username.length !== 18 || !/^\d+$/.test(formData.username)) {
      setModalError("NRP (Username) harus berupa 18 digit angka."); return;
    }
    if (!isEditing || (isEditing && formData.password)) {
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        setModalError("Password minimal 8 karakter dan harus mengandung huruf dan angka."); return;
      }
    }
    if (!isEditing && !formData.password) {
      setModalError("Password wajib diisi untuk pengguna baru."); return;
    }

    const url = isEditing ? `${API_URL}/users/${currentUser.id}` : `${API_URL}/users`;
    const method = isEditing ? "put" : "post";
    const body = { username: formData.username, name: formData.name, role: formData.role };
    if (formData.password) body.password = formData.password;

    try {
      await axiosAuth[method](url, body);
      await fetchUsers();
      handleCloseModal();
      Swal.fire({
        title: "Berhasil!",
        text: isEditing ? "Data pengguna telah diperbarui." : "Pengguna baru telah ditambahkan.",
        icon: "success", timer: 2000, showConfirmButton: false,
      });
    } catch (err) {
      setModalError(err.response?.data?.message || "Terjadi kesalahan.");
    }
  };

  const handleDeleteUser = (user) => {
    Swal.fire({
      title: "Hapus Pengguna?",
      text: `Apakah Anda yakin ingin menghapus pengguna "${user.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosAuth.delete(`${API_URL}/users/${user.id}`);
          await fetchUsers();
          Swal.fire({
            title: "Dihapus!",
            text: "Pengguna telah dihapus.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        } catch (err) {
          Swal.fire("Error", "Gagal menghapus pengguna.", "error");
        }
      }
    });
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function untuk format waktu last_active
  const formatTimestamp = (timestamp, isOnline) => {
    if (!timestamp) return '-';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (isOnline) {
      // User online - tampilkan terakhir aktif
      if (diffMins < 1) return 'Aktif sekarang';
      if (diffMins < 60) return `${diffMins} menit yang lalu`;
      if (diffHours < 24) return `${diffHours} jam ${diffMins % 60} mnt yang lalu`;
      return `${diffDays} hari ${diffHours % 24} jam yang lalu`;
    } else {
      // User offline - tampilkan last active
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit yang lalu`;
      if (diffHours < 24) return `${diffHours} jam ${diffMins % 60} mnt yang lalu`;
      if (diffDays < 7) return `${diffDays} hari yang lalu`;
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="manage-users-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon users-icon">
            <FaUserPlus />
          </div>
          <div>
            <h1 className="page-title">Kelola Pengguna</h1>
            <p className="page-subtitle">Tambah, edit, atau hapus pengguna sistem</p>
          </div>
        </div>
        <button className="btn-add-user" onClick={() => handleOpenModal()}>
          <FaUserPlus />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama, username, atau role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Users Table */}
      <div className="table-card">
        <div className="table-header">
          <h3>Daftar Pengguna</h3>
          <span className="table-count">{filteredUsers.length} pengguna</span>
        </div>
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Username (NRP)</th>
                <th>Role</th>
                <th>Status</th>
                <th>Jam Online</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <p>Tidak ada pengguna ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isOnline = onlineStatus[user.id] || false;
                  const timestampData = onlineTimestamps[user.id];
                  const lastActive = timestampData?.last_active;
                  
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-small">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <span className="user-name">{user.name}</span>
                        </div>
                      </td>
                      <td className="username-cell">{user.username}</td>
                      <td>
                        <span className={`role-badge-table ${user.role}`}>
                          {user.role === 'admin' ? 'Administrator' : 'Pengguna'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                          <FaCircle className="status-dot" />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td>
                        <div className="status-time">
                          <FaClock className="time-icon" />
                          <span>{formatTimestamp(lastActive, isOnline)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-action btn-edit" onClick={() => handleOpenModal(user)}>
                            <FaEdit />
                          </button>
                          <button className="btn-action btn-delete" onClick={() => handleDeleteUser(user)}>
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <form className="modal-form" onSubmit={handleSubmit}>
              {modalError && (
                <div className="alert alert-error">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{modalError}</span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Username (NRP)</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="18 digit angka"
                    required
                    maxLength="18"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name">Nama Lengkap</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama lengkap"
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="pengguna">Pengguna</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password {isEditing && '(Kosongkan jika tidak ingin mengubah)'}
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={isEditing ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Batal
                </button>
                <button type="submit" className="btn-submit-modal">
                  {isEditing ? 'Perbarui' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsersPage;
