import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
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
import LaporanYardipPage from "./pages/LaporanYardipPage";
import ManageUsersPage from "./pages/ManageUsersPage";
import ViewFilePage from "./pages/ViewFilePage";
import { Toaster } from "react-hot-toast";

// Import Bootstrap CSS first
import "bootstrap/dist/css/bootstrap.min.css";
// Then import our custom design tokens (which includes modal overrides)
import "./styles/design-tokens.css";

// ─────────────────────────────────────────────
// Environment flag — evaluated once at module
// load time. Vite exposes import.meta.env.MODE;
// CRA exposes process.env.NODE_ENV.
// Both resolve to a static string during the
// production build, so tree-shaking removes the
// dead branch entirely.
// ─────────────────────────────────────────────
const IS_DEV =
  typeof import.meta !== "undefined"
    ? import.meta.env?.MODE === "development"   // Vite
    : process.env.NODE_ENV === "development";   // CRA / webpack

// ─────────────────────────────────────────────
// QueryClient — created outside the component
// so it is never re-instantiated on re-renders.
// ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min — data stays "fresh"
      gcTime: 10 * 60 * 1000,         // 10 min — unused cache is purged
      refetchOnWindowFocus: false,     // avoids noisy background refetches
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});

window.__queryClient = queryClient;
// ─────────────────────────────────────────────
// Toast style presets — defined outside JSX so
// the object reference is stable.
// ─────────────────────────────────────────────
const TOAST_OPTIONS = {
  success: { style: { background: "#4CAF50", color: "white" } },
  error:   { style: { background: "#F44336", color: "white" } },
};

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          {/* ── Global toast notifications ── */}
          <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />

          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* All protected routes share MainLayout */}
            <Route
              path="/*"
              element={
                <MainLayout>
                  <Routes>
                    {/* ── Admin + Pengguna ── */}
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

                    {/* ── Admin only ── */}
                    <Route
                      path="/tambah-aset"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <TambahAsetPage />
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
                      path="/edit-aset/:id"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <EditAsetPage />
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
                        <ProtectedRoute roles={["admin", "pengguna"]}>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/manage-users"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <ManageUsersPage />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </MainLayout>
              }
            />
          </Routes>

          {/* ── DevTools: development only ──────────────────────────
              IS_DEV resolves to a static boolean at build time.
              Bundlers (Vite / webpack) dead-code-eliminate the
              false branch in production, so <ReactQueryDevtools />
              is never included in the production bundle at all.
          ────────────────────────────────────────────────────────── */}
          {IS_DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;