import React from "react";
import { Nav } from "react-bootstrap";
import { NavLink } from "react-router-dom";

const Sidebar = ({ show }) => {
  // Prop name is kept as 'show' for clarity

  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? "#ffffff" : "#adb5bd",
    backgroundColor: isActive ? "#4CAF50" : "transparent",
    borderRadius: "5px",
    padding: "10px 15px",
    marginBottom: "5px",
    fontWeight: isActive ? "bold" : "normal",
  });

  // Add 'open' for mobile and toggle 'closed' for desktop
  return (
    <div className={`sidebar ${show ? "open" : "closed"}`}>
      <Nav className="flex-column">
        <h5
          style={{
            color: "#ffffff",
            borderBottom: "1px solid #495057",
            paddingBottom: "10px",
          }}
        >
          Menu
        </h5>
        <NavLink to="/" className="nav-link" style={navLinkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/tambah-aset" className="nav-link" style={navLinkStyle}>
          Tambah Aset
        </NavLink>
        
        <NavLink
          to="/data-aset-tanah"
          className="nav-link"
          style={navLinkStyle}
        >
          Data Aset Tanah
        </NavLink>
        <NavLink to="/settings" className="nav-link" style={navLinkStyle}>
          Pengaturan
        </NavLink>
        {/* Tambahkan link lainnya di sini */}
      </Nav>
    </div>
  );
};

export default Sidebar;
