import React from "react";
import { Navbar as BootstrapNavbar, Nav } from "react-bootstrap";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Navbar.css"; // Import CSS file
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons";

const Navbar = ({ onToggleSidebar }) => {
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
      expand={false}
      className="px-3 shadow-sm"
    >
      <div className="d-flex align-items-center w-100">
        {/* Hamburger Button - Paling kiri */}
        <button
          className="btn btn-link text-white p-0 me-3 border-0 hamburger-btn"
          onClick={onToggleSidebar}
        >
          <span style={{ fontSize: "18px" }}>&#9776;</span>
        </button>

        {/* Logo dan Brand Text */}
        <BootstrapNavbar.Brand
          href="/"
          className="d-flex align-items-center flex-grow-1 mb-0"
        >
          <img
            src={logoUrl}
            width="40"
            height="50"
            className="d-inline-block align-top me-2"
            alt="Logo Kodam IV/Diponegoro"
          />
          <span style={{ fontWeight: "bold" }}>Aset Kodam IV/Diponegoro</span>
        </BootstrapNavbar.Brand>

        {/* Menu buttons - Paling kanan */}
        {user && (
          <div className="d-flex align-items-center gap-3">
            {/* User Info */}
            <div className="d-flex flex-column align-items-end d-none d-md-flex user-info">
              <span className="text-white fw-bold user-name">{user.name}</span>
              <span className="text-white-50 user-status">Online</span>
            </div>
            {/* Logout Button */}
            <button
              className="btn btn-danger logout-btn"
              onClick={handleLogout}
              title="Logout"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
              <span className="d-none d-sm-inline">Logout</span>
              <span className="d-sm-none">Logout</span>
            </button>
          </div>
        )}
      </div>
    </BootstrapNavbar>
  );
};

export default Navbar;
