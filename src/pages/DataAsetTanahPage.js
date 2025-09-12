import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { OverlayTrigger, Tooltip, Modal, Image } from "react-bootstrap";
import {
  FaInfoCircle,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload,
  FaImage,
} from "react-icons/fa"; // contoh pakai react-icons
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
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import FormAset from "../components/FormAset";
import PetaAset from "../components/PetaAset";
import DetailOffcanvasAset from "../components/DetailOffcanvasAset"; // IMPORT
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// Helper function untuk memperbaiki path gambar
const getImageUrl = (asset) => {
  if (!asset) return null;

  // Cek berbagai field yang mungkin menyimpan URL gambar
  let imageUrl =
    asset.bukti_pemilikan_url ||
    asset.bukti_pemilikan ||
    asset.bukti_kepemilikan_url ||
    asset.bukti_kepemilikan;

  if (!imageUrl) return null;

  // Jika sudah URL lengkap (http/https), return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // Jika path relatif, gabungkan dengan API_URL
  if (imageUrl.startsWith("/")) {
    return `${API_URL}${imageUrl}`;
  }

  // Jika tidak ada slash di awal, tambahkan
  return `${API_URL}/${imageUrl}`;
};

// Helper function untuk cek apakah file gambar atau PDF
const isImageFile = (filename) => {
  if (!filename) return false;
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

// Helper function untuk cek apakah file PDF
const isPdfFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".pdf");
};

// Helper function untuk mendapatkan badge class berdasarkan status
const getStatusBadgeClass = (status) => {
  switch (status) {
    case "Dimiliki/Dikuasai":
      return "bg-success";
    case "Tidak Dimiliki/Tidak Dikuasai":
      return "bg-danger";
    case "Lain-lain":
      return "bg-warning text-dark";
    default:
      return "bg-light text-dark";
  }
};

// Enhanced table component with more columns and FIXED image preview
const TabelAset = ({
  assets,
  onEdit,
  onDelete,
  onViewDetail,
  koremList,
  allKodimList,
}) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Tidak ada data aset yang ditemukan.</p>
      </div>
    );
  }

  // Helper function untuk mendapatkan nama kodim
  const getKodimName = (asset) => {
    if (!asset.kodim) return "-";
    const assetKodimIdentifier = String(asset.kodim).trim();
    const kodim = allKodimList.find(
      (k) => k.id === assetKodimIdentifier || k.nama === assetKodimIdentifier
    );
    return kodim ? kodim.nama : asset.kodim_nama || asset.kodim || "-";
  };

  // Helper function: tampilkan luas lebih jelas
  const renderLuas = (asset) => {
    const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
    const belumSertifikatLuas = parseFloat(asset.belum_sertifikat_luas) || 0;
    const petaLuas = parseFloat(asset.luas) || 0;

    const items = [];

    if (sertifikatLuas > 0) {
      items.push(
        <div key="sertifikat" className="text-success">
          {sertifikatLuas.toLocaleString("id-ID")} m²{" "}
          <small>(Sertifikat)</small>
        </div>
      );
    }

    if (belumSertifikatLuas > 0) {
      items.push(
        <div key="belum" className="text-warning">
          {belumSertifikatLuas.toLocaleString("id-ID")} m²{" "}
          <small>(Belum Sertifikat)</small>
        </div>
      );
    }

    if (petaLuas > 0 && items.length === 0) {
      items.push(
        <div key="peta" className="text-muted">
          {petaLuas.toLocaleString("id-ID")} m² <small>(Peta)</small>
        </div>
      );
    }

    return items.length > 0 ? items : "-";
  };

  return (
    <Table striped bordered hover responsive>
      <thead className="table-dark">
        <tr>
          <th style={{ width: "10%" }}>NUP</th>
          <th style={{ width: "12%" }}>Wilayah Korem</th>
          <th style={{ width: "12%" }}>Wilayah Kodim</th>
          <th style={{ width: "18%" }}>Alamat</th>
          <th style={{ width: "10%" }}>Peruntukan</th>
          <th style={{ width: "8%" }}>Status</th>
          <th style={{ width: "10%" }}>Luas</th>
          <th style={{ width: "8%" }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => {
          const korem = koremList.find((k) => k.id == asset.korem_id);
          const kodimName = getKodimName(asset);

          return (
            <tr key={asset.id}>
              <td>{asset.nama || "-"}</td>
              <td>{korem?.nama || "-"}</td>
              <td>{kodimName}</td>
              <td>
                <div style={{ maxWidth: "150px", fontSize: "0.9em" }}>
                  {asset.alamat
                    ? asset.alamat.length > 40
                      ? asset.alamat.substring(0, 40) + "..."
                      : asset.alamat
                    : "-"}
                </div>
              </td>
              <td>{asset.peruntukan || asset.fungsi || "-"}</td>
              <td>
                <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                  {asset.status || "-"}
                </span>
              </td>
              <td>{renderLuas(asset)}</td>
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
          );
        })}
      </tbody>
    </Table>
  );
};

