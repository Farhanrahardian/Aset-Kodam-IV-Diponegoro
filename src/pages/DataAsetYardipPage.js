import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Table,
  Button,
  Modal,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import FormYardip from "../components/FormYardip"; // Updated form import
import PetaAsetYardip from "../components/PetaAsetYardip"; // Updated map import
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// Table component for yardip assets
const TabelAsetYardip = ({ assets, onEdit, onDelete, onViewDetail }) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Tidak ada data aset yardip yang ditemukan.</p>
      </div>
    );
  }

  return (
    <Table striped bordered hover responsive>
      <thead className="table-dark">
        <tr>
          <th style={{ width: "20%" }}>Pengelola</th>
          <th style={{ width: "15%" }}>Bidang</th>
          <th style={{ width: "25%" }}>Lokasi</th>
          <th style={{ width: "15%" }}>Status</th>
          <th style={{ width: "25%" }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.pengelola || "-"}</td>
            <td>
              <span className="badge bg-info">{asset.bidang || "-"}</span>
            </td>
            <td>
              <div>
                <strong>{asset.kabkota || "-"}</strong>
                <br />
                <small className="text-muted">
                  {asset.kecamatan || "-"}, {asset.kelurahan || "-"}
                </small>
              </div>
            </td>
            <td>
              <span
                className={`badge ${
                  asset.status === "Dimiliki/Dikuasai"
                    ? "bg-success"
                    : asset.status === "Tidak Dimiliki/Tidak Dikuasai"
                    ? "bg-danger"
                    : asset.status === "Lain-lain"
                    ? "bg-warning"
                    : asset.status === "Dalam Proses"
                    ? "bg-info"
                    : "bg-secondary"
                }`}
              >
                {asset.status || "-"}
              </span>
            </td>
            <td>
              <div className="d-flex gap-1">
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => onViewDetail(asset)}
                  title="Lihat Detail"
                >
                  Detail
                </Button>
                {onEdit && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => onEdit(asset)}
                    title="Edit Aset"
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(asset.id)}
                    title="Hapus Aset"
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

