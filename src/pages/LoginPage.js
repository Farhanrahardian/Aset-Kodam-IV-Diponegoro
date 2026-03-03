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
  Spinner,
} from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa";

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

  const backgroundStyle = {
    height: "100vh",
    width: "100vw",
    backgroundImage: "url(/uploads/login.png)",
    backgroundSize: "100% 100%",
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const inputStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    color: "white",
  };

  return (
    <Container fluid className="p-0" style={backgroundStyle}>
      <div style={overlayStyle}>
        <Row>
          <Col>
            <Card
              style={{
                width: "24rem",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <Card.Body className="p-4">
                <h3
                  className="text-center mb-4"
                  style={{ color: "rgba(255, 255, 255, 0.7)" }}
                >
                  Login
                </h3>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="formUsername">
                    <Form.Label style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                      Username (NRP)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Masukkan NRP"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                      style={inputStyle}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formPassword">
                    <Form.Label style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                      Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        style={{ ...inputStyle, paddingRight: "2.5rem" }}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          cursor: "pointer",
                          color: "rgba(255,255,255,0.7)",
                          zIndex: 10,
                        }}
                      >
                        {showPassword ? <FaEye /> : <FaEyeSlash />}
                      </span>
                    </div>
                  </Form.Group>

                  {error && <Alert variant="danger">{error}</Alert>}

                  <div className="d-grid">
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            className="me-2"
                          />
                          Masuk...
                        </>
                      ) : (
                        "Login"
                      )}
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