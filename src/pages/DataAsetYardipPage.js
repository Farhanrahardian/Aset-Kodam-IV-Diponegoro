import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Table,
  Button,
  Modal,
  Card,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import EditYardip from "./EditYardip";
import EditYardipLocation from "./EditYardipLocation";
import PetaAsetYardip from "../components/PetaAsetYardip";
import DetailOffcanvasYardip from "../components/DetailOffcanvasYardip";
import MapErrorBoundary from "../components/MapErrorBoundary";
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// Enhanced city data - SAMA DENGAN TambahAsetYardipPage
const kotaData = {
  jateng: [
    {
      id: "semarang",
      name: "Semarang",
      bounds: [
        [-6.95, 110.35],
        [-7.05, 110.45],
      ],
    },
    {
      id: "solo",
      name: "Surakarta (Solo)",
      bounds: [
        [-7.52, 110.75],
        [-7.62, 110.85],
      ],
    },
    {
      id: "yogya",
      name: "Yogyakarta",
      bounds: [
        [-7.72, 110.32],
        [-7.82, 110.42],
      ],
    },
    {
      id: "magelang",
      name: "Magelang",
      bounds: [
        [-7.42, 110.18],
        [-7.52, 110.28],
      ],
    },
    {
      id: "salatiga",
      name: "Salatiga",
      bounds: [
        [-7.32, 110.42],
        [-7.42, 110.52],
      ],
    },
    {
      id: "tegal",
      name: "Tegal",
      bounds: [
        [-6.83, 109.12],
        [-6.93, 109.22],
      ],
    },
    {
      id: "pekalongan",
      name: "Pekalongan",
      bounds: [
        [-6.83, 109.63],
        [-6.93, 109.73],
      ],
    },
    {
      id: "purwokerto",
      name: "Purwokerto",
      bounds: [
        [-7.42, 109.22],
        [-7.52, 109.32],
      ],
    },
    {
      id: "cilacap",
      name: "Cilacap",
      bounds: [
        [-7.68, 109.02],
        [-7.78, 109.12],
      ],
    },
    {
      id: "kudus",
      name: "Kudus",
      bounds: [
        [-6.78, 110.82],
        [-6.88, 110.92],
      ],
    },
    {
      id: "jepara",
      name: "Jepara",
      bounds: [
        [-6.55, 110.62],
        [-6.65, 110.72],
      ],
    },
    {
      id: "rembang",
      name: "Rembang",
      bounds: [
        [-6.68, 111.32],
        [-6.78, 111.42],
      ],
    },
  ],
  diy: [
    {
      id: "jogja",
      name: "Yogyakarta",
      bounds: [
        [-7.72, 110.32],
        [-7.82, 110.42],
      ],
    },
    {
      id: "sleman",
      name: "Sleman",
      bounds: [
        [-7.62, 110.28],
        [-7.72, 110.38],
      ],
    },
    {
      id: "bantul",
      name: "Bantul",
      bounds: [
        [-7.82, 110.28],
        [-7.92, 110.38],
      ],
    },
    {
      id: "kulonprogo",
      name: "Kulon Progo",
      bounds: [
        [-7.72, 110.05],
        [-7.82, 110.15],
      ],
    },
    {
      id: "gunungkidul",
      name: "Gunung Kidul",
      bounds: [
        [-7.92, 110.45],
        [-8.02, 110.55],
      ],
    },
  ],
};

