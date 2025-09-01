import React from "react";
import { Navbar as BootstrapNavbar, Nav, NavDropdown } from "react-bootstrap";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = ({ onToggleSidebar }) => {
  // Accept onToggleSidebar prop
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const logoUrl = "/LOGO KODAM DIPONEGORO.png";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <BootstrapNavbar
      style={{ backgroundColor: "#1B5E20" }}
      variant="dark"
      expand="lg"
      className="px-3 shadow-sm"
    >
      {/* Hamburger Button */}
      <button className="hamburger-button" onClick={onToggleSidebar}>
        &#9776; {/* Hamburger Icon */}
      </button>

      <BootstrapNavbar.Brand href="/" className="d-flex align-items-center">
        <img
          src={logoUrl}
          width="40"
          height="50"
          className="d-inline-block align-top me-2"
          alt="Logo Kodam IV/Diponegoro"
        />
        <span style={{ fontWeight: "bold" }}>Aset Kodam IV/Diponegoro</span>
      </BootstrapNavbar.Brand>
      <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
      <BootstrapNavbar.Collapse id="basic-navbar-nav">
        <Nav className="ms-auto">
          {user && (
            <NavDropdown
              title={`Selamat datang, ${user.name}`}
              id="basic-nav-dropdown"
              align="end"
            >
              <NavDropdown.Item onClick={() => navigate("/settings")}>
                Pengaturan
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
            </NavDropdown>
          )}
        </Nav>
      </BootstrapNavbar.Collapse>
    </BootstrapNavbar>
  );
};

export default Navbar;
