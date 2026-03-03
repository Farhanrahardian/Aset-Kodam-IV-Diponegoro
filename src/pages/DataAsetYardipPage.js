import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Table,
  Button,
  Card,
} from "react-bootstrap";
import { FaSearch } from "react-icons/fa";
import axiosAuth from "../utils/axiosAuth";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import PetaAsetYardip from "../components/PetaAsetYardip";
import MapErrorBoundary from "../components/MapErrorBoundary";
import EditYardipModal from "../components/EditYardipModal";
import DetailOffcanvasYardip from "../components/DetailOffcanvasYardip";
import DetailYardipModal from "../components/DetailYardipModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const API_URL = "http://localhost:3001";

// ============= REACT QUERY: FETCH FUNCTIONS =============
const fetchYardipAssets = async () => {
  const { data } = await axiosAuth.get(`${API_URL}/yardip_assets`);
  return data;
};

const fetchProvinsiGeoJSON = async () => {
  const { data } = await axiosAuth.get("/data/provinsi.geojson");
  return data;
};

const fetchKabupatenGeoJSON = async () => {
  const { data } = await axiosAuth.get("/data/kabupaten_kota.geojson");
  return data;
};

// ============= FILTER PANEL - HORIZONTAL TOOLBAR (MINIMALIS) =============
const FilterPanelTop = ({
  provinsiOptions,
  kotaOptions,
  selectedProvinsi,
  selectedKota,
  statusFilter,
  onSelectProvinsi,
  onSelectKota,
  onSelectStatus,
  onShowAll,
  searchQuery,
  onSearchChange,
  totalAssets,
  filteredAssetsCount,
}) => {
  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "Dimiliki/Dikuasai", label: "Dimiliki/Dikuasai" },
    { value: "Tidak Dimiliki/Tidak Dikuasai", label: "Tidak Dimiliki/Tidak Dikuasai" },
    { value: "Lain-lain", label: "Lain-lain" },
  ];

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || "");

  useEffect(() => {
    setLocalSearchQuery(searchQuery || "");
  }, [searchQuery]);

  const handleSearch = () => {
    onSearchChange(localSearchQuery);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    if (value === "") {
      onSearchChange("");
    }
  };

  const hasActiveFilters = selectedProvinsi || selectedKota || statusFilter || searchQuery;

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <Card.Body className="py-2">
        <div className="d-flex align-items-center justify-content-between gap-2">
          {/* Kiri: Filter Dropdowns */}
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: "auto", minWidth: "180px" }}
              value={selectedProvinsi || ""}
              onChange={(e) => onSelectProvinsi(e.target.value || "")}
            >
              <option value="">Semua Provinsi</option>
              {provinsiOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: "auto", minWidth: "180px" }}
              value={selectedKota || ""}
              onChange={(e) => onSelectKota(e.target.value)}
              disabled={!selectedProvinsi}
            >
              <option value="">Semua Kota/Kabupaten</option>
              {selectedProvinsi &&
                kotaOptions.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: "auto", minWidth: "150px" }}
              value={statusFilter || ""}
              onChange={(e) => onSelectStatus(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={onShowAll}
              >
                ✕ Reset
              </button>
            )}
          </div>

          {/* Kanan: Search Bar */}
          <div className="flex-shrink-0" style={{ maxWidth: "350px" }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-0">
                <FaSearch size={14} />
              </span>
              <input
                type="text"
                className="form-control border-0 bg-light"
                placeholder="Cari nama pengelola..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {localSearchQuery && (
                <button
                  className="btn btn-link text-muted px-2 border-0 bg-light"
                  type="button"
                  onClick={() => {
                    setLocalSearchQuery("");
                    onSearchChange("");
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Counter */}
        <div className="mt-2">
          <small className="text-muted">
            <strong>Menampilkan:</strong> {filteredAssetsCount} dari {totalAssets} aset yardip
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

// ============= TABLE COMPONENT =============
const TabelAsetYardip = ({ assets, onEdit, onDelete, onViewDetail, userRole }) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">
          Tidak ada data aset yardip yang cocok dengan filter Anda.
        </p>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Dimiliki/Dikuasai":
        return "bg-success";
      case "Tidak Dimiliki/Tidak Dikuasai":
        return "bg-danger";
      default:
        return "bg-info";
    }
  };

  return (
    <div style={{ width: "100%", minWidth: "1200px" }}>
      <Table striped bordered hover style={{ marginBottom: 0 }}>
        <thead
          className="table-dark"
          style={{ position: "sticky", top: 0, zIndex: 10 }}
        >
          <tr>
            <th>Pengelola</th>
            <th>Bidang</th>
            <th>Provinsi</th>
            <th>Kota/Kab.</th>
            <th>Status</th>
            <th>Luas</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.pengelola || "-"}</td>
              <td>{asset.bidang || "-"}</td>
              <td>{asset.provinsi || "-"}</td>
              <td>{asset.kabkota || "-"}</td>
              <td>
                <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                  {asset.status || "-"}
                </span>
              </td>
              <td>
                {asset.area
                  ? `${Number(asset.area).toLocaleString("id-ID")} m²`
                  : "-"}
              </td>
              <td>
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => onViewDetail(asset)}
                  className="me-1"
                >
                  Detail
                </Button>
                {userRole === "admin" && onEdit && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => onEdit(asset)}
                    className="me-1"
                  >
                    Edit
                  </Button>
                )}
                {userRole === "admin" && onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(asset.id)}
                  >
                    Hapus
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

