import React, { useState, useEffect, useCallback } from "react";
import { Button, Modal } from "react-bootstrap";
import { FaUserPlus, FaEye, FaEyeSlash, FaCircle } from "react-icons/fa";
import Swal from "sweetalert2";
import axiosAuth from "../utils/axiosAuth";
import "./Dashboard.css";

const API_URL = "http://localhost:3001";

const ManageUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "", password: "", name: "", role: "pengguna",
  });
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ✅ axiosAuth — tidak pakai response.ok
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axiosAuth.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      setError("Gagal mengambil data pengguna");
    }
  }, []);

  // ✅ axiosAuth — bukan fetch biasa
  const fetchOnlineStatus = useCallback(async () => {
    try {
      const response = await axiosAuth.get(`${API_URL}/users/online-status`);
      const statusMap = {};
      response.data.forEach((u) => { statusMap[u.id] = u.is_online; });
      setOnlineStatus(statusMap);
    } catch (_) {}
  }, []);

useEffect(() => {
  fetchUsers();
  const interval = setInterval(fetchUsers, 5000);
  return () => clearInterval(interval);
}, [fetchUsers]);

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

  // ✅ axiosAuth — bukan fetch biasa
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
    } catch (error) {
      setModalError(error.response?.data?.message || "Gagal menyimpan data");
    }
  };

  // ✅ axiosAuth — bukan fetch biasa
  const handleDelete = async (userId) => {
    Swal.fire({
      title: "Apakah Anda yakin?", text: "Pengguna yang dihapus tidak dapat dikembalikan!",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6", confirmButtonText: "Ya, hapus!", cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosAuth.delete(`${API_URL}/users/${userId}`);
          Swal.fire("Dihapus!", "Pengguna telah berhasil dihapus.", "success");
          await fetchUsers();
        } catch (error) {
          Swal.fire("Gagal!", error.response?.data?.message || "Gagal menghapus", "error");
        }
      }
    });
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Kelola Pengguna</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div className="action-bar" style={{ marginBottom: "20px" }}>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <FaUserPlus className="me-2" />Tambah Pengguna Baru
        </Button>
      </div>
      <div style={{ maxHeight: "70vh", overflow: "auto" }}>
        <table className="table table-striped table-bordered table-hover mb-0">
          <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>NRP (Username)</th>
              <th>Nama</th>
              <th>Role</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isOnline = user.is_online === 1;
              return (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <FaCircle size={10} color={isOnline ? "#28a745" : "#adb5bd"} />
                     <span style={{ fontSize: "0.85rem", color: isOnline ? "#28a745" : "#adb5bd" }}>
  {isOnline ? "Online" : "Offline"}
</span>
<br/>
<span style={{ fontSize: "0.75rem", color: "#888" }}>
  {user.last_active
    ? new Date(user.last_active).toLocaleString("id-ID", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })
    : "Belum pernah login"}
</span>
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="warning" size="sm" onClick={() => handleOpenModal(user)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(user.id)}>Hapus</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? "Edit Pengguna" : "Tambah Pengguna Baru"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form id="user-form" onSubmit={handleSubmit}>
            {modalError && <p className="text-danger">{modalError}</p>}
            <div className="form-group mb-3">
              <label>NRP (Username)</label>
              <input type="text" name="username" className="form-control"
                value={formData.username} onChange={handleInputChange} required disabled={isEditing} />
            </div>
            <div className="form-group mb-3">
              <label>Nama</label>
              <input type="text" name="name" className="form-control"
                value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="form-group mb-3">
              <label>Password</label>
              <div className="position-relative">
                <input type={showPassword ? "text" : "password"} name="password"
                  className="form-control pe-5" value={formData.password}
                  onChange={handleInputChange}
                  placeholder={isEditing ? "Kosongkan jika tidak ingin mengubah" : ""} />
                <span onClick={() => setShowPassword(!showPassword)}
                  className="d-flex align-items-center"
                  style={{ position: "absolute", right: "10px", top: "0", bottom: "0", cursor: "pointer", height: "100%" }}>
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </span>
              </div>
            </div>
            <div className="form-group mb-3">
              <label>Role</label>
              <select name="role" className="form-select" value={formData.role}
                onChange={handleInputChange} required>
                <option value="pengguna">Pengguna</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Batal</Button>
          <Button variant="primary" type="submit" form="user-form">Simpan</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManageUsersPage;