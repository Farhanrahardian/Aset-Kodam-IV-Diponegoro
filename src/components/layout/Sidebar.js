import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faPlusCircle,
  faDatabase,
  faFileAlt,
  faCog,
  faUsers,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import "./Sidebar.css";

const Sidebar = ({ show }) => {
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({
    aset: false,
    tambah: false,
    laporan: false,
    admin: false,
  });

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const menuGroups = [
    {
      key: "main",
      items: [
        {
          path: "/",
          icon: faHome,
          label: "Dashboard",
        },
      ],
    },
    {
      key: "aset",
      title: "Data Aset",
      icon: faDatabase,
      items: [
        {
          path: "/data-aset-tanah",
          label: "Aset BMN",
        },
        {
          path: "/data-aset-yardip",
          label: "Aset Yardip",
        },
      ],
    },
    ...(user?.role === "admin"
      ? [
          {
            key: "tambah",
            title: "Tambah Data",
            icon: faPlusCircle,
            items: [
              {
                path: "/tambah-aset",
                label: "Aset BMN",
              },
              {
                path: "/tambah-aset-yardip",
                label: "Aset Yardip",
              },
            ],
          },
          {
            key: "laporan",
            title: "Laporan",
            icon: faFileAlt,
            items: [
              {
                path: "/laporan",
                label: "Laporan BMN",
              },
              {
                path: "/laporan-yardip",
                label: "Laporan Yardip",
              },
            ],
          },
          {
            key: "manage-users",
            items: [
              {
                path: "/manage-users",
                icon: faUsers,
                label: "Kelola Pengguna",
              },
            ],
          },
        ]
      : []),
    {
      key: "settings",
      items: [
        {
          path: "/settings",
          icon: faCog,
          label: "Pengaturan Akun",
        },
      ],
    },
  ];

  const renderMenuItem = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? "active" : ""}`
      }
    >
      {item.icon && (
        <FontAwesomeIcon icon={item.icon} className="link-icon" />
      )}
      <span className="link-label">{item.label}</span>
    </NavLink>
  );

  const renderMenuGroup = (group) => {
    if (!group.title) {
      return group.items.map((item) => renderMenuItem(item));
    }

    const isExpanded = expandedMenus[group.key];

    return (
      <div key={group.key} className="menu-group">
        <button
          className="menu-group-header"
          onClick={() => toggleMenu(group.key)}
        >
          <div className="group-header-content">
            {group.icon && (
              <FontAwesomeIcon icon={group.icon} className="group-icon" />
            )}
            <span className="group-title">{group.title}</span>
          </div>
          <FontAwesomeIcon
            icon={isExpanded ? faChevronDown : faChevronRight}
            className="chevron-icon"
          />
        </button>
        {isExpanded && (
          <div className="submenu">
            {group.items.map((item) => renderMenuItem(item))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`sidebar ${show ? "open" : "closed"}`}>
      <div className="sidebar-content">
        {/* Logo Section */}
        <div className="sidebar-logo">
          <img src="/logo-kodam-diponegoro.png" alt="Logo" className="logo-image" />
          <span className="logo-text">Aset Kodam</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuGroups.map((group) => renderMenuGroup(group))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
