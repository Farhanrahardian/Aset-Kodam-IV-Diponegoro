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
import LaporanPage from "./pages/LaporanPage";
import LaporanYardipPage from "./pages/LaporanYardipPage"; // ✅ import halaman laporan yardip
import ViewFilePage from "./pages/ViewFilePage";
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
              <MainLayout>
                <Routes>
                  {/* Rute untuk Admin dan Pengguna */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute roles={["admin", "pengguna"]}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/data-aset-tanah"
                    element={
                      <ProtectedRoute roles={["admin", "pengguna"]}>
                        <DataAsetTanahPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/data-aset-yardip"
                    element={
                      <ProtectedRoute roles={["admin", "pengguna"]}>
                        <DataAsetYardipPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rute khusus Admin */}
                  <Route
                    path="/tambah-aset"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <TambahAsetPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-aset/:id"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <EditAsetPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tambah-aset-yardip"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <TambahAsetYardipPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/laporan"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <LaporanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/laporan-yardip"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <LaporanYardipPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/view-file/*"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <ViewFilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </MainLayout>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
