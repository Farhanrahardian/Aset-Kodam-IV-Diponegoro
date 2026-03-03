// src/pages/SettingsPage.jsx
import React, { useState } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { useAuth } from "../auth/AuthContext";
import axiosAuth from "../utils/axiosAuth";

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
      await axiosAuth.put(`${API_URL}/users/${user.id}`, {
        name: user.name,
        role: user.role,
        password: newPassword,
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
    <Container>
      <h2>Pengaturan Akun</h2>
      <Card>
        <Card.Header>Ganti Password</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Password Lama</Form.Label>
              <Form.Control
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password Baru</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Konfirmasi Password Baru</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>
            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SettingsPage;