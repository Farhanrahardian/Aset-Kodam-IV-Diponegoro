
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import DataAsetTanahPage from './pages/DataAsetTanahPage';
import TambahAsetPage from './pages/TambahAsetPage';
import { Toaster } from 'react-hot-toast';

// CSS global
import 'bootstrap/dist/css/bootstrap.min.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster 
                    position="top-center"
          toastOptions={{
            success: {
              style: {
                background: '#4CAF50',
                color: 'white',
              },
            },
            error: {
              style: {
                background: '#F44336',
                color: 'white',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/data-aset-tanah" element={<DataAsetTanahPage />} />
                    <Route path="/tambah-aset" element={<TambahAsetPage />} />
                    
                    <Route path="/settings" element={<SettingsPage />} />
                    {/* Rute lain di dalam layout utama bisa ditambahkan di sini */}
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
