import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import DataAsetTanahPage from "./pages/DataAsetTanahPage";
import TambahAsetPage from "./pages/TambahAsetPage";
import TambahAsetYardipPage from "./pages/TambahAsetYardipPage";
import DataAsetYardipPage from "./pages/DataAsetYardipPage";
import EditAsetPage from "./pages/EditAsetPage";
import LaporanPage from "./pages/LaporanPage"; // ✅ import halaman laporan
import { Toaster } from "react-hot-toast";

// CSS global
import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-center"
          toastOptions={{
            success: {
              style: {
                background: "#4CAF50",
                color: "white",
              },
            },
            error: {
              style: {
                background: "#F44336",
                color: "white",
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
                    <Route
                      path="/data-aset-tanah"
                      element={<DataAsetTanahPage />}
                    />
                    <Route
                      path="/data-aset-yardip"
                      element={<DataAsetYardipPage />}
                    />
                    <Route path="/tambah-aset" element={<TambahAsetPage />} />
                    <Route path="/edit-aset/:id" element={<EditAsetPage />} />
                    <Route
                      path="/tambah-aset-yardip"
                      element={<TambahAsetYardipPage />}
                    />
                    <Route path="/laporan" element={<LaporanPage />} />{" "}
                    {/* ✅ route baru */}
                    <Route path="/settings" element={<SettingsPage />} />
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
