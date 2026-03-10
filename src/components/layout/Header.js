import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChevronDown,
  faHome,
  faDatabase,
  faPlusCircle,
  faFileAlt,
  faCog,
  faUsers,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import "./Header.css";

const Header = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Dynamic page info based on route
  const getPageInfo = () => {
    const pathname = location.pathname;
    
    const pages = {
      '/': { title: 'Dashboard', icon: faHome},
      '/data-aset-tanah': { title: 'Aset BMN', icon: faDatabase },
      '/data-aset-yardip': { title: 'Aset Yardip', icon: faDatabase},
      '/tambah-aset': { title: 'Aset BMN', icon: faPlusCircle},
      '/tambah-aset-yardip': { title: 'Aset Yardip', icon: faPlusCircle},
      '/laporan': { title: 'Laporan BMN', icon: faFileAlt},
      '/laporan-yardip': { title: 'Laporan Yardip', icon: faFileAlt},
      '/manage-users': { title: 'Kelola Pengguna', icon: faUsers},
      '/settings': { title: 'Pengaturan', icon: faCog},
    };

    // Check for exact match first
    if (pages[pathname]) {
      return pages[pathname];
    }

    // Check for partial matches (for query params, etc.)
    for (const [key, value] of Object.entries(pages)) {
      if (pathname.startsWith(key)) {
        return value;
      }
    }

    // Default
    return { title: 'Dashboard', icon: faHome, subtitle: 'Sistem Informasi Aset Kodam IV/Diponegoro' };
  };

  const pageInfo = getPageInfo();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky-header">
      <div className="header-content">
        {/* Left: Hamburger + Title */}
        <div className="header-left">
          <button
            className="hamburger-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle Menu"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
          <div className="title-section">
            <div className="title-wrapper">
              <FontAwesomeIcon icon={pageInfo.icon} className="page-icon" />
              <h1 className="header-title">{pageInfo.title}</h1>
            </div>
            <p className="header-subtitle">{pageInfo.subtitle}</p>
          </div>
        </div>

        {/* Right: User Dropdown */}
        <div className="header-right">
          <div className="user-dropdown" ref={dropdownRef}>
            <button
              className="user-dropdown-trigger"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="user-avatar">
                {getInitials(user?.name)}
              </div>
              <div className="user-name-display">
                <span className="user-name">{user?.name || "User"}</span>
                <FontAwesomeIcon icon={faChevronDown} className="chevron-icon" />
              </div>
            </button>

            {showDropdown && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="dropdown-avatar">
                    {getInitials(user?.name)}
                  </div>
                  <div className="dropdown-user-info">
                    <span className="dropdown-user-name">{user?.name || "User"}</span>
                    <span className="dropdown-user-role">{user?.role || "Administrator"}</span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10 12.5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5h8a.5.5 0 01.5.5v2a.5.5 0 001 0v-2A1.5 1.5 0 009.5 2h-8A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h8a1.5 1.5 0 001.5-1.5v-2a.5.5 0 00-1 0v2z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 000-.708l-3-3a.5.5 0 00-.708.708L14.293 7.5H5.5a.5.5 0 000 1h8.793l-2.147 2.146a.5.5 0 00.708.708l3-3z" clipRule="evenodd" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
