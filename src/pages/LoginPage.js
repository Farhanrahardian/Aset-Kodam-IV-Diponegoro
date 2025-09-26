import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  Form,
  Button,
  Container,
  Row,
  Col,
  Alert,
} from "react-bootstrap";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loggedIn = await auth.login(username, password);
      if (loggedIn) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Gagal untuk login.");
    }
  };

  const backgroundStyle = {
    minHeight: "100vh",
    backgroundImage: "url(/uploads/login.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
  };

  const overlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Optional: overlay gelap untuk kontras yang lebih baik
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <Container fluid className="p-0" style={backgroundStyle}>
      <div style={overlayStyle}>
        <Row>
          <Col>
            <Card
              style={{
                width: "24rem",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
              }}
            >
              <Card.Body className="p-4">
                <h3 className="text-center mb-4">Login</h3>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Form.Group>

                  {error && <Alert variant="danger">{error}</Alert>}

                  <div className="d-grid">
                    <Button variant="primary" type="submit">
                      Login
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default LoginPage;