// Enhanced filter panel untuk filter berdasarkan lokasi
const FilterPanelTop = ({
  assets,
  provinsiOptions,
  kotaOptions,
  selectedProvinsi,
  selectedKota,
  onSelectProvinsi,
  onSelectKota,
  onShowAll,
  totalAssets,
  filteredAssets,
}) => {
  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Filter Data Aset Yardip</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label fw-bold">Provinsi</label>
              <select
                className="form-select"
                value={selectedProvinsi}
                onChange={(e) => onSelectProvinsi(e.target.value)}
              >
                <option value="">Semua Provinsi</option>
                {provinsiOptions.map((provinsi) => (
                  <option key={provinsi.value} value={provinsi.value}>
                    {provinsi.label}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label fw-bold">Kota/Kabupaten</label>
              <select
                className="form-select"
                value={selectedKota || ""}
                onChange={(e) => onSelectKota(e.target.value)}
                disabled={!selectedProvinsi}
              >
                <option value="">
                  {selectedProvinsi ? "Semua Kota" : "Pilih Provinsi Dulu"}
                </option>
                {kotaOptions.map((kota) => (
                  <option key={kota.id} value={kota.id}>
                    {kota.name}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label fw-bold">Aksi</label>
              <div>
                <Button
                  variant="outline-secondary"
                  onClick={onShowAll}
                  className="w-100"
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {/* Summary Info */}
        <Row>
          <Col>
            <div className="bg-light p-2 rounded">
              <small className="text-muted">
                <strong>Hasil:</strong> {filteredAssets} dari {totalAssets} aset
                yardip
                {selectedProvinsi && (
                  <span>
                    {" "}
                    • <strong>Provinsi:</strong>{" "}
                    {provinsiOptions.find((p) => p.value === selectedProvinsi)
                      ?.label || selectedProvinsi}
                  </span>
                )}
                {selectedKota && (
                  <span>
                    {" "}
                    • <strong>Kota:</strong>{" "}
                    {kotaOptions.find((k) => k.id === selectedKota)?.name ||
                      selectedKota}
                  </span>
                )}
              </small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// Enhanced table component untuk yardip - FIXED HORIZONTAL SCROLL
const TabelAsetYardip = ({ assets, onEdit, onDelete, onViewDetail }) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Tidak ada data aset yardip yang ditemukan.</p>
      </div>
    );
  }

  // Helper function untuk badge status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Dimiliki/Dikuasai":
        return "bg-success";
      case "Tidak Dimiliki/Tidak Dikuasai":
        return "bg-danger";
      case "Lain-lain":
        return "bg-info";
      default:
        return "bg-secondary";
    }
  };

  // Helper function untuk mendapatkan nama provinsi
  const getProvinsiName = (asset) => {
    if (asset.provinsi) return asset.provinsi;
    if (asset.provinsi_id) {
      return asset.provinsi_id === "jateng" ? "Jawa Tengah" : "DI Yogyakarta";
    }
    return "-";
  };

  // Helper function untuk mendapatkan nama kota
  const getKotaName = (asset) => {
    if (asset.kota) return asset.kota;
    if (asset.kabkota) return asset.kabkota;
    return "-";
  };

  return (
    <Table
      striped
      bordered
      hover
      className="mb-0"
      style={{
        minWidth: "1400px", // Increased minimum width
        width: "100%",
      }}
    >
      <thead
        className="table-dark"
        style={{ position: "sticky", top: 0, zIndex: 10 }}
      >
        <tr>
          <th style={{ minWidth: "200px", width: "200px" }}>Pengelola</th>
          <th style={{ minWidth: "130px", width: "130px" }}>Bidang</th>
          <th style={{ minWidth: "160px", width: "160px" }}>Peruntukan</th>
          <th style={{ minWidth: "130px", width: "130px" }}>Provinsi</th>
          <th style={{ minWidth: "130px", width: "130px" }}>Kota</th>
          <th style={{ minWidth: "160px", width: "160px" }}>Kelurahan</th>
          <th style={{ minWidth: "120px", width: "120px" }}>Status</th>
          <th style={{ minWidth: "120px", width: "120px" }}>Luas</th>
          <th style={{ minWidth: "180px", width: "180px" }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td style={{ minWidth: "200px", width: "200px" }}>
              <div
                style={{
                  wordWrap: "break-word",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <strong title={asset.pengelola || "-"}>
                  {asset.pengelola || "-"}
                </strong>
              </div>
            </td>
            <td style={{ minWidth: "130px", width: "130px" }}>
              <span className="badge bg-info" title={asset.bidang || "-"}>
                {asset.bidang || "-"}
              </span>
            </td>
            <td style={{ minWidth: "160px", width: "160px" }}>
              <div
                style={{
                  fontSize: "0.9em",
                  wordWrap: "break-word",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={asset.peruntukan || "-"}
              >
                {asset.peruntukan || "-"}
              </div>
            </td>
            <td style={{ minWidth: "130px", width: "130px" }}>
              <span className="badge bg-primary" title={getProvinsiName(asset)}>
                {getProvinsiName(asset)}
              </span>
            </td>
            <td style={{ minWidth: "130px", width: "130px" }}>
              <div
                style={{
                  wordWrap: "break-word",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={getKotaName(asset)}
              >
                <strong>{getKotaName(asset)}</strong>
              </div>
            </td>
            <td style={{ minWidth: "160px", width: "160px" }}>
              <div
                style={{
                  fontSize: "0.9em",
                  wordWrap: "break-word",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={asset.kelurahan || "-"}
              >
                <strong>{asset.kelurahan || "-"}</strong>
              </div>
            </td>
            <td style={{ minWidth: "120px", width: "120px" }}>
              <span
                className={`badge ${getStatusBadgeClass(asset.status)}`}
                title={asset.status || "-"}
                style={{ fontSize: "0.75em" }}
              >
                {asset.status === "Dimiliki/Dikuasai"
                  ? "Dimiliki"
                  : asset.status === "Tidak Dimiliki/Tidak Dikuasai"
                  ? "T. Dimiliki"
                  : asset.status || "-"}
              </span>
            </td>
            <td style={{ minWidth: "120px", width: "120px" }}>
              <div style={{ fontSize: "0.9em" }}>
                {asset.area ? (
                  <span
                    className="text-muted"
                    title={`${Number(asset.area).toLocaleString("id-ID")} m²`}
                  >
                    {Number(asset.area).toLocaleString("id-ID")} m²
                  </span>
                ) : (
                  "-"
                )}
              </div>
            </td>
            <td style={{ minWidth: "180px", width: "180px" }}>
              <div className="d-flex gap-1 flex-nowrap">
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => onViewDetail(asset)}
                  title="Lihat Detail"
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                >
                  Detail
                </Button>

                {onEdit && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => onEdit(asset)}
                    title="Edit Aset"
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
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
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
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

// Enhanced Modal Detail Component
const DetailModalYardip = ({ asset, show, onHide }) => {
  if (!asset) return null;

  // Validasi dan sanitasi data lokasi untuk yardip
  const validateLocationData = (asset) => {
    if (!asset.lokasi) {
      return null;
    }

    let lokasi = asset.lokasi;

    if (typeof lokasi === "string") {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        return null;
      }
    }

    if (Array.isArray(lokasi) && lokasi.length > 0) {
      if (Array.isArray(lokasi[0])) {
        return lokasi;
      }
    }

    if (lokasi.type === "Polygon" && lokasi.coordinates) {
      return lokasi.coordinates;
    }

    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }

    return null;
  };

  const validatedLocation = validateLocationData(asset);
  const hasValidLocation = validatedLocation !== null;

  // Prepare asset data untuk PetaAset component
  const prepareAssetForMap = (asset) => {
    if (!hasValidLocation) return null;

    return {
      id: asset.id || `temp-${Date.now()}`,
      nama: asset.pengelola || "Unknown",
      kodim: asset.bidang || "",
      lokasi: validatedLocation,
      luas: Number(asset.area) || 0,
      status: asset.status || "",
      kabkota: asset.kabkota || "",
      kecamatan: asset.kecamatan || "",
      kelurahan: asset.kelurahan || "",
      keterangan: asset.keterangan || "",
      type: "yardip",
    };
  };

  const assetForMap = prepareAssetForMap(asset);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Detail Aset Yardip - {asset.pengelola || "Unknown"}
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
                        <strong>Peruntukan:</strong>
                      </td>
                      <td>{asset.peruntukan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Provinsi:</strong>
                      </td>
                      <td>
                        <span className="badge bg-primary">
                          {asset.provinsi ||
                            (asset.provinsi_id === "jateng"
                              ? "Jawa Tengah"
                              : asset.provinsi_id === "diy"
                              ? "DI Yogyakarta"
                              : "-")}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kota:</strong>
                      </td>
                      <td>{asset.kota || asset.kabkota || "-"}</td>
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
                        <td>{Number(asset.area).toLocaleString("id-ID")} m²</td>
                      </tr>
                    )}
                    <tr>
                      <td>
                        <strong>Tanggal Dibuat:</strong>
                      </td>
                      <td>
                        {asset.created_at
                          ? new Date(asset.created_at).toLocaleString("id-ID")
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
                    <MapErrorBoundary height="500px">
                      <PetaAsetYardip
                        key={`detail-${asset.id}-${
                          asset.updated_at || Date.now()
                        }`}
                        assets={[assetForMap]}
                        isDrawing={false}
                        onDrawingCreated={() => {}}
                        jatengBoundary={jatengBoundary}
                        diyBoundary={diyBoundary}
                        fitBounds={true}
                        displayMode="polygon"
                      />
                    </MapErrorBoundary>
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
                          ? `${Number(asset.area).toLocaleString("id-ID")} m²`
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

  // State untuk filter lokasi (mengganti selectedBidang dan statusFilter)
  const [selectedProvinsi, setSelectedProvinsi] = useState("");
  const [selectedKota, setSelectedKota] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk edit asset
  const [editingAsset, setEditingAsset] = useState(null);

  // State untuk modal detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

  // State untuk edit mode dengan peta
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocationData, setEditedLocationData] = useState(null);

  // State untuk location handling saat edit
  const [editSelectedProvince, setEditSelectedProvince] = useState("");
  const [editSelectedCity, setEditSelectedCity] = useState("");
  const [editCityBounds, setEditCityBounds] = useState(null);

  // State untuk peta utama dan offcanvas
  const [zoomToAsset, setZoomToAsset] = useState(null);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [assetForOffcanvas, setAssetForOffcanvas] = useState(null);
  const [mapKey, setMapKey] = useState(Date.now()); // Key untuk force re-render map

  // Handler untuk Peta utama
  const handleMarkerClick = useCallback((asset) => {
    console.log("Yardip marker clicked:", asset);
    setAssetForOffcanvas(asset);
    setShowOffcanvas(true);
    setZoomToAsset(asset);
  }, []);

  const handleCloseOffcanvas = useCallback(() => {
    setShowOffcanvas(false);
    setAssetForOffcanvas(null);
    setZoomToAsset(null);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/yardip_assets`, {
        timeout: 10000,
      });
      console.log("Fetched yardip assets:", res.data);
      setAssets(res.data || []);
      setFilteredAssets(res.data || []);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Gagal memuat data aset yardip.");
      toast.error("Gagal memuat data aset yardip.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    return () => {
      // Cleanup function
      setAssets([]);
      setFilteredAssets([]);
      setEditingAsset(null);
      setZoomToAsset(null);
    };
  }, [fetchData]);

  // Get options untuk filter provinsi
  const provinsiOptions = useMemo(() => {
    const uniqueProvinsi = new Set();

    assets.forEach((asset) => {
      // Cek provinsi dari field provinsi
      if (asset.provinsi) {
        uniqueProvinsi.add(asset.provinsi);
      }
      // Cek provinsi dari field provinsi_id
      else if (asset.provinsi_id) {
        const provinsiName =
          asset.provinsi_id === "jateng"
            ? "Jawa Tengah"
            : asset.provinsi_id === "diy"
            ? "DI Yogyakarta"
            : asset.provinsi_id;
        uniqueProvinsi.add(provinsiName);
      }
    });

    return Array.from(uniqueProvinsi)
      .map((provinsi) => ({
        value: provinsi,
        label: provinsi,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assets]);

  // Get options untuk filter kota berdasarkan provinsi yang dipilih
  const kotaOptions = useMemo(() => {
    if (!selectedProvinsi) return [];

    const uniqueKota = new Set();

    assets.forEach((asset) => {
      const assetProvinsi =
        asset.provinsi ||
        (asset.provinsi_id === "jateng"
          ? "Jawa Tengah"
          : asset.provinsi_id === "diy"
          ? "DI Yogyakarta"
          : asset.provinsi_id);

      if (assetProvinsi === selectedProvinsi) {
        // Ambil nama kota dari berbagai field yang mungkin
        const kotaName = asset.kota || asset.kabkota;
        if (kotaName) {
          uniqueKota.add(kotaName);
        }
      }
    });

    return Array.from(uniqueKota)
      .map((kota) => ({
        id: kota,
        name: kota,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, selectedProvinsi]);

  // Filter berdasarkan provinsi dan kota
  const processedAssets = useMemo(() => {
    let filtered = assets;

    if (selectedProvinsi) {
      filtered = filtered.filter((asset) => {
        const assetProvinsi =
          asset.provinsi ||
          (asset.provinsi_id === "jateng"
            ? "Jawa Tengah"
            : asset.provinsi_id === "diy"
            ? "DI Yogyakarta"
            : asset.provinsi_id);
        return assetProvinsi === selectedProvinsi;
      });
    }

    if (selectedKota) {
      filtered = filtered.filter((asset) => {
        const assetKota = asset.kota || asset.kabkota;
        return assetKota === selectedKota;
      });
    }

    return filtered;
  }, [assets, selectedProvinsi, selectedKota]);

  useEffect(() => {
    setFilteredAssets(processedAssets);
  }, [processedAssets]);

  // Handler functions untuk filter lokasi
  const handleProvinsiChange = useCallback((provinsi) => {
    setSelectedProvinsi(provinsi || "");
    setSelectedKota(""); // Reset kota saat provinsi berubah
  }, []);

  const handleKotaChange = useCallback((kota) => {
    setSelectedKota(kota || "");
  }, []);

  const handleShowAll = useCallback(() => {
    setSelectedProvinsi("");
    setSelectedKota("");
    setZoomToAsset(null);
  }, []);

  // SIMPLE AND EFFECTIVE DELETE HANDLER untuk JSON Server
  const handleDeleteAsset = useCallback(
    async (id) => {
      // Validasi ID
      if (!id) {
        console.error("ID tidak valid:", id);
        toast.error("ID aset tidak valid");
        return;
      }

      const assetId = String(id);
      console.log("Deleting yardip asset ID:", assetId);

      // Cari aset untuk konfirmasi
      const assetToDelete = assets.find((a) => String(a.id) === assetId);
      if (!assetToDelete) {
        console.error("Asset not found:", assetId);
        toast.error("Aset tidak ditemukan");
        await fetchData(); // Refresh jika tidak ditemukan
        return;
      }

      // Konfirmasi penghapusan
      const result = await Swal.fire({
        title: "Hapus Aset Yardip?",
        html: `Yakin ingin menghapus:<br/><strong>"${assetToDelete.pengelola}"</strong>?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;

      const toastId = toast.loading("Menghapus aset...");

      try {
        // Step 1: Hapus dari server menggunakan JSON Server API
        const deleteUrl = `${API_URL}/yardip_assets/${assetId}`;
        console.log("DELETE URL:", deleteUrl);

        const deleteConfig = {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 20000,
        };

        await axios(deleteUrl, deleteConfig);
        console.log("Server delete request sent");

        // Step 2: Langsung update state lokal tanpa menunggu verifikasi
        // Ini memastikan UI langsung update
        const newAssets = assets.filter((a) => String(a.id) !== assetId);
        const newFilteredAssets = filteredAssets.filter(
          (a) => String(a.id) !== assetId
        );

        setAssets(newAssets);
        setFilteredAssets(newFilteredAssets);

        console.log(
          `State updated: ${assets.length} -> ${newAssets.length} assets`
        );

        // Step 3: Tutup modal yang terbuka jika diperlukan
        if (selectedAssetDetail && String(selectedAssetDetail.id) === assetId) {
          setShowDetailModal(false);
          setSelectedAssetDetail(null);
        }

        if (assetForOffcanvas && String(assetForOffcanvas.id) === assetId) {
          setShowOffcanvas(false);
          setAssetForOffcanvas(null);
        }

        if (zoomToAsset && String(zoomToAsset.id) === assetId) {
          setZoomToAsset(null);
        }

        // Step 4: Tampilkan success message
        toast.success(`Aset "${assetToDelete.pengelola}" berhasil dihapus!`, {
          id: toastId,
          duration: 4000,
        });

        // Step 5: Verifikasi dan refresh setelah 2 detik untuk memastikan konsistensi
        setTimeout(async () => {
          try {
            console.log("Post-delete verification...");

            // Coba ambil data yang baru saja dihapus
            const verifyResponse = await axios.get(
              `${API_URL}/yardip_assets/${assetId}`,
              {
                timeout: 10000,
                validateStatus: (status) => status === 404 || status === 200,
              }
            );

            if (verifyResponse.status === 200) {
              // Jika masih ada, berarti delete gagal - refresh ulang
              console.log("Asset still exists, refreshing data...");
              await fetchData();
              toast.error("Penghapusan gagal, data telah disegarkan", {
                duration: 3000,
              });
            } else {
              console.log("Delete verified successfully");
            }
          } catch (verifyError) {
            if (verifyError.response?.status === 404) {
              console.log("Delete verified: Asset not found (404)");
            } else {
              console.log(
                "Verification error, refreshing data:",
                verifyError.message
              );
              await fetchData();
            }
          }
        }, 2000);
      } catch (error) {
        console.error("Delete error:", error);

        let errorMessage = "Gagal menghapus aset";

        if (error.code === "ECONNABORTED") {
          errorMessage = "Timeout - periksa koneksi ke JSON Server";
        } else if (error.response?.status === 404) {
          // Jika 404, anggap sudah berhasil dihapus
          console.log("Asset already deleted (404)");
          const newAssets = assets.filter((a) => String(a.id) !== assetId);
          const newFilteredAssets = filteredAssets.filter(
            (a) => String(a.id) !== assetId
          );
          setAssets(newAssets);
          setFilteredAssets(newFilteredAssets);

          if (
            selectedAssetDetail &&
            String(selectedAssetDetail.id) === assetId
          ) {
            setShowDetailModal(false);
            setSelectedAssetDetail(null);
          }
          if (assetForOffcanvas && String(assetForOffcanvas.id) === assetId) {
            setShowOffcanvas(false);
            setAssetForOffcanvas(null);
          }

          toast.success("Aset berhasil dihapus!", { id: toastId });
          return;
        } else if (error.response?.status >= 500) {
          errorMessage = "Server error - restart JSON Server";
        } else if (!error.response) {
          errorMessage = "Tidak dapat terhubung ke JSON Server";
        }

        // Rollback state jika ada error
        await fetchData();
        toast.error(errorMessage, { id: toastId, duration: 5000 });
      }
    },
    [
      assets,
      filteredAssets,
      selectedAssetDetail,
      assetForOffcanvas,
      zoomToAsset,
      fetchData,
    ]
  );

  // Enhanced Edit handler yang lebih robust
  const handleEditAsset = useCallback((asset) => {
    console.log("Starting edit for yardip asset:", asset);

    // Validasi asset
    if (!asset || !asset.id) {
      toast.error("Data aset tidak valid");
      return;
    }

    console.log("Valid asset for editing:", asset);

    setEditingAsset(asset);
    setIsEditingLocation(false);
    setEditedLocationData(null);

    // Inisialisasi lokasi dari asset
    if (asset.provinsi_id) {
      setEditSelectedProvince(asset.provinsi_id);

      if (asset.kota_id) {
        setEditSelectedCity(asset.kota_id);

        const cities = kotaData[asset.provinsi_id];
        const selectedCityData = cities?.find((c) => c.id === asset.kota_id);

        if (selectedCityData) {
          setEditCityBounds(selectedCityData.bounds);
          console.log("Edit city bounds set:", selectedCityData.bounds);
        }
      }
    } else {
      setEditSelectedProvince("");
      setEditSelectedCity("");
      setEditCityBounds(null);
    }
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingAsset(null);
    setIsEditingLocation(false);
    setEditedLocationData(null);
    setEditSelectedProvince("");
    setEditSelectedCity("");
    setEditCityBounds(null);
  }, []);

  const handleEditLocationChange = useCallback((province, city) => {
    setEditSelectedProvince(province);
    setEditSelectedCity(city);

    if (province && city) {
      const cities = kotaData[province];
      const selectedCityData = cities?.find((c) => c.id === city);

      if (selectedCityData) {
        setEditCityBounds(selectedCityData.bounds);

        toast.success(
          `Lokasi ${selectedCityData.name} dipilih untuk edit! Peta akan auto-zoom.`,
          { duration: 3000 }
        );
      }
    } else {
      setEditCityBounds(null);
    }
  }, []);

  const handleEditLocation = useCallback(() => {
    console.log("Starting location edit for yardip asset:", editingAsset);
    setIsEditingLocation(true);
    setEditedLocationData(null);
  }, [editingAsset]);

  const handleCancelEditLocation = useCallback(() => {
    setIsEditingLocation(false);
    setEditedLocationData(null);
  }, []);

  const handleLocationDrawingCreated = useCallback((data) => {
    console.log("New location data created for yardip:", data);
    setEditedLocationData(data);
    setIsEditingLocation(false);

    toast.success(
      "Lokasi baru berhasil digambar! Klik 'Simpan Perubahan' untuk menyimpan."
    );
  }, []);

  // Enhanced Save handler dengan penanganan error yang lebih baik
  const handleSaveAsset = useCallback(
    async (updatedData) => {
      if (!editingAsset) {
        toast.error("Tidak ada aset yang sedang diedit");
        return;
      }

      // Validasi data yang lebih ketat
      if (!updatedData.pengelola || !updatedData.bidang) {
        toast.error("Pengelola dan Bidang harus diisi");
        return;
      }

      console.log("Saving yardip asset with ID:", editingAsset.id);

      const selectedCityData = kotaData[editSelectedProvince]?.find(
        (c) => c.id === editSelectedCity
      );

      const finalData = {
        ...editingAsset, // Keep all original data first
        ...updatedData, // Then override with updated data
        // Ensure ID is preserved
        id: editingAsset.id,
        // Update timestamp
        updated_at: new Date().toISOString(),
        // Update location if edited
        ...(editedLocationData && {
          lokasi: editedLocationData.geometry || editedLocationData.coordinates,
          area: editedLocationData.area,
        }),
        // Update province/city if selected
        ...(editSelectedProvince &&
          editSelectedCity && {
            provinsi_id: editSelectedProvince,
            kota_id: editSelectedCity,
            provinsi:
              editSelectedProvince === "jateng"
                ? "Jawa Tengah"
                : "DI Yogyakarta",
            kota: selectedCityData ? selectedCityData.name : "",
          }),
      };

      console.log("Saving yardip asset with data:", finalData);

      const toastId = toast.loading("Menyimpan perubahan...");
      try {
        // URL endpoint yang benar untuk JSON Server
        const updateUrl = `${API_URL}/yardip_assets/${editingAsset.id}`;
        console.log("Update URL:", updateUrl);

        // Gunakan axios.put dengan timeout yang lebih panjang
        const response = await axios.put(updateUrl, finalData, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout for updates
        });

        console.log("Update response:", {
          status: response.status,
          statusText: response.statusText,
          data: response.data ? "Data received" : "No data",
        });

        // Verifikasi response sukses
        if (response.status >= 200 && response.status < 300) {
          // Use response data if available, otherwise use finalData
          const updatedAsset = response.data || finalData;

          // Update state dengan data terbaru
          setAssets((prevAssets) =>
            prevAssets.map((a) =>
              String(a.id) === String(editingAsset.id) ? updatedAsset : a
            )
          );

          // Update filtered assets juga
          setFilteredAssets((prevFiltered) =>
            prevFiltered.map((a) =>
              String(a.id) === String(editingAsset.id) ? updatedAsset : a
            )
          );

          toast.success("Aset yardip berhasil diperbarui!", { id: toastId });

          // Reset semua editing state
          setEditingAsset(null);
          setIsEditingLocation(false);
          setEditedLocationData(null);
          setEditSelectedProvince("");
          setEditSelectedCity("");
          setEditCityBounds(null);

          // Optional: Refresh data to ensure consistency
          setTimeout(async () => {
            console.log("Post-update data refresh...");
            await fetchData();
          }, 2000);
        } else {
          throw new Error(`Unexpected response status: ${response.status}`);
        }
      } catch (err) {
        console.error("Save error:", err);

        // Pesan error yang lebih spesifik
        let errorMessage = "Gagal menyimpan perubahan.";
        let shouldRefresh = false;

        if (err.code === "ECONNABORTED") {
          errorMessage = "Request timeout. Periksa koneksi internet Anda.";
          shouldRefresh = true;
        } else if (err.response) {
          const status = err.response.status;
          const statusText = err.response.statusText;

          switch (status) {
            case 404:
              errorMessage = `Aset yardip dengan ID ${editingAsset.id} tidak ditemukan di server.`;
              shouldRefresh = true;
              break;
            case 400:
              errorMessage =
                "Data yang dikirim tidak valid. Periksa form input.";
              break;
            case 403:
              errorMessage = "Tidak memiliki izin untuk mengubah aset ini.";
              break;
            case 422:
              errorMessage = "Data tidak dapat diproses. Periksa format input.";
              break;
            case 500:
              errorMessage = "Server error. Coba lagi beberapa saat.";
              shouldRefresh = true;
              break;
            default:
              errorMessage = `Error ${status}: ${statusText}`;
              shouldRefresh = true;
          }
        } else if (err.request) {
          errorMessage =
            "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
          shouldRefresh = true;
        }

        toast.error(errorMessage, { id: toastId });

        // Refresh data jika perlu
        if (shouldRefresh) {
          setTimeout(async () => {
            try {
              await fetchData();
              toast.info("Data telah disegarkan dari server.");
            } catch (refreshErr) {
              console.error("Failed to refresh data:", refreshErr);
              toast.error("Gagal menyegarkan data dari server.");
            }
          }, 3000);
        }
      }
    },
    [
      editingAsset,
      editSelectedProvince,
      editSelectedCity,
      editedLocationData,
      fetchData,
    ]
  );

  const handleViewDetail = useCallback((asset) => {
    console.log("Yardip Asset data for detail:", asset);
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedAssetDetail(null);
  }, []);

  // Validasi lokasi - menggunakan useCallback
  const validateAndParseLocation = useCallback((locationData) => {
    console.log("Validating yardip location data:", locationData);

    if (!locationData) {
      console.log("No location data provided");
      return null;
    }

    let lokasi = locationData;

    if (typeof lokasi === "string") {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        console.error("Failed to parse location JSON:", e);
        return null;
      }
    }

    if (Array.isArray(lokasi)) {
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        typeof lokasi[0][0] === "number"
      ) {
        return [lokasi];
      }
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        Array.isArray(lokasi[0][0])
      ) {
        return lokasi;
      }
    }

    if (lokasi.type === "Polygon" && lokasi.coordinates) {
      return lokasi.coordinates;
    }

    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }

    console.warn("Unrecognized yardip location format:", lokasi);
    return null;
  }, []);

  // Prepare asset untuk peta utama dengan PIN MARKERS - menggunakan useMemo
  const preparedAssetsForMainMap = useMemo(() => {
    return filteredAssets
      .map((asset) => {
        const validatedLocation = validateAndParseLocation(asset.lokasi);

        if (!validatedLocation) return null;

        return {
          id: asset.id,
          nama: asset.pengelola || "Unknown",
          kodim: asset.bidang || "",
          lokasi: validatedLocation,
          luas: Number(asset.area) || 0,
          status: asset.status || "",
          kabkota: asset.kabkota || "",
          kecamatan: asset.kecamatan || "",
          kelurahan: asset.kelurahan || "",
          type: "yardip",
          originalAsset: asset, // Keep reference
        };
      })
      .filter(Boolean);
  }, [filteredAssets, validateAndParseLocation]);

  // Prepare current asset for map display during editing - menggunakan useMemo
  const preparedEditAssetForMap = useMemo(() => {
    if (!editingAsset) {
      console.log("No editing yardip asset available");
      return [];
    }

    console.log("Preparing edit yardip asset for map:", editingAsset);

    const validatedLocation = validateAndParseLocation(editingAsset.lokasi);

    if (!validatedLocation) {
      console.log("No valid location found for editing yardip asset");
      return [];
    }

    const assetForMap = {
      id: editingAsset.id,
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

    console.log("Yardip asset prepared for map:", assetForMap);
    return [assetForMap];
  }, [editingAsset, validateAndParseLocation]);

  // Error boundary handlers
  const handleMapError = useCallback(() => {
    console.warn("Map error occurred, resetting map state");
    setMapKey(Date.now());
  }, []);

  const handleFallbackMode = useCallback(() => {
    toast.info("Beralih ke mode tanpa peta. Tabel data tetap dapat digunakan.");
  }, []);

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Yardip</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Jika tidak sedang edit, tampilkan konten utama */}
      {!editingAsset && (
        <Row>
          <Col md={12}>
            {/* PETA UTAMA - DENGAN PIN MARKERS */}
            <Card className="mb-4">
              <Card.Header as="h5">
                <div className="d-flex justify-content-between align-items-center">
                  <span>Peta Aset Yardip</span>
                  <small className="text-muted">
                    <i className="fas fa-map-marker-alt me-1"></i>
                    Tampilan Pin Marker - Klik untuk detail
                  </small>
                </div>
              </Card.Header>
              <Card.Body style={{ height: "50vh", padding: 0 }}>
                <MapErrorBoundary
                  height="50vh"
                  onRetry={handleMapError}
                  onFallback={handleFallbackMode}
                >
                  <PetaAsetYardip
                    key={`main-map-${mapKey}`}
                    assets={preparedAssetsForMainMap}
                    onAssetClick={handleMarkerClick}
                    zoomToAsset={zoomToAsset}
                    markerColorMode="status"
                    displayMode="marker" // PIN MARKERS UNTUK PETA UTAMA
                    jatengBoundary={jatengBoundary}
                    diyBoundary={diyBoundary}
                  />
                </MapErrorBoundary>
              </Card.Body>
              <Card.Footer className="bg-light">
                <Row className="text-center">
                  <Col xs={6} sm={4}>
                    <div className="d-flex align-items-center justify-content-center">
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: "#10b981",
                          borderRadius: "50%",
                          marginRight: "8px",
                        }}
                      ></div>
                      <small>Dimiliki/Dikuasai</small>
                    </div>
                  </Col>
                  <Col xs={6} sm={4}>
                    <div className="d-flex align-items-center justify-content-center">
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: "#ef4444",
                          borderRadius: "50%",
                          marginRight: "8px",
                        }}
                      ></div>
                      <small>Tidak Dimiliki</small>
                    </div>
                  </Col>
                  <Col xs={12} sm={4}>
                    <div className="d-flex align-items-center justify-content-center">
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: "#f59e0b",
                          borderRadius: "50%",
                          marginRight: "8px",
                        }}
                      ></div>
                      <small>Lain-lain</small>
                    </div>
                  </Col>
                </Row>
              </Card.Footer>
            </Card>

            {/* FILTER PANEL */}
            <FilterPanelTop
              assets={assets}
              provinsiOptions={provinsiOptions}
              kotaOptions={kotaOptions}
              selectedProvinsi={selectedProvinsi}
              selectedKota={selectedKota}
              onSelectProvinsi={handleProvinsiChange}
              onSelectKota={handleKotaChange}
              onShowAll={handleShowAll}
              totalAssets={assets.length}
              filteredAssets={filteredAssets.length}
            />

            {/* TABEL DATA - FIXED HORIZONTAL SCROLL */}
            <Card>
              <Card.Header className="bg-light">
                <h5 className="mb-0">Daftar Aset Yardip</h5>
              </Card.Header>
              <Card.Body className="p-0">
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
                  <div
                    style={{
                      height: "60vh",
                      overflow: "auto",
                      border: "1px solid #dee2e6",
                      borderRadius: "0.375rem",
                    }}
                  >
                    <TabelAsetYardip
                      assets={filteredAssets}
                      onEdit={user ? handleEditAsset : null}
                      onDelete={user ? handleDeleteAsset : null}
                      onViewDetail={handleViewDetail}
                    />
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* SUMMARY STATISTICS */}
            {filteredAssets.length > 0 && (
              <Card className="mt-3">
                <Card.Body>
                  <Row className="text-center g-3">
                    <Col lg className="col-6 col-md-3">
                      <div className="bg-light p-3 rounded h-100">
                        <h4 className="text-primary mb-1">
                          {filteredAssets.length}
                        </h4>
                        <small className="text-muted fw-bold">Total Aset</small>
                      </div>
                    </Col>
                    <Col lg className="col-6 col-md-3">
                      <div className="bg-light p-3 rounded h-100">
                        <h4 className="text-success mb-1">
                          {
                            filteredAssets.filter(
                              (a) => a.status === "Dimiliki/Dikuasai"
                            ).length
                          }
                        </h4>
                        <small className="text-muted fw-bold">
                          Dimiliki/Dikuasai
                        </small>
                      </div>
                    </Col>
                    <Col lg className="col-6 col-md-3">
                      <div className="bg-light p-3 rounded h-100">
                        <h4 className="text-danger mb-1">
                          {
                            filteredAssets.filter(
                              (a) =>
                                a.status === "Tidak Dimiliki/Tidak Dikuasai"
                            ).length
                          }
                        </h4>
                        <small className="text-muted fw-bold">
                          Tidak Dimiliki
                        </small>
                      </div>
                    </Col>
                    <Col lg className="col-6 col-md-3">
                      <div className="bg-light p-3 rounded h-100">
                        <h4 className="text-warning mb-1">
                          {
                            filteredAssets.filter(
                              (a) => a.status === "Lain-lain"
                            ).length
                          }
                        </h4>
                        <small className="text-muted fw-bold">Lain-lain</small>
                      </div>
                    </Col>
                  </Row>

                  {/* Additional location breakdown */}
                  {(selectedProvinsi || selectedKota) && (
                    <Row className="mt-3">
                      <Col md={12}>
                        <div className="bg-light p-2 rounded">
                          <small className="text-muted">
                            <strong>Filter Aktif:</strong>
                            {selectedProvinsi && (
                              <span className="badge bg-primary ms-1 me-1">
                                Provinsi: {selectedProvinsi}
                              </span>
                            )}
                            {selectedKota && (
                              <span className="badge bg-secondary ms-1">
                                Kota: {selectedKota}
                              </span>
                            )}
                          </small>
                        </div>
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* FORM EDIT menggunakan komponen EditYardip */}
      {editingAsset && !isEditingLocation && (
        <Row>
          <Col md={12}>
            <EditYardip
              editingAsset={editingAsset}
              editedLocationData={editedLocationData}
              editSelectedProvince={editSelectedProvince}
              editSelectedCity={editSelectedCity}
              kotaData={kotaData}
              onSave={handleSaveAsset}
              onCancel={handleCancelEdit}
              onLocationChange={handleEditLocationChange}
              onEditLocation={handleEditLocation}
              onCancelEditLocation={handleCancelEditLocation}
              isEditingLocation={isEditingLocation}
            />
          </Col>
        </Row>
      )}

      {/* PETA EDIT menggunakan komponen EditYardipLocation */}
      {editingAsset && isEditingLocation && (
        <Row>
          <Col md={12}>
            <EditYardipLocation
              editingAsset={editingAsset}
              isEditingLocation={isEditingLocation}
              onDrawingCreated={handleLocationDrawingCreated}
              onCancelEditLocation={handleCancelEditLocation}
              editCityBounds={editCityBounds}
              editSelectedCity={editSelectedCity}
              editSelectedProvince={editSelectedProvince}
              kotaData={kotaData}
              jatengBoundary={jatengBoundary}
              diyBoundary={diyBoundary}
              prepareEditAssetForMap={preparedEditAssetForMap}
              editedLocationData={editedLocationData}
            />
          </Col>
        </Row>
      )}

      {/* MODAL DETAIL ASET */}
      <DetailModalYardip
        asset={selectedAssetDetail}
        show={showDetailModal}
        onHide={handleCloseDetailModal}
      />

      {/* OFFCANVAS DETAIL ASET YARDIP */}
      <DetailOffcanvasYardip
        show={showOffcanvas}
        handleClose={handleCloseOffcanvas}
        asetYardip={assetForOffcanvas}
      />
    </Container>
  );
};

export default DataAsetYardipPage;