// ============= MAIN COMPONENT =============
const DataAsetYardipPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ============= REACT QUERY: FETCH DATA WITH CACHING =============
  const {
    data: assets = [],
    isLoading: assetsLoading,
    error: assetsError,
  } = useQuery({
    queryKey: ["yardip_assets"],
    queryFn: fetchYardipAssets,
    staleTime: 5 * 60 * 1000, // cache 5 menit
  });

  const { data: provinsiData, isLoading: provinsiLoading } = useQuery({
    queryKey: ["provinsiGeoJSON"],
    queryFn: fetchProvinsiGeoJSON,
    staleTime: 30 * 60 * 1000, // cache 30 menit (data statis)
  });

  const { data: kabupatenData, isLoading: kabupatenLoading } = useQuery({
    queryKey: ["kabupatenGeoJSON"],
    queryFn: fetchKabupatenGeoJSON,
    staleTime: 30 * 60 * 1000, // cache 30 menit (data statis)
  });

  // ============= LOCAL UI STATE =============
  const [view, setView] = useState({ provinsi: "", kabupaten: "" });
  const [statusFilter, setStatusFilter] = useState("");       // ← tambahan teman
  const [searchQuery, setSearchQuery] = useState("");         // ← tambahan teman
  const [editingAsset, setEditingAsset] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assetForOffcanvas, setAssetForOffcanvas] = useState(null);
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  // ============= DERIVED LOADING/ERROR STATE =============
  const loading = assetsLoading || provinsiLoading || kabupatenLoading;
  const error = assetsError ? "Gagal memuat data aset yardip." : null;

  // ============= MEMOIZED COMPUTED VALUES =============
  const provinsiOptions = useMemo(
    () => [
      { value: "Jawa Tengah", label: "Jawa Tengah" },
      { value: "Daerah Istimewa Yogyakarta", label: "Daerah Istimewa Yogyakarta" },
    ],
    []
  );

  const isConservationArea = (kabupatenName) =>
    kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";

  const kotaOptions = useMemo(() => {
    if (!view.provinsi || !kabupatenData) return [];
    const kotaInProvinsi = kabupatenData.features
      .filter(
        (f) =>
          f.properties.PROVINCE === view.provinsi &&
          !isConservationArea(f.properties.Kabupaten)
      )
      .map((f) => f.properties.Kabupaten);
    const uniqueKota = new Set(kotaInProvinsi);
    return Array.from(uniqueKota)
      .map((k) => ({ value: k, label: k }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [kabupatenData, view.provinsi]);

  // ← filter diperluas oleh teman: + statusMatch & searchMatch
  const filteredTableAssets = useMemo(() => {
    return assets.filter((asset) => {
      const provMatch = !view.provinsi || asset.provinsi === view.provinsi;
      const kabMatch = !view.kabupaten || asset.kabkota === view.kabupaten;
      const statusMatch = !statusFilter || asset.status === statusFilter;
      const searchMatch =
        !searchQuery ||
        (asset.pengelola &&
          asset.pengelola.toLowerCase().includes(searchQuery.toLowerCase()));
      return provMatch && kabMatch && statusMatch && searchMatch;
    });
  }, [assets, view, statusFilter, searchQuery]);

  // ============= EVENT HANDLERS (semua dibungkus useCallback) =============
  const handleSelectProvinsi = useCallback((prov) => {
    setView({ provinsi: prov, kabupaten: "" });
  }, []);

  const handleSelectKota = useCallback((kab) => {
    setView((prev) => ({ ...prev, kabupaten: kab }));
  }, []);

  // ← reset diperluas oleh teman: + clear statusFilter & searchQuery
  const handleShowAll = useCallback(() => {
    setView({ provinsi: "", kabupaten: "" });
    setStatusFilter("");
    setSearchQuery("");
  }, []);

  const handleMapViewChange = useCallback((newView) => {
    setView((prev) => {
      const nextProvinsi = newView.provinsi || "";
      const nextKabupaten = newView.kabupaten || "";
      if (prev.provinsi === nextProvinsi && prev.kabupaten === nextKabupaten) {
        return prev;
      }
      return { provinsi: nextProvinsi, kabupaten: nextKabupaten };
    });
  }, []);

  const handleViewDetail = useCallback((asset) => {
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  }, []);

  const handleMarkerClick = useCallback((asset) => {
    setAssetForOffcanvas(asset);
    setShowOffcanvas(true);
  }, []);

  const handleEditAsset = useCallback((asset) => {
    setEditingAsset(asset);
    setShowEditModal(true);
  }, []);

  const handleDeleteAsset = async (id) => {
    const assetToDelete = assets.find((a) => String(a.id) === String(id));
    if (!assetToDelete) return;

    const result = await Swal.fire({
      title: "Hapus Aset Yardip?",
      html: `Yakin ingin menghapus: <strong>"${assetToDelete.pengelola}"</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus!",
    });

    if (result.isConfirmed) {
      const toastId = toast.loading("Menghapus aset...");
      try {
        await axiosAuth.delete(`${API_URL}/yardip_assets/${id}`);
        queryClient.invalidateQueries(["yardip_assets"]);
        toast.success("Aset berhasil dihapus!", { id: toastId });
      } catch (err) {
        toast.error("Gagal menghapus aset.", { id: toastId });
      }
    }
  };

  const handleSaveYardip = async (formData, buktiPemilikanFile, filesToDelete) => {
    const toastId = toast.loading("Menyimpan perubahan...");

    let buktiPemilikanUrl = formData.bukti_pemilikan_url || "";
    let buktiPemilikanFilename = formData.bukti_pemilikan_filename || "";

    try {
      if (filesToDelete?.buktiPemilikan) {
        const filename = filesToDelete.buktiPemilikan.split("/").pop();
        if (filename) {
          try {
            await axiosAuth.delete(`${API_URL}/upload/bukti-pemilikan/${filename}`);
            console.log("✅ Old file deleted:", filename);
          } catch (err) {
            console.warn("⚠️ Failed to delete old file:", filename);
          }
        }
      }

      if (buktiPemilikanFile) {
        try {
          toast.loading("Mengupload bukti pemilikan baru...", { id: toastId });
          const fileFormData = new FormData();
          fileFormData.append("bukti_pemilikan", buktiPemilikanFile);
          const uploadRes = await axiosAuth.post(
            `${API_URL}/upload/bukti-pemilikan`,
            fileFormData
          );
          buktiPemilikanUrl = uploadRes.data.url;
          buktiPemilikanFilename = uploadRes.data.filename;
        } catch (err) {
          toast.error("Gagal mengupload bukti pemilikan baru.", { id: toastId });
          console.error("File upload error:", err);
          return;
        }
      }

      const updatedData = {
        ...formData,
        bukti_pemilikan_url: buktiPemilikanUrl,
        bukti_pemilikan_filename: buktiPemilikanFilename,
      };

      await axiosAuth.put(`${API_URL}/yardip_assets/${formData.id}`, updatedData);
      toast.success("Aset Yardip berhasil diperbarui!", { id: toastId });

      const refreshedAsset = await axiosAuth.get(`${API_URL}/yardip_assets/${formData.id}`);
      setEditingAsset(refreshedAsset.data);

      queryClient.invalidateQueries(["yardip_assets"]);
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error("Error updating yardip asset:", err);
    }
  };

  // ============= RENDER =============
  if (loading) {
    return (
      <Container fluid className="mt-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Memuat data aset yardip...</p>
        </div>
      </Container>
    );
  }

  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Yardip</h3>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Body style={{ height: "55vh", padding: 0 }}>
              <MapErrorBoundary height="55vh">
                <PetaAsetYardip
                  provinsiData={provinsiData}
                  kabupatenData={kabupatenData}
                  assets={filteredTableAssets}
                  onAssetClick={handleMarkerClick}
                  filter={view}
                  onViewChange={handleMapViewChange}
                />
              </MapErrorBoundary>
            </Card.Body>
          </Card>

          <FilterPanelTop
            provinsiOptions={provinsiOptions}
            kotaOptions={kotaOptions}
            selectedProvinsi={view.provinsi}
            selectedKota={view.kabupaten}
            statusFilter={statusFilter}
            searchQuery={searchQuery}
            onSelectProvinsi={handleSelectProvinsi}
            onSelectKota={handleSelectKota}
            onSelectStatus={setStatusFilter}
            onSearchChange={setSearchQuery}
            onShowAll={handleShowAll}
            totalAssets={assets.length}
            filteredAssetsCount={filteredTableAssets.length}
          />

          <Card>
            <Card.Body>
              <div style={{ maxHeight: "60vh", overflowY: "auto", overflowX: "auto" }}>
                <TabelAsetYardip
                  assets={filteredTableAssets}
                  onEdit={user ? handleEditAsset : null}
                  onDelete={user ? handleDeleteAsset : null}
                  onViewDetail={handleViewDetail}
                  userRole={user?.role}
                />
              </div>
            </Card.Body>
          </Card>

          {filteredTableAssets.length > 0 && (
            <Card className="mt-3">
              <Card.Body>
                <Row className="text-center">
                  <Col md={4}>
                    <div className="border-end">
                      <h5 className="text-primary">{filteredTableAssets.length}</h5>
                      <small className="text-muted">Total Aset</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="border-end">
                      <h5 className="text-success">
                        {filteredTableAssets.filter((a) => a.status === "Dimiliki/Dikuasai").length}
                      </h5>
                      <small className="text-muted">Dimiliki/Dikuasai</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <h5 className="text-danger">
                      {filteredTableAssets.filter((a) => a.status === "Tidak Dimiliki/Tidak Dikuasai").length}
                    </h5>
                    <small className="text-muted">Tidak Dimiliki/Tidak Dikuasai</small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <DetailOffcanvasYardip
        show={showOffcanvas}
        handleClose={() => setShowOffcanvas(false)}
        asetYardip={assetForOffcanvas}
      />

      {showDetailModal && (
        <DetailYardipModal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          asset={selectedAssetDetail}
        />
      )}

      {showEditModal && (
        <EditYardipModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          asset={editingAsset}
          onSave={handleSaveYardip}
          provinsiData={provinsiData}
          kabupatenData={kabupatenData}
        />
      )}
    </Container>
  );
};

export default DataAsetYardipPage;