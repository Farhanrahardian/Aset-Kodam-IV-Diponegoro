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

// Enhanced filter panel
const FilterPanelTop = ({
  assets,
  bidangOptions,
  selectedBidang,
  statusFilter,
  onSelectBidang,
  onSelectStatus,
  onShowAll,
  totalAssets,
  filteredAssets,
}) => {
  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "Dimiliki/Dikuasai", label: "Dimiliki/Dikuasai" },
    { value: "Tidak Dimiliki/Tidak Dikuasai", label: "Tidak Dimiliki/Tidak Dikuasai" },
    { value: "Lain-lain", label: "Lain-lain" },
    { value: "Dalam Proses", label: "Dalam Proses" },
  ];

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Filter Data Aset Yardip</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label fw-bold">Bidang</label>
              <select
                className="form-select"
                value={selectedBidang}
                onChange={(e) => onSelectBidang(e.target.value)}
              >
                <option value="">Semua Bidang</option>
                {bidangOptions.map((bidang) => (
                  <option key={bidang} value={bidang}>
                    {bidang}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label fw-bold">Status</label>
              <select
                className="form-select"
                value={statusFilter || ""}
                onChange={(e) => onSelectStatus(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                <strong>Hasil:</strong> {filteredAssets} dari {totalAssets} aset yardip
                {selectedBidang && (
                  <span>
                    {" "}
                    • <strong>Bidang:</strong> {selectedBidang}
                  </span>
                )}
                {statusFilter && (
                  <span>
                    {" "}
                    • <strong>Status:</strong> {statusFilter}
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

// Enhanced table component untuk yardip
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
        return "bg-warning text-dark";
      case "Dalam Proses":
        return "bg-info";
      default:
        return "bg-secondary";
    }
  };

  return (
    <Table striped bordered hover responsive>
      <thead className="table-dark">
        <tr>
          <th style={{ width: "12%" }}>ID</th>
          <th style={{ width: "18%" }}>Pengelola</th>
          <th style={{ width: "12%" }}>Bidang</th>
          <th style={{ width: "20%" }}>Lokasi</th>
          <th style={{ width: "10%" }}>Status</th>
          <th style={{ width: "10%" }}>Luas</th>
          <th style={{ width: "18%" }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.id || "-"}</td>
            <td>{asset.pengelola || "-"}</td>
            <td>
              <span className="badge bg-info">{asset.bidang || "-"}</span>
            </td>
            <td>
              <div style={{ maxWidth: "150px", fontSize: "0.9em" }}>
                <strong>{asset.kabkota || "-"}</strong>
                <br />
                <small className="text-muted">
                  {asset.kecamatan || "-"}, {asset.kelurahan || "-"}
                </small>
              </div>
            </td>
            <td>
              <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                {asset.status || "-"}
              </span>
            </td>
            <td>
              {asset.area ? (
                <span className="text-muted">
                  {Number(asset.area).toLocaleString("id-ID")} m²
                </span>
              ) : (
                "-"
              )}
            </td>
            <td>
              <div className="d-flex gap-1 flex-wrap">
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
                      <td><strong>ID:</strong></td>
                      <td>{asset.id || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Pengelola:</strong></td>
                      <td>{asset.pengelola || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Bidang:</strong></td>
                      <td>
                        <span className="badge bg-info">
                          {asset.bidang || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Kabupaten/Kota:</strong></td>
                      <td>{asset.kabkota || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Kecamatan:</strong></td>
                      <td>{asset.kecamatan || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Kelurahan/Desa:</strong></td>
                      <td>{asset.kelurahan || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Peruntukan:</strong></td>
                      <td>{asset.peruntukan || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td>
                        <span className={`badge ${
                          asset.status === "Dimiliki/Dikuasai"
                            ? "bg-success"
                            : asset.status === "Tidak Dimiliki/Tidak Dikuasai"
                            ? "bg-danger"
                            : asset.status === "Lain-lain"
                            ? "bg-warning"
                            : asset.status === "Dalam Proses"
                            ? "bg-info"
                            : "bg-secondary"
                        }`}>
                          {asset.status || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Keterangan:</strong></td>
                      <td>{asset.keterangan || "-"}</td>
                    </tr>
                    {asset.area && (
                      <tr>
                        <td><strong>Luas Area:</strong></td>
                        <td>{Number(asset.area).toLocaleString("id-ID")} m²</td>
                      </tr>
                    )}
                    <tr>
                      <td><strong>Tanggal Dibuat:</strong></td>
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
                        key={`detail-${asset.id}-${asset.updated_at || Date.now()}`}
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
                        {Array.isArray(validatedLocation) && validatedLocation[0]
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
  const [selectedBidang, setSelectedBidang] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
    console.log('Yardip marker clicked:', asset);
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
    
    return () => {
      // Cleanup function
      setAssets([]);
      setFilteredAssets([]);
      setEditingAsset(null);
      setZoomToAsset(null);
    };
  }, [fetchData]);

  // Filter berdasarkan bidang dan status - menggunakan useMemo untuk optimasi
  const processedAssets = useMemo(() => {
    let filtered = assets;

    if (selectedBidang) {
      filtered = filtered.filter((asset) => asset.bidang === selectedBidang);
    }

    if (statusFilter) {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    return filtered;
  }, [assets, selectedBidang, statusFilter]);

  useEffect(() => {
    setFilteredAssets(processedAssets);
  }, [processedAssets]);

  // Get unique bidang options from assets - menggunakan useMemo
  const bidangOptions = useMemo(() => {
    return [...new Set(assets.map((asset) => asset.bidang).filter(Boolean))];
  }, [assets]);

  // Handler functions - menggunakan useCallback untuk optimasi
  const handleBidangChange = useCallback((bidang) => {
    setSelectedBidang(bidang || "");
  }, []);

  const handleStatusChange = useCallback((status) => {
    setStatusFilter(status || "");
  }, []);

  const handleShowAll = useCallback(() => {
    setSelectedBidang("");
    setStatusFilter("");
    setZoomToAsset(null);
  }, []);

  const handleDeleteAsset = useCallback(async (id) => {
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const toastId = toast.loading("Menghapus aset...");
      try {
        await axios.delete(`${API_URL}/yardip_assets/${id}`);
        setAssets(prevAssets => prevAssets.filter((a) => a.id !== id));
        toast.success("Aset berhasil dihapus.", { id: toastId });
      } catch (err) {
        toast.error("Gagal menghapus aset.", { id: toastId });
        console.error(err);
      }
    }
  }, []);

  const handleEditAsset = useCallback((asset) => {
    console.log("Starting edit for asset:", asset);
    setEditingAsset(asset);
    setIsEditingLocation(false);
    setEditedLocationData(null);
    
    // Inisialisasi lokasi dari asset
    if (asset.provinsi_id) {
      setEditSelectedProvince(asset.provinsi_id);
      
      if (asset.kota_id) {
        setEditSelectedCity(asset.kota_id);
        
        const cities = kotaData[asset.provinsi_id];
        const selectedCityData = cities?.find(c => c.id === asset.kota_id);
        
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
    console.log("Starting location edit for asset:", editingAsset);
    setIsEditingLocation(true);
    setEditedLocationData(null);
  }, [editingAsset]);

  const handleCancelEditLocation = useCallback(() => {
    setIsEditingLocation(false);
    setEditedLocationData(null);
  }, []);

  const handleLocationDrawingCreated = useCallback((data) => {
    console.log("New location data created:", data);
    setEditedLocationData(data);
    setIsEditingLocation(false);

    toast.success(
      "Lokasi baru berhasil digambar! Klik 'Simpan Perubahan' untuk menyimpan."
    );
  }, []);

  const handleSaveAsset = useCallback(async (updatedData) => {
    if (!editingAsset) return;

    const selectedCityData = kotaData[editSelectedProvince]?.find(
      (c) => c.id === editSelectedCity
    );

    const finalData = {
      ...updatedData,
      ...(editedLocationData && {
        lokasi: editedLocationData.geometry || editedLocationData.coordinates,
        area: editedLocationData.area,
      }),
      ...(editSelectedProvince && editSelectedCity && {
        provinsi_id: editSelectedProvince,
        kota_id: editSelectedCity,
        provinsi: editSelectedProvince === "jateng" ? "Jawa Tengah" : "DI Yogyakarta",
        kota: selectedCityData ? selectedCityData.name : "",
      }),
    };

    console.log("Saving asset with data:", finalData);

    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      const response = await axios.put(
        `${API_URL}/yardip_assets/${editingAsset.id}`,
        finalData
      );

      setAssets(prevAssets =>
        prevAssets.map((a) => (a.id === editingAsset.id ? response.data : a))
      );

      toast.success("Aset berhasil diperbarui!", { id: toastId });

      // Reset semua editing state
      setEditingAsset(null);
      setIsEditingLocation(false);
      setEditedLocationData(null);
      setEditSelectedProvince("");
      setEditSelectedCity("");
      setEditCityBounds(null);
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error("Save error:", err);
    }
  }, [editingAsset, editSelectedProvince, editSelectedCity, editedLocationData]);

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
    console.log("Validating location data:", locationData);

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

    console.warn("Unrecognized location format:", lokasi);
    return null;
  }, []);

  // Prepare asset untuk peta utama dengan PIN MARKERS - menggunakan useMemo
  const preparedAssetsForMainMap = useMemo(() => {
    return filteredAssets
      .map((asset) => {
        const validatedLocation = validateAndParseLocation(asset.lokasi);
        
        if (!validatedLocation) return null;

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
          type: "yardip",
          originalAsset: asset, // Keep reference to original asset
        };
      })
      .filter(Boolean);
  }, [filteredAssets, validateAndParseLocation]);

  // Prepare current asset for map display during editing - menggunakan useMemo
  const preparedEditAssetForMap = useMemo(() => {
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
  }, [editingAsset, validateAndParseLocation]);

  // Error boundary handlers
  const handleMapError = useCallback(() => {
    console.warn('Map error occurred, resetting map state');
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
                  <Col xs={6} sm={3}>
                    <div className="d-flex align-items-center justify-content-center">
                      <div style={{
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#10b981', 
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}></div>
                      <small>Dimiliki/Dikuasai</small>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="d-flex align-items-center justify-content-center">
                      <div style={{
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#ef4444', 
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}></div>
                      <small>Tidak Dimiliki</small>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="d-flex align-items-center justify-content-center">
                      <div style={{
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#f59e0b', 
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}></div>
                      <small>Lain-lain</small>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="d-flex align-items-center justify-content-center">
                      <div style={{
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: '#06b6d4', 
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}></div>
                      <small>Dalam Proses</small>
                    </div>
                  </Col>
                </Row>
              </Card.Footer>
            </Card>

            {/* FILTER PANEL */}
            <FilterPanelTop
              assets={assets}
              bidangOptions={bidangOptions}
              selectedBidang={selectedBidang}
              statusFilter={statusFilter}
              onSelectBidang={handleBidangChange}
              onSelectStatus={handleStatusChange}
              onShowAll={handleShowAll}
              totalAssets={assets.length}
              filteredAssets={filteredAssets.length}
            />

            {/* TABEL DATA */}
            <Card>
              <Card.Header className="bg-light">
                <h5 className="mb-0">Daftar Aset Yardip</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  {assets.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="text-muted">
                        <i className="fas fa-folder-open fa-3x mb-3"></i>
                        <h5>Belum Ada Data Aset Yardip</h5>
                        <p>
                          Silakan tambah aset yardip baru di halaman Tambah Aset Yardip.
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
              </Card.Body>
            </Card>

            {/* SUMMARY STATISTICS */}
            {filteredAssets.length > 0 && (
              <Card className="mt-3">
                <Card.Body>
                  <Row className="text-center">
                    <Col md={2}>
                      <div className="border-end">
                        <h5 className="text-primary">{filteredAssets.length}</h5>
                        <small className="text-muted">Total Aset</small>
                      </div>
                    </Col>
                    <Col md={2}>
                      <div className="border-end">
                        <h5 className="text-success">
                          {
                            filteredAssets.filter(
                              (a) => a.status === "Dimiliki/Dikuasai"
                            ).length
                          }
                        </h5>
                        <small className="text-muted">Dimiliki/Dikuasai</small>
                      </div>
                    </Col>
                    <Col md={2}>
                      <div className="border-end">
                        <h5 className="text-danger">
                          {
                            filteredAssets.filter(
                              (a) => a.status === "Tidak Dimiliki/Tidak Dikuasai"
                            ).length
                          }
                        </h5>
                        <small className="text-muted">
                          Tidak Dimiliki/Tidak Dikuasai
                        </small>
                      </div>
                    </Col>
                    <Col md={2}>
                      <div className="border-end">
                        <h5 className="text-warning">
                          {
                            filteredAssets.filter((a) => a.status === "Lain-lain")
                              .length
                          }
                        </h5>
                        <small className="text-muted">Lain-lain</small>
                      </div>
                    </Col>
                    <Col md={2}>
                      <div className="border-end">
                        <h5 className="text-info">
                          {
                            filteredAssets.filter((a) => a.status === "Dalam Proses")
                              .length
                          }
                        </h5>
                        <small className="text-muted">Dalam Proses</small>
                      </div>
                    </Col>
                    <Col md={2}>
                      <h5 className="text-muted">
                        {filteredAssets.reduce((total, a) => total + (Number(a.area) || 0), 0).toLocaleString("id-ID")}
                      </h5>
                      <small className="text-muted">Total Luas (m²)</small>
                    </Col>
                  </Row>
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