// Enhanced filter component at the top
const FilterPanelTop = ({
  koremList,
  kodimList,
  allKodimList,
  selectedKorem,
  selectedKodim,
  statusFilter,
  onSelectKorem,
  onSelectKodim,
  onSelectStatus,
  onShowAll,
  totalAssets,
  filteredAssets,
}) => {
  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "Dimiliki/Dikuasai", label: "Dimiliki/Dikuasai" },
    {
      value: "Tidak Dimiliki/Tidak Dikuasai",
      label: "Tidak Dimiliki/Tidak Dikuasai",
    },
    { value: "Lain-lain", label: "Lain-lain" },
  ];

  const filteredKodimForFilter = selectedKorem ? kodimList : allKodimList;

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Filter Data Aset</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={3}>
            <div className="mb-3">
              <label className="form-label fw-bold">Wilayah Korem</label>
              <select
                className="form-select"
                value={selectedKorem?.id || ""}
                onChange={(e) => {
                  const korem = koremList.find((k) => k.id == e.target.value);
                  onSelectKorem(korem || null);
                }}
              >
                <option value="">Semua Korem</option>
                {koremList.map((korem) => (
                  <option key={korem.id} value={korem.id}>
                    {korem.nama}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3">
              <label className="form-label fw-bold">Wilayah Kodim</label>
              <select
                className="form-select"
                value={selectedKodim || ""}
                onChange={(e) => onSelectKodim(e.target.value)}
              >
                <option value="">Semua Kodim</option>
                {filteredKodimForFilter.map((kodim) => (
                  <option key={kodim.id} value={kodim.nama}>
                    {kodim.nama}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={3}>
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
          <Col md={3}>
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
                {selectedKorem && (
                  <span>
                    {" "}
                    • <strong>Korem:</strong> {selectedKorem.nama}
                  </span>
                )}
                {selectedKodim && (
                  <span>
                    {" "}
                    • <strong>Kodim:</strong> {selectedKodim}
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

// Enhanced Modal Detail Component with Map for Assets
const DetailModalAset = ({ asset, show, onHide, koremList, allKodimList }) => {
  if (!asset) return null;

  // Validasi dan sanitasi data lokasi untuk Asset
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
      nama: asset.nama || "Unknown",
      kodim: asset.kodim || "",
      lokasi: validatedLocation,
      luas: Number(asset.luas) || 0,
      status: asset.status || "",
      alamat: asset.alamat || "",
      peruntukan: asset.peruntukan || asset.fungsi || "",
      keterangan: asset.keterangan || "",
      type: "aset",
    };
  };

  const assetForMap = prepareAssetForMap(asset);

  const korem = koremList.find((k) => k.id == asset.korem_id);
  const kodim = allKodimList.find(
    (k) => k.id === asset.kodim || k.nama === asset.kodim
  );

  const imageUrl = getImageUrl(asset);
  const filename =
    asset.bukti_pemilikan_filename ||
    asset.bukti_kepemilikan_filename ||
    "File";
  const hasValidImage = imageUrl && isImageFile(filename);
  const hasPdf = imageUrl && isPdfFile(filename);

  // Helper function to determine which area to display based on certificate status
  const renderLuasInfo = (asset) => {
    const hasSertifikat = asset.pemilikan_sertifikat === "Ya";
    const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
    const belumSertifikatLuas = parseFloat(asset.belum_sertifikat_luas) || 0;
    const petaLuas = parseFloat(asset.luas) || 0;

    if (hasSertifikat && sertifikatLuas > 0) {
      return {
        label: "Luas Bersertifikat",
        value: `${sertifikatLuas.toLocaleString("id-ID")} m²`,
        className: "text-success",
      };
    } else if (!hasSertifikat && belumSertifikatLuas > 0) {
      return {
        label: "Luas Tidak Bersertifikat",
        value: `${belumSertifikatLuas.toLocaleString("id-ID")} m²`,
        className: "text-warning",
      };
    } else if (petaLuas > 0) {
      return {
        label: "Luas",
        value: `${petaLuas.toLocaleString("id-ID")} m²`,
        className: "text-muted",
      };
    }

    return {
      label: "Luas",
      value: "-",
      className: "text-muted",
    };
  };

  const luasInfo = renderLuasInfo(asset);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Detail Aset Tanah - {asset.nama || "Unknown"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          {/* Detail Informasi */}
          <Col md={6}>
            <div className="card h-100">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Informasi Aset Tanah</h5>
              </div>
              <div className="card-body">
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <td>
                        <strong>NUP:</strong>
                      </td>
                      <td>{asset.nama || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Wilayah Korem:</strong>
                      </td>
                      <td>{korem?.nama || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Wilayah Kodim:</strong>
                      </td>
                      <td>{kodim?.nama || asset.kodim || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Alamat:</strong>
                      </td>
                      <td>{asset.alamat || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Peruntukan:</strong>
                      </td>
                      <td>{asset.peruntukan || asset.fungsi || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Status:</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${getStatusBadgeClass(
                            asset.status
                          )}`}
                        >
                          {asset.status || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>KIB/Kode Barang:</strong>
                      </td>
                      <td>
                        {asset.kib_kode_barang || asset.kode_barang || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Nomor Registrasi:</strong>
                      </td>
                      <td>
                        {asset.nomor_registrasi || asset.no_registrasi || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Asal Milik:</strong>
                      </td>
                      <td>{asset.asal_milik || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>{luasInfo.label}:</strong>
                      </td>
                      <td>
                        <span className={luasInfo.className}>
                          {luasInfo.value}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Bukti Pemilikan:</strong>
                      </td>
                      <td>
                        {imageUrl ? (
                          <div className="d-flex align-items-center gap-2">
                            {hasValidImage && (
                              <div
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  cursor: "pointer",
                                }}
                                onClick={() => window.open(imageUrl, "_blank")}
                                title="Klik untuk lihat gambar penuh"
                              >
                                <img
                                  src={imageUrl}
                                  alt="Preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                            )}
                            {hasPdf && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => window.open(imageUrl, "_blank")}
                                title="Lihat PDF"
                              >
                                Lihat PDF
                              </Button>
                            )}
                            <div>
                              <div>{filename}</div>
                              <small className="text-muted">
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() =>
                                    window.open(imageUrl, "_blank")
                                  }
                                  className="p-0"
                                >
                                  Buka File
                                </Button>
                              </small>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">Tidak ada file</span>
                        )}
                      </td>
                    </tr>
                    {hasValidImage && (
                      <tr>
                        <td>
                          <strong>Foto Aset:</strong>
                        </td>
                        <td>
                          <Image
                            src={imageUrl}
                            alt="Foto Aset"
                            fluid
                            rounded
                            style={{ maxHeight: "300px", cursor: "pointer" }}
                            onClick={() => window.open(imageUrl, "_blank")}
                          />
                        </td>
                      </tr>
                    )}
                    {asset.keterangan_bukti_pemilikan && (
                      <tr>
                        <td>
                          <strong>Keterangan Bukti Pemilikan:</strong>
                        </td>
                        <td>{asset.keterangan_bukti_pemilikan}</td>
                      </tr>
                    )}
                    {asset.atas_nama_pemilik_sertifikat && (
                      <tr>
                        <td>
                          <strong>Atas Nama Pemilik Sertifikat:</strong>
                        </td>
                        <td>{asset.atas_nama_pemilik_sertifikat}</td>
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
                    <PetaAset
                      assets={[assetForMap]}
                      isDrawing={false}
                      onDrawingCreated={() => {}}
                      jatengBoundary={jatengBoundary}
                      diyBoundary={diyBoundary}
                      fitBounds={true}
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
                      <strong>Status Sertifikat:</strong>
                      <br />
                      <span
                        className={`text-muted ${
                          asset.pemilikan_sertifikat === "Ya"
                            ? "text-success"
                            : "text-warning"
                        }`}
                      >
                        {asset.pemilikan_sertifikat === "Ya"
                          ? "Bersertifikat"
                          : "Tidak Bersertifikat"}
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

const DataAsetTanahPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [koremList, setKoremList] = useState([]);
  const [kodimList, setKodimList] = useState([]);
  const [allKodimList, setAllKodimList] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedKorem, setSelectedKorem] = useState(null);
  const [selectedKodim, setSelectedKodim] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [kodimLoading, setKodimLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

  // State untuk Peta dan Offcanvas baru
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [assetForOffcanvas, setAssetForOffcanvas] = useState(null);
  const [zoomToAsset, setZoomToAsset] = useState(null);

  // Handler untuk Peta baru
  const handleMarkerClick = (asset) => {
    setAssetForOffcanvas(asset);
    setShowOffcanvas(true);
    setZoomToAsset(asset);
  };

  const handleCloseOffcanvas = () => {
    setShowOffcanvas(false);
    setAssetForOffcanvas(null);
    setZoomToAsset(null); // Reset zoom state
  };

  const fetchKodim = useCallback(
    (koremId) => {
      if (!koremId) {
        setKodimList([]);
        return;
      }
      setKodimLoading(true);
      try {
        const selectedKoremData = koremList.find((k) => k.id === koremId);
        if (selectedKoremData && selectedKoremData.kodim) {
          const kodimObjects = selectedKoremData.kodim.map((kName) => ({
            id: kName,
            nama: kName,
          }));
          setKodimList(kodimObjects);
        } else {
          setKodimList([]);
        }
        setSelectedKodim("");
        setError(null);
      } catch (err) {
        console.error("Error fetching Kodim:", err);
        setKodimList([]);
      } finally {
        setKodimLoading(false);
      }
    },
    [koremList]
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assetsRes = await axios.get(`${API_URL}/assets`);
        const koremRes = await axios.get(`${API_URL}/korem`);
        setAssets(assetsRes.data);
        setKoremList(koremRes.data);
        const allKodims = koremRes.data.flatMap((korem) =>
          korem.kodim.map((k) => ({ id: k, nama: k, korem_id: korem.id }))
        );
        setAllKodimList(allKodims);
        setError(null);
      } catch (err) {
        setError(
          "Gagal memuat data dari server. Pastikan server API berjalan."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = assets;

    if (selectedKorem) {
      filtered = filtered.filter((asset) => asset.korem_id == selectedKorem.id);
    }

    if (selectedKodim) {
      filtered = filtered.filter((asset) => {
        const assetKodim = String(asset.kodim || "").trim();
        const filterKodim = String(selectedKodim || "").trim();
        return assetKodim === filterKodim;
      });
    }

    if (statusFilter) {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    setFilteredAssets(filtered);
  }, [selectedKorem, selectedKodim, statusFilter, assets]);

  const handleKoremChange = (korem) => {
    setSelectedKorem(korem || null);
    setSelectedKodim("");
    if (korem) {
      fetchKodim(korem.id);
    } else {
      setKodimList([]);
    }
  };

  const handleKodimChange = (kodimName) => {
    setSelectedKodim(kodimName || "");
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status || "");
  };

  const handleShowAll = () => {
    setSelectedKorem(null);
    setSelectedKodim("");
    setStatusFilter("");
    setKodimList([]);
    setZoomToAsset(null); // Reset zoom on main map
  };

  const handleViewDetail = (asset) => {
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAssetDetail(null);
  };

  const handleEditAsset = (asset) => {
    navigate(`/edit-aset/${asset.id}`);
  };

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
          await axios.delete(`${API_URL}/assets/${id}`);
          setAssets(assets.filter((a) => a.id !== id));
          toast.success("Aset berhasil dihapus.", { id: toastId });
        } catch (err) {
          toast.error("Gagal menghapus aset.", { id: toastId });
          console.error("Gagal menghapus aset", err);
          setError("Gagal menghapus aset.");
        }
      }
    });
  };

  

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Tanah</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={12}>
          {/* PETA BARU */}
          <Card className="mb-4">
            <Card.Header as="h5">Peta Aset Tanah</Card.Header>
            <Card.Body style={{ height: "50vh", padding: 0 }}>
              <PetaAset
                assets={filteredAssets}
                onAssetClick={handleMarkerClick}
                zoomToAsset={zoomToAsset}
                markerColorMode="certificate"
              />
            </Card.Body>
          </Card>

          <FilterPanelTop
            koremList={koremList}
            kodimList={kodimList}
            allKodimList={allKodimList}
            selectedKorem={selectedKorem}
            selectedKodim={selectedKodim}
            statusFilter={statusFilter}
            onSelectKorem={handleKoremChange}
            onSelectKodim={handleKodimChange}
            onSelectStatus={handleStatusChange}
            onShowAll={handleShowAll}
            totalAssets={assets.length}
            filteredAssets={filteredAssets.length}
          />

          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">Daftar Aset Tanah</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                {assets.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="text-muted">
                      <i className="fas fa-folder-open fa-3x mb-3"></i>
                      <h5>Belum Ada Data Aset Tanah</h5>
                      <p>
                        Silakan tambah aset tanah baru di halaman Tambah Aset
                        Tanah.
                      </p>
                    </div>
                  </div>
                ) : (
                  <TabelAset
                    assets={filteredAssets}
                    onEdit={user ? handleEditAsset : null}
                    onDelete={user ? handleDeleteAsset : null}
                    onViewDetail={handleViewDetail}
                    koremList={koremList}
                    allKodimList={allKodimList}
                  />
                )}
              </div>
            </Card.Body>
          </Card>

          {filteredAssets.length > 0 && (
            <Card className="mt-3">
              <Card.Body>
                <Row className="text-center">
                  <Col md={3}>
                    <div className="border-end">
                      <h5 className="text-primary">{filteredAssets.length}</h5>
                      <small className="text-muted">Total Aset</small>
                    </div>
                  </Col>
                  <Col md={3}>
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
                  <Col md={3}>
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
                  <Col md={3}>
                    <h5 className="text-warning">
                      {
                        filteredAssets.filter((a) => a.status === "Lain-lain")
                          .length
                      }
                    </h5>
                    <small className="text-muted">Lain-lain</small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>

        

        
      </Row>

      <DetailModalAset
        asset={selectedAssetDetail}
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        koremList={koremList}
        allKodimList={allKodimList}
      />

      {/* CANVAS BARU */}
      {/* CANVAS BARU */}
      <DetailOffcanvasAset
        show={showOffcanvas}
        handleClose={handleCloseOffcanvas}
        aset={assetForOffcanvas}
        koremList={koremList}
        allKodimList={allKodimList}
      />
    </Container>
  );
};

export default DataAsetTanahPage;
