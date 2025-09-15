import React from "react";
import { Nav } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import "./Sidebar.css"; // tambahkan CSS eksternal biar hover bisa jalan

const Sidebar = ({ show }) => {
  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? "#ffffff" : "#adb5bd",
    backgroundColor: isActive ? "#4CAF50" : "transparent",
    borderRadius: "5px",
    padding: "10px 15px",
    marginBottom: "5px",
    fontWeight: isActive ? "bold" : "normal",
    transition: "all 0.3s ease", // animasi halus
  });

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
          to="/tambah-aset-yardip"
          className="nav-link"
          style={navLinkStyle}
        >
          Tambah Aset Yardip
        </NavLink>
        <NavLink
          to="/data-aset-tanah"
          className="nav-link"
          style={navLinkStyle}
        >
          Data Aset Tanah
        </NavLink>
        <NavLink
          to="/data-aset-yardip"
          className="nav-link"
          style={navLinkStyle}
        >
          Data Aset Yardip
        </NavLink>
        <NavLink to="/laporan" className="nav-link" style={navLinkStyle}>
          Cetak Laporan Aset Tanah
        </NavLink>
        {/* Tambahan menu baru */}
        <NavLink to="/laporan-yardip" className="nav-link" style={navLinkStyle}>
          Cetak Laporan Aset Yardip
        </NavLink>
        <NavLink to="/settings" className="nav-link" style={navLinkStyle}>
          Pengaturan
        </NavLink>
      </Nav>
    </div>
  );
};

export default Sidebar;