// Enhanced Modal Detail Component with Map for yardip
const DetailModalYardip = ({ asset, show, onHide }) => {
  if (!asset) return null;

  console.log("yardip Asset data in modal:", asset);
  console.log("yardip Asset lokasi:", asset.lokasi);

  // Validasi dan sanitasi data lokasi untuk yardip
  const validateLocationData = (asset) => {
    if (!asset.lokasi) {
      console.log("No lokasi data found");
      return null;
    }

    let lokasi = asset.lokasi;

    // Jika lokasi adalah string, coba parse JSON
    if (typeof lokasi === "string") {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        console.error("Failed to parse location JSON:", e);
        return null;
      }
    }

    // Handle jika lokasi berupa array koordinat langsung (format yardip)
    if (Array.isArray(lokasi) && lokasi.length > 0) {
      // Check if it's nested array [[coords]]
      if (Array.isArray(lokasi[0])) {
        return lokasi;
      }
    }

    // Handle jika lokasi sudah berupa geometry object
    if (lokasi.type === "Polygon" && lokasi.coordinates) {
      return lokasi.coordinates;
    }

    // Handle jika dalam format geometry wrapper
    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }

    console.warn("Unrecognized location format:", lokasi);
    return null;
  };

  const validatedLocation = validateLocationData(asset);
  const hasValidLocation = validatedLocation !== null;

  // Prepare asset data untuk PetaAset component
  const prepareAssetForMap = (asset) => {
    if (!hasValidLocation) return null;

    return {
      id: asset.id || `temp-${Date.now()}`,
      nama: asset.pengelola || "Unknown", // Map pengelola ke nama
      kodim: asset.bidang || "", // Map bidang ke kodim
      lokasi: validatedLocation, // Koordinat langsung
      luas: Number(asset.area) || 0, // Map area ke luas
      status: asset.status || "",
      kabkota: asset.kabkota || "",
      kecamatan: asset.kecamatan || "",
      kelurahan: asset.kelurahan || "",
      keterangan: asset.keterangan || "",
      type: "yardip", // Mark as yardip asset
    };
  };

  const assetForMap = prepareAssetForMap(asset);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Detail Aset yardip - {asset.pengelola || "Unknown"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          {/* Detail Informasi */}
          <Col md={6}>
            <div className="card h-100">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Informasi Aset Yardip</h5>
              </div>
              <div className="card-body">
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <td>
                        <strong>ID:</strong>
                      </td>
                      <td>{asset.id || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Pengelola:</strong>
                      </td>
                      <td>{asset.pengelola || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Bidang:</strong>
                      </td>
                      <td>
                        <span className="badge bg-info">
                          {asset.bidang || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kabupaten/Kota:</strong>
                      </td>
                      <td>{asset.kabkota || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kecamatan:</strong>
                      </td>
                      <td>{asset.kecamatan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kelurahan/Desa:</strong>
                      </td>
                      <td>{asset.kelurahan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Peruntukan:</strong>
                      </td>
                      <td>{asset.peruntukan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Status:</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            asset.status === "Dimiliki/Dikuasai"
                              ? "bg-success"
                              : asset.status === "Tidak Dimiliki/Tidak Dikuasai"
                              ? "bg-danger"
                              : asset.status === "Lain-lain"
                              ? "bg-warning"
                              : asset.status === "Dalam Proses"
                              ? "bg-info"
                              : "bg-secondary"
                          }`}
                        >
                          {asset.status || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Keterangan:</strong>
                      </td>
                      <td>{asset.keterangan || "-"}</td>
                    </tr>
                    {asset.area && (
                      <tr>
                        <td>
                          <strong>Luas Area:</strong>
                        </td>
                        <td>{Number(asset.area).toFixed(2)} m²</td>
                      </tr>
                    )}
                    <tr>
                      <td>
                        <strong>Koordinat:</strong>
                      </td>
                      <td>
                        {hasValidLocation && validatedLocation ? (
                          <div>
                            <small className="text-muted">
                              Polygon dengan{" "}
                              {Array.isArray(validatedLocation)
                                ? validatedLocation[0]?.length || 0
                                : 0}{" "}
                              titik
                            </small>
                            <details className="mt-1">
                              <summary
                                style={{
                                  cursor: "pointer",
                                  fontSize: "0.85em",
                                }}
                              >
                                Lihat koordinat
                              </summary>
                              <div
                                style={{
                                  maxHeight: "100px",
                                  overflowY: "auto",
                                  fontSize: "0.8em",
                                }}
                              >
                                {Array.isArray(validatedLocation) &&
                                validatedLocation[0] ? (
                                  validatedLocation[0].map((coord, idx) => (
                                    <div key={idx}>
                                      {idx + 1}: [
                                      {coord[0]?.toFixed(6) || "N/A"},{" "}
                                      {coord[1]?.toFixed(6) || "N/A"}]
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-muted">
                                    Format koordinat tidak valid
                                  </span>
                                )}
                              </div>
                            </details>
                          </div>
                        ) : (
                          <span className="text-muted">Tidak tersedia</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Tanggal Dibuat:</strong>
                      </td>
                      <td>
                        {asset.created_at
                          ? (() => {
                              try {
                                const date = new Date(asset.created_at);
                                return isNaN(date.getTime())
                                  ? asset.created_at
                                  : date.toLocaleString("id-ID");
                              } catch (e) {
                                return String(asset.created_at);
                              }
                            })()
                          : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Col>

          {/* Peta dengan polygon/shape yang sudah digambar */}
          <Col md={6}>
            <div className="card h-100">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">Lokasi di Peta</h5>
              </div>
              <div className="card-body p-0">
                <div style={{ height: "500px", width: "100%" }}>
                  {hasValidLocation && assetForMap ? (
                    <PetaAsetYardip
                      assets={[assetForMap]}
                      isDrawing={false} // Disable drawing mode untuk detail view
                      onDrawingCreated={() => {}} // Empty handler karena tidak digunakan
                      jatengBoundary={jatengBoundary}
                      diyBoundary={diyBoundary}
                      fitBounds={true} // Auto fit ke lokasi aset
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                      <div className="text-center">
                        <i className="fas fa-map-marker-alt fa-3x mb-3"></i>
                        <p>Lokasi tidak tersedia</p>
                        <small>Belum ada data koordinat untuk aset ini</small>
                        {asset.lokasi && (
                          <div className="mt-2">
                            <small className="text-danger">
                              Data lokasi tidak valid atau rusak
                            </small>
                            <br />
                            <small className="text-muted">
                              Format: {typeof asset.lokasi}
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info tambahan tentang lokasi */}
              {hasValidLocation && assetForMap && (
                <div className="card-footer bg-light">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Peta menampilkan area yang telah digambar untuk aset ini
                  </small>
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Additional Information Row */}
        {hasValidLocation && assetForMap && (
          <Row className="mt-3">
            <Col md={12}>
              <div className="card">
                <div className="card-header bg-warning text-dark">
                  <h6 className="mb-0">Informasi Geografis</h6>
                </div>
                <div className="card-body">
                  <Row>
                    <Col md={4}>
                      <strong>Tipe Geometri:</strong>
                      <br />
                      <span className="text-muted">Polygon</span>
                    </Col>
                    <Col md={4}>
                      <strong>Jumlah Koordinat:</strong>
                      <br />
                      <span className="text-muted">
                        {Array.isArray(validatedLocation) &&
                        validatedLocation[0]
                          ? validatedLocation[0].length
                          : 0}{" "}
                        titik
                      </span>
                    </Col>
                    <Col md={4}>
                      <strong>Luas Kalkulasi:</strong>
                      <br />
                      <span className="text-muted">
                        {asset.area
                          ? `${Number(asset.area).toFixed(2)} m²`
                          : "Tidak tersedia"}
                      </span>
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const DataAsetYardipPage = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedBidang, setSelectedBidang] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingAsset, setEditingAsset] = useState(null);
  // State untuk modal detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

  // State untuk edit mode dengan peta
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocationData, setEditedLocationData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch specifically yardip_assets endpoint
      const res = await axios.get(`${API_URL}/yardip_assets`);
      setAssets(res.data || []);
      setFilteredAssets(res.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data aset yardip.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter berdasarkan bidang
  useEffect(() => {
    if (!selectedBidang) {
      setFilteredAssets(assets);
    } else {
      setFilteredAssets(assets.filter((a) => a.bidang === selectedBidang));
    }
  }, [selectedBidang, assets]);

  // Get unique bidang options from assets
  const bidangOptions = [
    ...new Set(assets.map((asset) => asset.bidang).filter(Boolean)),
  ];

  const handleDeleteAsset = async (id) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const toastId = toast.loading("Menghapus aset...");
        try {
          await axios.delete(`${API_URL}/yardip_assets/${id}`);
          setAssets(assets.filter((a) => a.id !== id));
          toast.success("Aset berhasil dihapus.", { id: toastId });
        } catch (err) {
          toast.error("Gagal menghapus aset.", { id: toastId });
          console.error(err);
        }
      }
    });
  };

  const handleEditAsset = (asset) => {
    console.log("Starting edit for asset:", asset);
    setEditingAsset(asset);
    setIsEditingLocation(false);
    setEditedLocationData(null);
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setIsEditingLocation(false);
    setEditedLocationData(null);
  };

  // Handler untuk edit lokasi - DIPERBAIKI
  const handleEditLocation = () => {
    console.log("Starting location edit for asset:", editingAsset);
    setIsEditingLocation(true);

    // Reset edited location data when starting new edit
    setEditedLocationData(null);
  };

  const handleCancelEditLocation = () => {
    setIsEditingLocation(false);
    setEditedLocationData(null);
  };

  const handleLocationDrawingCreated = (data) => {
    console.log("New location data created:", data);
    setEditedLocationData(data);

    // Auto-close location editing mode after drawing is complete
    setIsEditingLocation(false);

    toast.success(
      "Lokasi baru berhasil digambar! Klik 'Simpan Perubahan' untuk menyimpan."
    );
  };

  const handleSaveAsset = async (updatedData) => {
    if (!editingAsset) return;

    // Gabungkan data form dengan data lokasi yang baru jika ada
    const finalData = {
      ...updatedData,
      ...(editedLocationData && {
        lokasi: editedLocationData.geometry || editedLocationData.coordinates,
        area: editedLocationData.area,
      }),
    };

    console.log("Saving asset with data:", finalData);

    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      const response = await axios.put(
        `${API_URL}/yardip_assets/${editingAsset.id}`,
        finalData
      );

      // Update assets list dengan data yang baru
      setAssets(
        assets.map((a) => (a.id === editingAsset.id ? response.data : a))
      );

      toast.success("Aset berhasil diperbarui!", { id: toastId });

      // Reset semua editing state
      setEditingAsset(null);
      setIsEditingLocation(false);
      setEditedLocationData(null);
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error("Save error:", err);
    }
  };

  // Handler untuk tombol detail
  const handleViewDetail = (asset) => {
    console.log("yardip Asset data for detail:", asset);
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAssetDetail(null);
  };

  // FUNGSI VALIDASI LOKASI - DIPERBAIKI
  const validateAndParseLocation = (locationData) => {
    console.log("Validating location data:", locationData);

    if (!locationData) {
      console.log("No location data provided");
      return null;
    }

    let lokasi = locationData;

    // Parse JSON string if needed
    if (typeof lokasi === "string") {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        console.error("Failed to parse location JSON:", e);
        return null;
      }
    }

    // Handle different location formats
    if (Array.isArray(lokasi)) {
      // Direct coordinates array format [[lng, lat], [lng, lat], ...]
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        typeof lokasi[0][0] === "number"
      ) {
        return [lokasi]; // Wrap in array for polygon format
      }
      // Already in polygon format [[[lng, lat], [lng, lat], ...]]
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        Array.isArray(lokasi[0][0])
      ) {
        return lokasi;
      }
    }

    // GeoJSON Polygon format
    if (lokasi.type === "Polygon" && lokasi.coordinates) {
      return lokasi.coordinates;
    }

    // Generic coordinates wrapper
    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }

    console.warn("Unrecognized location format:", lokasi);
    return null;
  };

  // Prepare current asset for map display during editing - DIPERBAIKI
  const prepareEditAssetForMap = () => {
    if (!editingAsset) {
      console.log("No editing asset available");
      return [];
    }

    console.log("Preparing edit asset for map:", editingAsset);

    const validatedLocation = validateAndParseLocation(editingAsset.lokasi);

    if (!validatedLocation) {
      console.log("No valid location found for editing asset");
      return [];
    }

    const assetForMap = {
      id: editingAsset.id || `temp-${Date.now()}`,
      nama: editingAsset.pengelola || "Unknown",
      kodim: editingAsset.bidang || "",
      lokasi: validatedLocation,
      luas: Number(editingAsset.area) || 0,
      status: editingAsset.status || "",
      kabkota: editingAsset.kabkota || "",
      kecamatan: editingAsset.kecamatan || "",
      kelurahan: editingAsset.kelurahan || "",
      type: "yardip",
    };

    console.log("Asset prepared for map:", assetForMap);
    return [assetForMap];
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  // Main view
  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Yardip</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === "development" && (
        <Alert variant="success" className="mb-3">
          <small>
            <strong>Debug Info Yardip:</strong>
            <br />- Total Assets: {assets.length} items
            <br />- Filtered Assets: {filteredAssets.length} items
            <br />- Selected Bidang: {selectedBidang || "All"}
            <br />- Available Bidang Options:{" "}
            {bidangOptions.join(", ") || "None"}
            <br />- Editing Asset: {editingAsset?.id || "None"}
            <br />- Is Editing Location: {isEditingLocation ? "Yes" : "No"}
            <br />- Has Edited Location Data:{" "}
            {editedLocationData ? "Yes" : "No"}
            <br />- API Endpoint: {API_URL}/yardip_assets
            <br />- Asset Type: Yardip Assets Only
          </small>
        </Alert>
      )}

      <Row>
        {/* Tabel selalu full width, form edit akan muncul di bawah */}
        <Col md={12}>
          <div className="mb-3">
            <Row>
              <Col md={6}>
                <label>Filter Bidang:</label>
                <select
                  className="form-select"
                  value={selectedBidang}
                  onChange={(e) => setSelectedBidang(e.target.value)}
                >
                  <option value="">-- Semua Bidang --</option>
                  {bidangOptions.map((bidang) => (
                    <option key={bidang} value={bidang}>
                      {bidang}
                    </option>
                  ))}
                </select>
              </Col>
              <Col md={6} className="d-flex align-items-end">
                <div className="text-muted">
                  <small>
                    Menampilkan {filteredAssets.length} dari {assets.length}{" "}
                    aset yardip
                  </small>
                </div>
              </Col>
            </Row>
          </div>

          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {assets.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-muted">
                  <i className="fas fa-folder-open fa-3x mb-3"></i>
                  <h5>Belum Ada Data Aset Yardip</h5>
                  <p>
                    Silakan tambah aset yardip baru di halaman Tambah Aset
                    Yardip.
                  </p>
                </div>
              </div>
            ) : (
              <TabelAsetYardip
                assets={filteredAssets}
                onEdit={user ? handleEditAsset : null}
                onDelete={user ? handleDeleteAsset : null}
                onViewDetail={handleViewDetail}
              />
            )}
          </div>
        </Col>

        {/* Form Edit - Pindah ke bawah dengan layout yang lebih baik */}
        {editingAsset && (
          <Col md={12} className="mt-4">
            <div className="card shadow-sm">
              <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <span>Edit Aset Yardip - {editingAsset.pengelola}</span>
                <div className="d-flex gap-2">
                  <Button
                    variant={isEditingLocation ? "outline-light" : "light"}
                    size="sm"
                    onClick={handleEditLocation}
                    disabled={isEditingLocation}
                  >
                    {isEditingLocation
                      ? "Sedang Edit Lokasi..."
                      : "Edit Lokasi"}
                  </Button>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    Batal Edit
                  </Button>
                </div>
              </div>
              <div className="card-body">
                <Row>
                  <Col md={6}>
                    <FormYardip
                      onSave={handleSaveAsset}
                      onCancel={handleCancelEdit}
                      assetToEdit={editingAsset}
                      isEnabled={true}
                      initialGeometry={
                        editedLocationData ? editedLocationData.geometry : null
                      }
                      initialArea={
                        editedLocationData ? editedLocationData.area : null
                      }
                    />

                    {/* Status edit lokasi */}
                    {editedLocationData && (
                      <div className="alert alert-success mt-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <i className="fas fa-check-circle me-2"></i>
                            <strong>Lokasi Baru Siap!</strong>
                            <br />
                            <small className="text-muted">
                              Luas: {editedLocationData.area?.toFixed(2)} m²
                            </small>
                          </div>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={handleCancelEditLocation}
                          >
                            Batalkan
                          </button>
                        </div>
                      </div>
                    )}
                  </Col>
                  <Col md={6}>
                    {/* Preview area atau informasi tambahan */}
                    <div className="bg-light p-3 rounded">
                      <h6 className="text-muted mb-3">Preview Data</h6>
                      <small>
                        <strong>ID:</strong> {editingAsset.id}
                        <br />
                        <strong>Status Saat Ini:</strong>{" "}
                        <span
                          className={`badge ${
                            editingAsset.status === "Dimiliki/Dikuasai"
                              ? "bg-success"
                              : editingAsset.status ===
                                "Tidak Dimiliki/Tidak Dikuasai"
                              ? "bg-danger"
                              : editingAsset.status === "Lain-lain"
                              ? "bg-warning"
                              : "bg-secondary"
                          }`}
                        >
                          {editingAsset.status}
                        </span>
                        <br />
                        <strong>Lokasi:</strong> {editingAsset.kabkota},{" "}
                        {editingAsset.kecamatan}
                        <br />
                        {editingAsset.area && (
                          <>
                            <strong>Luas Area Saat Ini:</strong>{" "}
                            {Number(editingAsset.area).toFixed(2)} m²
                            <br />
                          </>
                        )}
                        {editedLocationData && editedLocationData.area && (
                          <>
                            <strong>Luas Area Baru:</strong>{" "}
                            <span className="text-success fw-bold">
                              {editedLocationData.area.toFixed(2)} m²
                            </span>
                            <br />
                          </>
                        )}
                        <strong>Terakhir Diupdate:</strong>{" "}
                        {editingAsset.updated_at
                          ? new Date(editingAsset.updated_at).toLocaleString(
                              "id-ID"
                            )
                          : "-"}
                      </small>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>
        )}

        {/* Peta Edit - Tampil di bawah ketika sedang edit lokasi */}
        {editingAsset && isEditingLocation && (
          <Col md={12} className="mt-3">
            <div className="card shadow-sm">
              <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">
                    <i className="fas fa-edit me-2"></i>
                    Edit Lokasi Aset Yardip - {editingAsset.pengelola}
                  </h6>
                  <small>
                    {prepareEditAssetForMap().length > 0
                      ? "Polygon hijau menunjukkan lokasi saat ini. Gambar polygon baru untuk mengubah lokasi."
                      : "Belum ada lokasi sebelumnya. Silakan gambar polygon baru."}
                  </small>
                </div>
                <Button
                  variant="outline-dark"
                  size="sm"
                  onClick={handleCancelEditLocation}
                >
                  <i className="fas fa-times me-1"></i>
                  Selesai Edit Lokasi
                </Button>
              </div>
              <div className="card-body p-2">
                <div style={{ height: "600px", width: "100%" }}>
                  <PetaAsetYardip
                    key={`edit-map-${editingAsset.id}-${isEditingLocation}`} // Force re-render
                    assets={prepareEditAssetForMap()}
                    isDrawing={true}
                    onDrawingCreated={handleLocationDrawingCreated}
                    jatengBoundary={jatengBoundary}
                    diyBoundary={diyBoundary}
                    fitBounds={true}
                    editMode={true} // Pass edit mode flag
                  />
                </div>

                <div className="mt-3 p-2 bg-light rounded">
                  <div className="row">
                    <div className="col-md-6">
                      <small className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        <strong>Cara edit lokasi:</strong>
                      </small>
                      <ul className="small text-muted mt-1 mb-0">
                        <li>Polygon hijau adalah lokasi saat ini (jika ada)</li>
                        <li>Gunakan tool drawing untuk membuat polygon baru</li>
                        <li>Polygon baru akan mengganti lokasi yang lama</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted">
                        <i className="fas fa-map me-1"></i>
                        <strong>Status lokasi:</strong>
                      </small>
                      <div className="small text-muted mt-1">
                        Current:{" "}
                        {prepareEditAssetForMap().length > 0
                          ? "Ada lokasi"
                          : "Tidak ada"}
                        <br />
                        {editedLocationData && (
                          <span className="text-success">
                            New: Polygon baru siap (
                            {editedLocationData.area?.toFixed(2)} m²)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        )}
      </Row>

      {/* Enhanced Modal Detail Aset with Map */}
      <DetailModalYardip
        asset={selectedAssetDetail}
        show={showDetailModal}
        onHide={handleCloseDetailModal}
      />
    </Container>
  );
};

export default DataAsetYardipPage;
