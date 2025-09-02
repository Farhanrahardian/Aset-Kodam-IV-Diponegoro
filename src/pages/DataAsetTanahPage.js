import React, { useState, useEffect, useCallback } from "react";
import { OverlayTrigger, Tooltip, Modal, Image } from "react-bootstrap";
import {
  FaInfoCircle,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload,
  FaImage,
} from "react-icons/fa";
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

// Enhanced table component with REMOVED Bukti Pemilikan column
const TabelAset = ({
  assets,
  onEdit,
  onDelete,
  onViewDetail,
  koremList,
  kodimList,
}) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Tidak ada data aset yang ditemukan.</p>
      </div>
    );
  }

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
          <th style={{ width: "15%" }}>NUP</th>
          <th style={{ width: "18%" }}>Wilayah Korem</th>
          <th style={{ width: "18%" }}>Wilayah Kodim</th>
          <th style={{ width: "22%" }}>Alamat</th>
          <th style={{ width: "12%" }}>Peruntukan</th>
          <th style={{ width: "8%" }}>Status</th>
          <th style={{ width: "12%" }}>Luas</th>
          <th style={{ width: "15%" }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => {
          const korem = koremList.find((k) => k.id == asset.korem_id);
          const kodim = kodimList.find(
            (k) =>
              k.id == asset.kodim_id ||
              k.id == asset.kodim ||
              k.id == asset.kodim_id_val ||
              k.nama === asset.kodim
          );

          return (
            <tr key={asset.id}>
              <td>{asset.nama || "-"}</td>
              <td>{korem?.nama || "-"}</td>
              <td>{kodim?.nama || asset.kodim || "-"}</td>
              <td>
                <div style={{ maxWidth: "180px", fontSize: "0.9em" }}>
                  {asset.alamat
                    ? asset.alamat.length > 50
                      ? asset.alamat.substring(0, 50) + "..."
                      : asset.alamat
                    : "-"}
                </div>
              </td>
              <td>{asset.peruntukan || asset.fungsi || "-"}</td>
              <td>
                <span
                  className={`badge ${
                    asset.status === "Aktif"
                      ? "bg-success"
                      : asset.status === "Tidak Aktif"
                      ? "bg-secondary"
                      : asset.status === "Dalam Proses"
                      ? "bg-warning"
                      : asset.status === "Sengketa"
                      ? "bg-danger"
                      : "bg-light text-dark"
                  }`}
                >
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
                    <FaEye className="me-1" />
                    Detail
                  </Button>

                  {onEdit && (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => onEdit(asset)}
                      title="Edit Aset"
                    >
                      <FaEdit className="me-1" />
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
                      <FaTrash className="me-1" />
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
    { value: "Aktif", label: "Aktif" },
    { value: "Tidak Aktif", label: "Tidak Aktif" },
    { value: "Dalam Proses", label: "Dalam Proses" },
    { value: "Sengketa", label: "Sengketa" },
  ];

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
                disabled={!selectedKorem}
              >
                <option value="">
                  {selectedKorem ? "Semua Kodim" : "Pilih Korem dulu"}
                </option>
                {kodimList.map((kodim) => (
                  <option key={kodim.id} value={kodim.id}>
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
                {selectedKodim &&
                  kodimList.find((k) => k.id === selectedKodim) && (
                    <span>
                      {" "}
                      • <strong>Kodim:</strong>{" "}
                      {kodimList.find((k) => k.id === selectedKodim)?.nama}
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

// Enhanced Modal Detail Component with PROPER FILE DISPLAY
const DetailModalAset = ({ asset, show, onHide, koremList, kodimList }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState("");

  if (!asset) return null;

  console.log("Asset data in modal:", asset);
  console.log("Asset lokasi:", asset.lokasi);

  // Validasi dan sanitasi data lokasi untuk Asset
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

    // Handle jika lokasi berupa array koordinat langsung
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
  const kodim = kodimList.find(
    (k) =>
      k.id == asset.kodim_id ||
      k.id == asset.kodim ||
      k.id == asset.kodim_id_val ||
      k.nama === asset.kodim
  );

  // Enhanced file handling functions
  const imageUrl = getImageUrl(asset);
  const filename =
    asset.bukti_pemilikan_filename ||
    asset.bukti_kepemilikan_filename ||
    asset.original_filename ||
    "File Bukti Pemilikan";
  const hasValidImage = imageUrl && isImageFile(filename);
  const hasPdf = imageUrl && isPdfFile(filename);

  // Function to handle image viewing in modal
  const handleViewImage = () => {
    if (hasValidImage) {
      setCurrentImageUrl(imageUrl);
      setShowImageModal(true);
    } else if (hasPdf) {
      window.open(imageUrl, "_blank");
    } else if (imageUrl) {
      // For other file types, try to open in new tab
      window.open(imageUrl, "_blank");
    }
  };

  // Function to handle file download
  const handleDownloadFile = () => {
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Render bukti pemilikan section with proper file handling
  const renderBuktiPemilikan = () => {
    if (!imageUrl) {
      return (
        <div className="text-center py-4">
          <i className="fas fa-file-times fa-3x text-muted mb-3"></i>
          <p className="text-muted">Tidak ada file bukti pemilikan</p>
          <small className="text-muted">
            Silakan upload file melalui form edit aset
          </small>
        </div>
      );
    }

    return (
      <div className="bukti-pemilikan-section">
        <div className="row">
          {/* File Preview */}
          <div className="col-md-4">
            <div className="text-center">
              {hasValidImage && (
                <div
                  className="file-preview-container border rounded p-3"
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    minHeight: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={handleViewImage}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0d6efd";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#dee2e6";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title="Klik untuk melihat gambar penuh"
                >
                  <img
                    src={imageUrl}
                    alt="Preview Bukti Pemilikan"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "180px",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      console.error("Image load error:", imageUrl);
                      e.target.style.display = "none";
                      e.target.parentNode.innerHTML = `
                        <div class="text-muted text-center">
                          <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                          <br>
                          <small>Error loading image</small>
                        </div>
                      `;
                    }}
                  />
                </div>
              )}

              {hasPdf && (
                <div
                  className="pdf-preview-container border rounded p-4 text-center"
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    minHeight: "200px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f8f9fa",
                  }}
                  onClick={handleViewImage}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#dc3545";
                    e.currentTarget.style.backgroundColor = "#fff5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#dee2e6";
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }}
                  title="Klik untuk membuka PDF"
                >
                  <i className="fas fa-file-pdf fa-4x text-danger mb-3"></i>
                  <h6 className="text-dark">PDF Document</h6>
                  <p className="text-muted small mb-0">Klik untuk membuka</p>
                </div>
              )}

              {!hasValidImage && !hasPdf && imageUrl && (
                <div
                  className="file-preview-container border rounded p-4 text-center"
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    minHeight: "200px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f8f9fa",
                  }}
                  onClick={handleViewImage}
                  title="Klik untuk membuka file"
                >
                  <i className="fas fa-file fa-4x text-secondary mb-3"></i>
                  <h6 className="text-dark">File</h6>
                  <p className="text-muted small mb-0">Klik untuk membuka</p>
                </div>
              )}
            </div>
          </div>

          {/* File Information */}
          <div className="col-md-8">
            <div className="file-info">
              <h6 className="mb-3 text-dark">
                <i className="fas fa-paperclip me-2"></i>
                Informasi File
              </h6>

              <table className="table table-borderless table-sm">
                <tbody>
                  <tr>
                    <td style={{ width: "30%" }}>
                      <strong>Nama File:</strong>
                    </td>
                    <td>{filename}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Tipe:</strong>
                    </td>
                    <td>
                      {hasValidImage && (
                        <span className="badge bg-info">
                          <i className="fas fa-image me-1"></i>Gambar
                        </span>
                      )}
                      {hasPdf && (
                        <span className="badge bg-danger">
                          <i className="fas fa-file-pdf me-1"></i>PDF
                        </span>
                      )}
                      {!hasValidImage && !hasPdf && (
                        <span className="badge bg-secondary">
                          <i className="fas fa-file me-1"></i>File
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Status:</strong>
                    </td>
                    <td>
                      <span className="badge bg-success">
                        <i className="fas fa-check me-1"></i>Tersedia
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* File Actions */}
              <div className="file-actions mt-3">
                <div className="d-grid gap-2 d-md-flex">
                  {hasValidImage && (
                    <Button
                      variant="primary"
                      onClick={handleViewImage}
                      className="me-2"
                    >
                      <FaEye className="me-1" />
                      Lihat Gambar
                    </Button>
                  )}

                  {hasPdf && (
                    <Button
                      variant="danger"
                      onClick={handleViewImage}
                      className="me-2"
                    >
                      <i className="fas fa-file-pdf me-1"></i>
                      Buka PDF
                    </Button>
                  )}

                  {!hasValidImage && !hasPdf && imageUrl && (
                    <Button
                      variant="secondary"
                      onClick={handleViewImage}
                      className="me-2"
                    >
                      <i className="fas fa-external-link-alt me-1"></i>
                      Buka File
                    </Button>
                  )}

                  <Button variant="success" onClick={handleDownloadFile}>
                    <FaDownload className="me-1" />
                    Unduh File
                  </Button>
                </div>
              </div>

              {/* Technical Details */}
              <div className="mt-4">
                <details>
                  <summary
                    className="text-muted"
                    style={{ cursor: "pointer", fontSize: "0.9em" }}
                  >
                    <i className="fas fa-info-circle me-1"></i>
                    Detail Teknis
                  </summary>
                  <div className="mt-2 p-2 bg-light rounded">
                    <small className="text-muted d-block">
                      <strong>URL:</strong>{" "}
                      <code
                        className="text-break"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {imageUrl}
                      </code>
                    </small>
                    <small className="text-muted d-block mt-1">
                      <strong>Field Source:</strong>{" "}
                      {asset.bukti_pemilikan_url
                        ? "bukti_pemilikan_url"
                        : asset.bukti_pemilikan
                        ? "bukti_pemilikan"
                        : asset.bukti_kepemilikan_url
                        ? "bukti_kepemilikan_url"
                        : asset.bukti_kepemilikan
                        ? "bukti_kepemilikan"
                        : "unknown"}
                    </small>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-map-marked-alt me-2"></i>
            Detail Aset Tanah - {asset.nama || "Unknown"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            {/* Detail Informasi */}
            <Col md={6}>
              <div className="card h-100">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    Informasi Aset Tanah
                  </h5>
                </div>
                <div className="card-body">
                  <table className="table table-borderless">
                    <tbody>
                      <tr>
                        <td style={{ width: "35%" }}>
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
                            className={`badge ${
                              asset.status === "Aktif"
                                ? "bg-success"
                                : asset.status === "Tidak Aktif"
                                ? "bg-secondary"
                                : asset.status === "Dalam Proses"
                                ? "bg-warning"
                                : asset.status === "Sengketa"
                                ? "bg-danger"
                                : "bg-light text-dark"
                            }`}
                          >
                            {asset.status || "-"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Luas Sertifikat:</strong>
                        </td>
                        <td>
                          {asset.sertifikat_luas
                            ? `${parseFloat(
                                asset.sertifikat_luas
                              ).toLocaleString("id-ID")} m²`
                            : "-"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Luas Belum Sertifikat:</strong>
                        </td>
                        <td>
                          {asset.belum_sertifikat_luas
                            ? `${parseFloat(
                                asset.belum_sertifikat_luas
                              ).toLocaleString("id-ID")} m²`
                            : "-"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Luas Peta:</strong>
                        </td>
                        <td>
                          {asset.luas
                            ? `${parseFloat(asset.luas).toLocaleString(
                                "id-ID"
                              )} m²`
                            : "-"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Keterangan:</strong>
                        </td>
                        <td>{asset.keterangan || "-"}</td>
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
                  <h5 className="mb-0">
                    <i className="fas fa-map me-2"></i>
                    Lokasi di Peta
                  </h5>
                </div>
                <div className="card-body p-0">
                  <div style={{ height: "500px", width: "100%" }}>
                    {hasValidLocation && assetForMap ? (
                      <PetaAset
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

          {/* Bukti Pemilikan Section - Full Width */}
          <Row className="mt-4">
            <Col md={12}>
              <div className="card">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">
                    <FaImage className="me-2" />
                    Bukti Pemilikan
                  </h5>
                </div>
                <div className="card-body">{renderBuktiPemilikan()}</div>
              </div>
            </Col>
          </Row>

          {/* Koordinat Section */}
          <Row className="mt-3">
            <Col md={12}>
              <div className="card">
                <div className="card-header bg-warning text-dark">
                  <h6 className="mb-0">
                    <i className="fas fa-globe me-1"></i>
                    Informasi Geografis
                  </h6>
                </div>
                <div className="card-body">
                  <Row>
                    <Col md={4}>
                      <strong>Koordinat:</strong>
                      <br />
                      {hasValidLocation && validatedLocation ? (
                        <div>
                          <small className="text-success">
                            <i className="fas fa-check-circle me-1"></i>
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
                              <i className="fas fa-eye me-1"></i>
                              Lihat koordinat detail
                            </summary>
                            <div
                              style={{
                                maxHeight: "120px",
                                overflowY: "auto",
                                fontSize: "0.8em",
                                backgroundColor: "#f8f9fa",
                                padding: "8px",
                                borderRadius: "4px",
                                marginTop: "4px",
                                border: "1px solid #dee2e6",
                              }}
                            >
                              {Array.isArray(validatedLocation) &&
                              validatedLocation[0] ? (
                                validatedLocation[0].map((coord, idx) => (
                                  <div key={idx} className="font-monospace">
                                    <i className="fas fa-map-pin me-1 text-danger"></i>
                                    Titik {idx + 1}: [
                                    {coord[0]?.toFixed(6) || "N/A"},{" "}
                                    {coord[1]?.toFixed(6) || "N/A"}]
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted">
                                  <i className="fas fa-exclamation-triangle me-1"></i>
                                  Format koordinat tidak valid
                                </span>
                              )}
                            </div>
                          </details>
                        </div>
                      ) : (
                        <span className="text-muted">
                          <i className="fas fa-times-circle me-1"></i>
                          Tidak tersedia
                        </span>
                      )}
                    </Col>
                    <Col md={4}>
                      <strong>Tipe Geometri:</strong>
                      <br />
                      <span className="text-muted">
                        {hasValidLocation ? (
                          <span>
                            <i className="fas fa-shapes me-1 text-info"></i>
                            Polygon
                          </span>
                        ) : (
                          <span>
                            <i className="fas fa-times me-1"></i>
                            Tidak ada
                          </span>
                        )}
                      </span>
                    </Col>
                    <Col md={4}>
                      <strong>Luas Kalkulasi:</strong>
                      <br />
                      <span className="text-muted">
                        {asset.luas ? (
                          <span>
                            <i className="fas fa-calculator me-1 text-success"></i>
                            {Number(asset.luas).toFixed(2)} m²
                          </span>
                        ) : (
                          <span>
                            <i className="fas fa-times me-1"></i>
                            Tidak tersedia
                          </span>
                        )}
                      </span>
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            <i className="fas fa-times me-1"></i>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Viewing Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-image me-2"></i>
            Bukti Pemilikan - {filename}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {currentImageUrl && (
            <img
              src={currentImageUrl}
              alt="Bukti Pemilikan"
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
              }}
              onError={(e) => {
                console.error("Image load error in modal:", currentImageUrl);
                e.target.style.display = "none";
                e.target.parentNode.innerHTML = `
                  <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Gagal memuat gambar. Silakan coba refresh halaman atau hubungi administrator.
                    <br><br>
                    <small class="text-muted">URL: ${currentImageUrl}</small>
                  </div>
                `;
              }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-success" onClick={handleDownloadFile}>
            <FaDownload className="me-1" />
            Unduh File
          </Button>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            <i className="fas fa-times me-1"></i>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

const DataAsetTanahPage = () => {
  const { user } = useAuth();
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

  const [editingAsset, setEditingAsset] = useState(null);

  // State untuk modal detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

  // State untuk edit mode dengan peta
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocationData, setEditedLocationData] = useState(null);

  // Fetch all Kodim data for detail view
  const fetchAllKodim = useCallback(async () => {
    try {
      const kodimRes = await axios.get(`${API_URL}/kodim`);
      setAllKodimList(kodimRes.data || []);
    } catch (err) {
      console.error("Error fetching all Kodim:", err);
    }
  }, []);

  // Fetch Kodim data based on selected Korem
  const fetchKodim = useCallback(async (koremId) => {
    if (!koremId) {
      setKodimList([]);
      return;
    }

    setKodimLoading(true);
    console.log(`Fetching Kodim for Korem ID: ${koremId}`);

    try {
      let kodimRes;
      let endpointUsed = "";

      // Option 1: Try kodim endpoint with korem filter
      try {
        console.log(`Trying: ${API_URL}/kodim?korem_id=${koremId}`);
        kodimRes = await axios.get(`${API_URL}/kodim?korem_id=${koremId}`);
        endpointUsed = "kodim?korem_id";
        console.log("Success with Option 1:", kodimRes.data);
      } catch (err1) {
        console.log("Option 1 failed:", err1.response?.status, err1.message);

        // Option 2: Try nested endpoint
        try {
          console.log(`Trying: ${API_URL}/korem/${koremId}/kodim`);
          kodimRes = await axios.get(`${API_URL}/korem/${koremId}/kodim`);
          endpointUsed = "korem/id/kodim";
          console.log("Success with Option 2:", kodimRes.data);
        } catch (err2) {
          console.log("Option 2 failed:", err2.response?.status, err2.message);

          // Option 3: Get all kodim and filter
          try {
            console.log(`Trying: ${API_URL}/kodim (all)`);
            kodimRes = await axios.get(`${API_URL}/kodim`);
            kodimRes.data = kodimRes.data.filter(
              (kodim) => kodim.korem_id == koremId || kodim.korem_id === koremId
            );
            endpointUsed = "kodim (filtered)";
            console.log("Success with Option 3:", kodimRes.data);
          } catch (err3) {
            console.log(
              "Option 3 failed:",
              err3.response?.status,
              err3.message
            );

            // Option 4: Mock data as fallback (temporary solution)
            console.log("All endpoints failed, using mock data");
            kodimRes = {
              data: [
                {
                  id: `${koremId}_1`,
                  nama: "Kodim 0701/Banyumas",
                  korem_id: koremId,
                },
                {
                  id: `${koremId}_2`,
                  nama: "Kodim 0702/Purbalingga",
                  korem_id: koremId,
                },
                {
                  id: `${koremId}_3`,
                  nama: "Kodim 0703/Cilacap",
                  korem_id: koremId,
                },
                {
                  id: `${koremId}_4`,
                  nama: "Kodim 0704/Banjarnegara",
                  korem_id: koremId,
                },
                {
                  id: `${koremId}_5`,
                  nama: "Kodim 0705/Magelang",
                  korem_id: koremId,
                },
                {
                  id: `${koremId}_6`,
                  nama: "Kodim 0733/Kota Semarang",
                  korem_id: koremId,
                },
              ],
            };
            endpointUsed = "mock data";
          }
        }
      }

      console.log(`Kodim data loaded using: ${endpointUsed}`, kodimRes.data);
      setKodimList(kodimRes.data || []);
      setSelectedKodim(""); // Reset selection when korem changes
      setError(null);
    } catch (err) {
      const errorMsg = `Gagal memuat data Kodim. ${
        err.response?.status
          ? `Status: ${err.response.status}`
          : "Server tidak merespons"
      }`;
      setError(errorMsg);
      console.error("Error fetching Kodim:", err);
      setKodimList([]);
    } finally {
      setKodimLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const assetsRes = await axios.get(`${API_URL}/assets`);
      const koremRes = await axios.get(`${API_URL}/korem`);
      setAssets(assetsRes.data);
      setKoremList(koremRes.data);
      setError(null);
    } catch (err) {
      setError("Gagal memuat data dari server. Pastikan server API berjalan.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAllKodim();
  }, [fetchData, fetchAllKodim]);

  // Enhanced filtering with status and kodim
  useEffect(() => {
    let filtered = assets;

    // Filter by Korem
    if (selectedKorem) {
      filtered = filtered.filter((a) => a.korem_id == selectedKorem.id);
      if (selectedKorem && !kodimList.length) {
        fetchKodim(selectedKorem.id);
      }
    }

    // Filter by Kodim
    if (selectedKodim) {
      filtered = filtered.filter(
        (a) =>
          a.kodim_id == selectedKodim ||
          a.kodim == selectedKodim ||
          a.kodim_id_val == selectedKodim
      );
    }

    // Filter by Status
    if (statusFilter) {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    setFilteredAssets(filtered);
  }, [
    selectedKorem,
    selectedKodim,
    statusFilter,
    assets,
    fetchKodim,
    kodimList.length,
  ]);

  // Handle filter changes
  const handleKoremChange = (korem) => {
    setSelectedKorem(korem);
    setSelectedKodim(""); // Reset kodim when korem changes
    if (korem) {
      fetchKodim(korem.id);
    } else {
      setKodimList([]);
    }
  };

  const handleKodimChange = (kodimId) => {
    setSelectedKodim(kodimId);
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
  };

  const handleShowAll = () => {
    setSelectedKorem(null);
    setSelectedKodim("");
    setStatusFilter("");
    setKodimList([]);
  };

  // Handle view detail - popup modal
  const handleViewDetail = (asset) => {
    console.log("Asset data for detail:", asset);
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  };

  // Handle close detail modal
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAssetDetail(null);
  };

  const handleSaveAsset = async (assetData) => {
    if (!editingAsset) {
      toast.error("Tidak ada aset yang sedang diedit");
      return;
    }

    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      // Get the selected kodim name for saving
      const selectedKodimObj = kodimList.find((k) => k.id === selectedKodim);
      const kodimName = selectedKodimObj
        ? selectedKodimObj.nama
        : selectedKodim;

      // Handle file upload if there's a new file
      let fileUploadData = {};

      console.log("Checking file upload:", assetData.bukti_pemilikan_file);

      if (
        assetData.bukti_pemilikan_file &&
        assetData.bukti_pemilikan_file instanceof File
      ) {
        const formData = new FormData();
        formData.append("bukti_pemilikan", assetData.bukti_pemilikan_file);

        console.log("Uploading file:", assetData.bukti_pemilikan_file.name);

        try {
          const uploadRes = await axios.post(
            `${API_URL}/upload/bukti-pemilikan`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              timeout: 30000, // 30 seconds timeout
            }
          );

          console.log("Upload response:", uploadRes.data);

          fileUploadData = {
            bukti_pemilikan_url: uploadRes.data.url,
            bukti_pemilikan_filename: uploadRes.data.filename,
          };

          toast.success("File berhasil diupload", { id: toastId });
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
          let errorMsg = "Gagal mengupload file bukti pemilikan";

          if (uploadErr.response) {
            errorMsg += `: ${uploadErr.response.status} - ${
              uploadErr.response.data?.message || uploadErr.response.statusText
            }`;
          } else if (uploadErr.request) {
            errorMsg += ": Tidak ada respons dari server";
          } else {
            errorMsg += `: ${uploadErr.message}`;
          }

          toast.error(errorMsg, { id: toastId });
          return;
        }
      }

      // Gabungkan data form dengan data lokasi yang baru jika ada
      const finalData = {
        ...assetData,
        ...fileUploadData,
        ...(editedLocationData && {
          lokasi: editedLocationData.geometry || editedLocationData.coordinates,
          luas: editedLocationData.area,
        }),
        korem_id: selectedKorem?.id || editingAsset.korem_id,
        kodim_id: selectedKodim || editingAsset.kodim_id || editingAsset.kodim,
        kodim: kodimName || editingAsset.kodim,
      };

      console.log("Saving asset data:", finalData);

      const response = await axios.put(
        `${API_URL}/assets/${editingAsset.id}`,
        finalData,
        {
          timeout: 15000, // 15 seconds timeout
        }
      );

      console.log("Save response:", response.data);

      // Update the assets state and refresh data
      const updatedAssets = assets.map((a) =>
        a.id === editingAsset.id ? response.data : a
      );
      setAssets(updatedAssets);

      // If we're viewing this asset detail, update it too
      if (selectedAssetDetail && selectedAssetDetail.id === editingAsset.id) {
        setSelectedAssetDetail(response.data);
      }

      toast.success("Aset berhasil diperbarui!", { id: toastId });

      // Close editing states
      setEditingAsset(null);
      setIsEditingLocation(false);
      setEditedLocationData(null);
    } catch (err) {
      console.error("Save failed:", err);
      let errorMsg = "Gagal menyimpan perubahan";

      if (err.response) {
        errorMsg += `: ${err.response.status} - ${
          err.response.data?.message || err.response.statusText
        }`;
      } else if (err.request) {
        errorMsg += ": Tidak ada respons dari server";
      } else {
        errorMsg += `: ${err.message}`;
      }

      toast.error(errorMsg, { id: toastId });
      setError(`Gagal menyimpan aset: ${errorMsg}`);
    }
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

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsEditingLocation(false);
    setEditedLocationData(null);

    // Set up korem and kodim for editing
    const korem = koremList.find((k) => k.id == asset.korem_id);
    setSelectedKorem(korem || null);
    setSelectedKodim(asset.kodim_id || asset.kodim || "");
    if (korem) {
      fetchKodim(korem.id);
    }
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setIsEditingLocation(false);
    setEditedLocationData(null);
    // Don't reset filters here
  };

  // Handler untuk edit lokasi
  const handleEditLocation = () => {
    console.log("Starting location edit for asset:", editingAsset);

    if (!editingAsset) {
      toast.error("Tidak ada aset yang dipilih untuk edit lokasi");
      return;
    }

    // Reset any previous location data
    setEditedLocationData(null);
    setIsEditingLocation(true);

    // Show instruction toast
    toast("Mode edit lokasi aktif. Gambar polygon baru di peta.", {
      duration: 3000,
      icon: "📍",
      style: {
        border: "1px solid #3b82f6",
        color: "#3b82f6",
      },
    });

    // Auto scroll to map section after a brief delay
    setTimeout(() => {
      const mapElement = document.querySelector(
        `[key*="map-edit-${editingAsset.id}"]`
      );
      if (mapElement) {
        mapElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 500);
  };

  const handleCancelEditLocation = () => {
    console.log("Cancelling location edit");
    setIsEditingLocation(false);
    setEditedLocationData(null);

    // Ganti toast.info dengan:
    toast("Mode edit lokasi dibatalkan", {
      icon: "↩️",
      style: {
        border: "1px solid #f59e0b",
        color: "#f59e0b",
      },
    });
  };

  const handleLocationDrawingCreated = (data) => {
    console.log("Location drawing created:", data);

    // Validate drawing data
    if (!data) {
      toast.error("Data lokasi tidak valid");
      return;
    }

    // Handle different data formats that might come from PetaAset
    let coordinates = null;
    let area = 0;

    if (data.geometry) {
      // GeoJSON format
      coordinates = data.geometry.coordinates || data.geometry;
      area = data.area || 0;
    } else if (data.coordinates) {
      // Direct coordinates format
      coordinates = data.coordinates;
      area = data.area || 0;
    } else if (Array.isArray(data) && data.length > 0) {
      // Array of coordinates
      coordinates = [data]; // Wrap in array to match polygon format
      area = data.area || 0;
    } else {
      console.error("Unrecognized drawing data format:", data);
      toast.error("Format data gambar tidak dikenali");
      return;
    }

    const locationData = {
      geometry: {
        type: "Polygon",
        coordinates: coordinates,
      },
      coordinates: coordinates,
      area: area,
    };

    console.log("Processed location data:", locationData);

    setEditedLocationData(locationData);
    setIsEditingLocation(false);

    toast.success(`Lokasi berhasil digambar! Luas: ${area.toFixed(2)} m²`);
  };

  // Prepare current asset for map display during editing
  const prepareEditAssetForMap = () => {
    if (!editingAsset) return [];

    console.log("Preparing asset for map editing:", editingAsset);

    const validateLocationData = (asset) => {
      if (!asset.lokasi) {
        console.log("No lokasi data found for editing");
        return null;
      }

      let lokasi = asset.lokasi;

      if (typeof lokasi === "string") {
        try {
          lokasi = JSON.parse(lokasi);
          console.log("Parsed lokasi from string:", lokasi);
        } catch (e) {
          console.error("Failed to parse location JSON:", e);
          return null;
        }
      }

      // Handle asset format - array of coordinates
      if (Array.isArray(lokasi) && lokasi.length > 0) {
        console.log("Location is array format:", lokasi);
        return lokasi;
      }

      // Handle GeoJSON format
      if (lokasi.type === "Polygon" && lokasi.coordinates) {
        console.log("Location is GeoJSON Polygon format:", lokasi.coordinates);
        return lokasi.coordinates;
      }

      // Handle wrapped coordinates
      if (lokasi.coordinates && Array.isArray(lokasi.coordinates)) {
        console.log("Location has coordinates property:", lokasi.coordinates);
        return lokasi.coordinates;
      }

      console.warn("Unrecognized location format for editing:", lokasi);
      return null;
    };

    const validatedLocation = validateLocationData(editingAsset);

    if (!validatedLocation) {
      console.log("No valid location data, returning empty array");
      return [];
    }

    const assetForMap = {
      id: editingAsset.id || `edit-${Date.now()}`,
      nama: editingAsset.nama || "Asset Tanah",
      kodim: editingAsset.kodim || "",
      lokasi: validatedLocation,
      luas: Number(editingAsset.luas) || 0,
      status: editingAsset.status || "",
      alamat: editingAsset.alamat || "",
      peruntukan: editingAsset.peruntukan || editingAsset.fungsi || "",
      type: "aset_tanah", // Specify type for map rendering
      isEditing: true, // Flag to indicate this is being edited
    };

    console.log("Asset prepared for map:", assetForMap);
    return [assetForMap];
  };

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Tanah</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === "development" && (
        <Alert variant="info" className="mb-3">
          <small>
            <strong>Debug Info:</strong>
            <br />- Assets: {assets.length} items
            <br />- Filtered Assets: {filteredAssets.length} items
            <br />- Korem List: {koremList.length} items
            <br />- Selected Korem: {selectedKorem?.nama || "None"}
            <br />- Kodim List: {kodimList.length} items
            <br />- Selected Kodim: {selectedKodim || "None"}
            <br />- Status Filter: {statusFilter || "None"}
            <br />- All Kodim List: {allKodimList.length} items
            <br />- Show Detail Modal: {showDetailModal ? "Yes" : "No"}
            <br />- Editing Asset: {editingAsset ? editingAsset.nama : "No"}
            <br />- Is Editing Location: {isEditingLocation ? "Yes" : "No"}
            <br />- Edited Location Data:{" "}
            {editedLocationData ? "Available" : "None"}
            {editingAsset && (
              <>
                <br />- Edit Asset ID: {editingAsset.id}
                <br />- Edit Asset has lokasi:{" "}
                {editingAsset.lokasi ? "Yes" : "No"}
                <br />- Edit Asset lokasi type:{" "}
                {editingAsset.lokasi ? typeof editingAsset.lokasi : "N/A"}
                <br />- Edit Asset luas: {editingAsset.luas || "None"}
                <br />- Prepared assets for map:{" "}
                {prepareEditAssetForMap().length} items
                <br />- Edit Asset bukti_pemilikan_url:{" "}
                {editingAsset.bukti_pemilikan_url || "None"}
              </>
            )}
            {editedLocationData && (
              <>
                <br />- New Location Area:{" "}
                {editedLocationData.area?.toFixed(2) || "N/A"} m²
                <br />- New Location Coordinates:{" "}
                {editedLocationData.coordinates ? "Available" : "None"}
                <br />- New Location Geometry:{" "}
                {editedLocationData.geometry ? "Available" : "None"}
              </>
            )}
          </small>
        </Alert>
      )}

      <Row>
        {/* Tabel selalu full width, form edit akan muncul di bawah */}
        <Col md={12}>
          {/* Top Filter Panel */}
          <FilterPanelTop
            koremList={koremList}
            kodimList={kodimList}
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

          {/* Enhanced Table */}
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
                    kodimList={allKodimList}
                  />
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Summary Card untuk informasi statistik */}
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
                          filteredAssets.filter((a) => a.status === "Aktif")
                            .length
                        }
                      </h5>
                      <small className="text-muted">Aktif</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="border-end">
                      <h5 className="text-warning">
                        {
                          filteredAssets.filter(
                            (a) => a.status === "Dalam Proses"
                          ).length
                        }
                      </h5>
                      <small className="text-muted">Dalam Proses</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div>
                      <h5 className="text-danger">
                        {
                          filteredAssets.filter((a) => a.status === "Sengketa")
                            .length
                        }
                      </h5>
                      <small className="text-muted">Sengketa</small>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Form Edit - Muncul di bawah tabel jika ada asset yang sedang diedit */}
      {editingAsset && (
        <Row className="mt-4">
          <Col md={12}>
            <Card className="border-warning">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="fas fa-edit me-2"></i>
                  Edit Aset Tanah - {editingAsset.nama}
                  <Button
                    variant="outline-dark"
                    size="sm"
                    className="float-end"
                    onClick={handleCancelEdit}
                  >
                    <i className="fas fa-times me-1"></i>
                    Batal Edit
                  </Button>
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {/* Form Column */}
                  <Col md={6}>
                    <FormAset
                      initialData={editingAsset}
                      onSave={handleSaveAsset}
                      onCancel={handleCancelEdit}
                      koremList={koremList}
                      kodimList={kodimList}
                      selectedKorem={selectedKorem}
                      selectedKodim={selectedKodim}
                      onKoremChange={handleKoremChange}
                      onKodimChange={handleKodimChange}
                      isEditMode={true}
                      editedLocationData={editedLocationData}
                    />
                  </Col>

                  {/* Map Column */}
                  <Col md={6}>
                    <Card>
                      <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                          <i className="fas fa-map me-1"></i>
                          Peta Lokasi
                        </h6>
                        <div>
                          {!isEditingLocation ? (
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={handleEditLocation}
                            >
                              <i className="fas fa-edit me-1"></i>
                              Edit Lokasi
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleCancelEditLocation}
                            >
                              <i className="fas fa-times me-1"></i>
                              Batal Edit Lokasi
                            </Button>
                          )}
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div style={{ height: "500px", width: "100%" }}>
                          <PetaAset
                            key={`map-edit-${editingAsset.id}-${
                              isEditingLocation ? "editing" : "viewing"
                            }`}
                            assets={prepareEditAssetForMap()}
                            isDrawing={isEditingLocation}
                            onDrawingCreated={handleLocationDrawingCreated}
                            jatengBoundary={jatengBoundary}
                            diyBoundary={diyBoundary}
                            fitBounds={!isEditingLocation}
                            showControls={true}
                          />
                        </div>
                      </Card.Body>
                      {isEditingLocation && (
                        <Card.Footer className="bg-warning">
                          <small>
                            <i className="fas fa-info-circle me-1"></i>
                            <strong>Mode Edit Lokasi Aktif:</strong> Klik dan
                            gambar polygon baru di peta untuk mengupdate lokasi
                            aset ini.
                          </small>
                        </Card.Footer>
                      )}
                      {editedLocationData && (
                        <Card.Footer className="bg-success text-white">
                          <small>
                            <i className="fas fa-check me-1"></i>
                            <strong>Lokasi Baru Tersimpan:</strong> Luas{" "}
                            {editedLocationData.area?.toFixed(2)} m². Klik
                            "Simpan" untuk menyimpan perubahan.
                          </small>
                        </Card.Footer>
                      )}
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Detail Modal */}
      {selectedAssetDetail && (
        <DetailModalAset
          asset={selectedAssetDetail}
          show={showDetailModal}
          onHide={handleCloseDetailModal}
          koremList={koremList}
          kodimList={allKodimList}
        />
      )}
    </Container>
  );
};

export default DataAsetTanahPage;
