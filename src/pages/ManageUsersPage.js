
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { FaUserPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import Swal from 'sweetalert2';

import './Dashboard.css'; // Reusing some styles

const ManageUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'pengguna',
  });
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users');
      if (!response.ok) {
        throw new Error('Gagal mengambil data pengguna');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      setError(error.message);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (user = null) => {
    setError('');
    setModalError('');
    if (user) {
      setIsEditing(true);
      setCurrentUser(user);
      setFormData({
        username: user.username,
        password: '', // Password should not be shown
        name: user.name,
        role: user.role,
      });
    } else {
      setIsEditing(false);
      setCurrentUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'pengguna',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentUser(null);
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    // Frontend Validation
    if (formData.username.length !== 18 || !/^\d+$/.test(formData.username)) {
      setModalError('NRP (Username) harus berupa 18 digit angka.');
      return;
    }

    // Password validation only if it's a new user or if the password is being changed
    if (!isEditing || (isEditing && formData.password)) {
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        setModalError('Password minimal 8 karakter dan harus mengandung huruf dan angka.');
        return;
      }
    }

    if (!isEditing && !formData.password) {
        setModalError('Password wajib diisi untuk pengguna baru.');
        return;
    }

    const url = isEditing
      ? `http://localhost:3001/api/users/${currentUser.id}`
      : 'http://localhost:3001/api/users';
    
    const method = isEditing ? 'PUT' : 'POST';

    const body = {
        username: formData.username,
        name: formData.name,
        role: formData.role,
    };

    // Only include password if it's being set or changed
    if (formData.password) {
        body.password = formData.password;
    }
     // For new users, password is required
    if (!isEditing) {
        body.password = formData.password;
    }


    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan data');
      }

      await fetchUsers();
      handleCloseModal();

      Swal.fire({
        title: 'Berhasil!',
        text: isEditing ? 'Data pengguna telah diperbarui.' : 'Pengguna baru telah ditambahkan.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      setModalError(error.message);
    }
  };

  const handleDelete = async (userId) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Pengguna yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            throw new Error('Gagal menghapus pengguna');
          }
          Swal.fire('Dihapus!', 'Pengguna telah berhasil dihapus.', 'success');
          await fetchUsers();
        } catch (error) {
          setError(error.message);
          Swal.fire('Gagal!', error.message, 'error');
        }
      }
    });
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Kelola Pengguna</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
              <div className="action-bar" style={{ marginBottom: '20px' }}>
                <Button variant="primary" onClick={() => handleOpenModal()}>
                  <FaUserPlus className="me-2" />
                  Tambah Pengguna Baru
                </Button>
              </div>        <div style={{ maxHeight: "70vh", overflow: "auto" }}>
          <table className="table table-striped table-bordered table-hover mb-0">
            <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                <th>NRP (Username)</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="warning" size="sm" onClick={() => handleOpenModal(user)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(user.id)}>
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form id="user-form" onSubmit={handleSubmit}>
            {modalError && <p className="text-danger">{modalError}</p>}
            <div className="form-group mb-3">
              <label>NRP (Username)</label>
              <input
                type="text"
                name="username"
                className="form-control"
                value={formData.username}
                onChange={handleInputChange}
                required
                disabled={isEditing} // NRP tidak bisa diubah
              />
            </div>
            <div className="form-group mb-3">
              <label>Nama</label>
              <input
                type="text"
                name="name"
                className="form-control"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group mb-3">
              <label>Password</label>
              <div className="position-relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-control pe-5" // Add padding to prevent text from overlapping with icon
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={isEditing ? 'Kosongkan jika tidak ingin mengubah' : ''}
                />
                <span 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="d-flex align-items-center"
                  style={{ 
                    position: 'absolute', 
                    right: '10px', 
                    top: '0',
                    bottom: '0',
                    cursor: 'pointer',
                    height: '100%'
                  }}
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </span>
              </div>
            </div>
            <div className="form-group mb-3">
              <label>Role</label>
              <select name="role" className="form-select" value={formData.role} onChange={handleInputChange} required>
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
