import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-layout">
      <div className="app-body">
        {/* Sidebar */}
        <Sidebar show={isSidebarOpen} />

        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && window.innerWidth <= 768 && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content with Header inside */}
        <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <Header onToggleSidebar={toggleSidebar} />
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
