
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect mereka ke halaman /login, tapi simpan lokasi yang mereka coba akses
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Jika route memerlukan role tertentu dan role user tidak termasuk di dalamnya
  if (roles && !roles.includes(user.role)) {
    // Redirect ke halaman utama karena tidak punya hak akses
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
