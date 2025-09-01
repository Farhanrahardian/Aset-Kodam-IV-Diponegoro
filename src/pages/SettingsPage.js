
import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../auth/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Password baru tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
        setError('Password baru minimal harus 6 karakter.');
        return;
    }

    // **Simulasi Ganti Password**
    // Di aplikasi nyata, di sini akan ada panggilan API ke backend.
    console.log(`Simulasi: User ${user.username} mengganti password.`);
    console.log(`Password lama: ${oldPassword}`);
    console.log(`Password baru: ${newPassword}`);
    
    setMessage('Password berhasil diperbarui (simulasi).');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password Baru</Form.Label>
              <Form.Control 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Konfirmasi Password Baru</Form.Label>
              <Form.Control 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Form.Group>
            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            <Button variant="primary" type="submit">Simpan Perubahan</Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SettingsPage;
