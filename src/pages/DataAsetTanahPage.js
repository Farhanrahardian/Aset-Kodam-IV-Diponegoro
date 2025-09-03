import React, { useState, useEffect, useCallback } from "react";
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
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// Static kodim data sesuai dengan FormAset.js
const staticKodimData = [
  { id: "0701", nama: "Kodim 0701/Banyumas", korem_id: 1 },
  { id: "0729", nama: "Kodim 0729/Bantul", korem_id: 2 },
  { id: "0732", nama: "Kodim 0732/Sleman", korem_id: 2 },
  { id: "0733", nama: "Kodim 0733/Kota Semarang", korem_id: 5 },
  { id: "0725", nama: "Kodim 0725/Sragen", korem_id: 4 },
  { id: "0734", nama: "Kodim 0734/Yogyakarta", korem_id: 2 },
  { id: "0702", nama: "Kodim 0702/Purbalingga", korem_id: 1 },
  { id: "0703", nama: "Kodim 0703/Cilacap", korem_id: 1 },
];

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

// Enhanced table component with more columns and FIXED image preview
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

  // Helper function untuk mendapatkan nama kodim
  const getKodimName = (asset) => {
    // Cari di static kodim data berdasarkan ID kodim
    const kodimFromStatic = staticKodimData.find((k) => k.id === asset.kodim);
    if (kodimFromStatic) {
      return kodimFromStatic.nama;
    }

    // Fallback ke kodim dari props jika tidak ditemukan di static
    const kodimFromProps = kodimList.find((k) => k.id === asset.kodim);
    if (kodimFromProps) {
      return kodimFromProps.nama;
    }

    // Jika masih tidak ditemukan, return kodim ID atau field nama lainnya
    return asset.kodim_nama || asset.kodim || "-";
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

  // Helper function: tampilkan preview bukti pemilikan dengan proper URL handling
  const renderBuktiPemilikan = (asset) => {
    const imageUrl = getImageUrl(asset);
    const filename =
      asset.bukti_pemilikan_filename ||
      asset.bukti_kepemilikan_filename ||
      "File";

    if (!imageUrl && !filename) {
      return <span className="text-muted">-</span>;
    }

    const hasValidImage = imageUrl && isImageFile(filename);
    const hasPdf = imageUrl && isPdfFile(filename);

    return (
      <div className="d-flex align-items-center gap-2">
        {hasValidImage && (
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              overflow: "hidden",
              cursor: "pointer",
            }}
            onClick={() => onViewDetail(asset)}
            title="Klik untuk lihat detail"
          >
            <img
              src={imageUrl}
              alt="Preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                console.error("Image load error:", imageUrl);
                e.target.style.display = "none";
                e.target.parentNode.innerHTML =
                  '<span class="text-muted small">Error</span>';
              }}
            />
          </div>
        )}
        {hasPdf && (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onViewDetail(asset)}
            title="Lihat PDF"
          >
            PDF
          </Button>
        )}
        <small className="text-truncate" style={{ maxWidth: "80px" }}>
          {filename}
        </small>
      </div>
    );
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

  // Filter kodim berdasarkan korem yang dipilih
  const filteredKodimForFilter = selectedKorem
    ? staticKodimData.filter((k) => k.korem_id === parseInt(selectedKorem.id))
    : staticKodimData;

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
                {filteredKodimForFilter.map((kodim) => (
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
                {selectedKodim && (
                  <span>
                    {" "}
                    • <strong>Kodim:</strong>{" "}
                    {staticKodimData.find((k) => k.id === selectedKodim)
                      ?.nama || selectedKodim}
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
const DetailModalAset = ({ asset, show, onHide, koremList, kodimList }) => {
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

  // Cari kodim menggunakan static data yang sama dengan FormAset
  const kodim =
    staticKodimData.find((k) => k.id === asset.kodim) ||
    kodimList.find((k) => k.id === asset.kodim);

  const imageUrl = getImageUrl(asset);
  const filename =
    asset.bukti_pemilikan_filename ||
    asset.bukti_kepemilikan_filename ||
    "File";
  const hasValidImage = imageUrl && isImageFile(filename);
  const hasPdf = imageUrl && isPdfFile(filename);

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
                        <strong>Luas Sertifikat:</strong>
                      </td>
                      <td>
                        {asset.sertifikat_luas
                          ? `${parseFloat(asset.sertifikat_luas).toLocaleString(
                              "id-ID"
                            )} m²`
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
                    {/* Tambahan keterangan bukti pemilikan */}
                    {asset.keterangan_bukti_pemilikan && (
                      <tr>
                        <td>
                          <strong>Keterangan Bukti Pemilikan:</strong>
                        </td>
                        <td>{asset.keterangan_bukti_pemilikan}</td>
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
                        {asset.luas
                          ? `${Number(asset.luas).toFixed(2)} m²`
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

  // Fetch all Kodim data for detail view - gunakan static data
  const fetchAllKodim = useCallback(async () => {
    try {
      // Coba fetch dari API, tapi fallback ke static data
      try {
        const kodimRes = await axios.get(`${API_URL}/kodim`);
        setAllKodimList(kodimRes.data || staticKodimData);
      } catch (err) {
        console.warn("Failed to fetch kodim from API, using static data:", err);
        setAllKodimList(staticKodimData);
      }
    } catch (err) {
      console.error("Error in fetchAllKodim:", err);
      setAllKodimList(staticKodimData);
    }
  }, []);

  // Fetch Kodim data based on selected Korem - gunakan static data yang sudah difilter
  const fetchKodim = useCallback(async (koremId) => {
    if (!koremId) {
      setKodimList([]);
      return;
    }

    setKodimLoading(true);
    console.log(`Filtering Kodim for Korem ID: ${koremId}`);

    try {
      // Filter static kodim data berdasarkan korem_id
      const filteredKodim = staticKodimData.filter(
        (kodim) => kodim.korem_id === parseInt(koremId)
      );

      console.log(
        `Found ${filteredKodim.length} kodim for korem ${koremId}:`,
        filteredKodim
      );

      setKodimList(filteredKodim);
      setSelectedKodim(""); // Reset selection when korem changes
      setError(null);
    } catch (err) {
      console.error("Error filtering Kodim:", err);
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

  // Enhanced filtering with status and kodim - FIXED VERSION menggunakan asset.kodim
  useEffect(() => {
    let filtered = assets;

    console.log("🔎 Starting filter process:", {
      totalAssets: assets.length,
      selectedKorem: selectedKorem?.id || null,
      selectedKodim,
      statusFilter,
    });

    // 1. Filter by Korem
    if (selectedKorem) {
      filtered = filtered.filter((asset) => asset.korem_id == selectedKorem.id);
      console.log(`📌 After Korem filter: ${filtered.length} assets`);

      // load Kodim jika Korem dipilih tapi belum ada list
      if (!kodimList.length) {
        fetchKodim(selectedKorem.id);
      }
    }

    // 2. Filter by Kodim - PERBAIKAN UTAMA menggunakan asset.kodim
    if (selectedKodim) {
      console.log("🏗️ Kodim filtering:", {
        selectedKodim,
        selectedKodimType: typeof selectedKodim,
        assetsBeforeFilter: filtered.length,
        sampleAssetKodim:
          filtered.length > 0
            ? {
                kodim: filtered[0].kodim,
                kodimType: typeof filtered[0].kodim,
              }
            : null,
      });

      filtered = filtered.filter((asset) => {
        // Gunakan asset.kodim untuk filtering (sesuai dengan FormAset.js)
        const assetKodim = String(asset.kodim || "").trim();
        const filterKodim = String(selectedKodim || "").trim();

        console.log(
          `Comparing: asset.kodim="${assetKodim}" vs selectedKodim="${filterKodim}"`
        );

        return assetKodim === filterKodim;
      });

      console.log(`📌 After Kodim filter: ${filtered.length} assets`);
    }

    // 3. Filter by Status
    if (statusFilter) {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
      console.log(`📌 After Status filter: ${filtered.length} assets`);
    }

    console.log("✅ Final filtered assets:", filtered.length);
    setFilteredAssets(filtered);
  }, [
    selectedKorem,
    selectedKodim,
    statusFilter,
    assets,
    kodimList.length,
    fetchKodim,
  ]);

  // Handle filter changes
  const handleKoremChange = (korem) => {
    setSelectedKorem(korem || null);
    setSelectedKodim(null); // reset ke null, bukan string ""
    if (korem) {
      fetchKodim(korem.id);
    } else {
      setKodimList([]);
    }
  };

  // Perbaikan handler untuk Kodim change
  const handleKodimChange = (kodimId) => {
    console.log("🔄 Kodim changed to:", kodimId, typeof kodimId);
    setSelectedKodim(kodimId || null);
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status || "");
  };

  const handleShowAll = () => {
    setSelectedKorem(null);
    setSelectedKodim(null);
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
      // Get the selected kodim ID for saving (gunakan ID, bukan nama)
      const kodimId = selectedKodim || editingAsset.kodim;

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
        kodim: kodimId, // Simpan sebagai kodim ID (sesuai dengan FormAset.js)
        kodim_id: kodimId, // Compatibility dengan field lama
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
    setSelectedKodim(asset.kodim || ""); // Gunakan asset.kodim
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

  if (loading) return <Spinner animation="border" variant="primary" />;

  // Main table view with new layout following Yardip structure
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
            <br />- Static Kodim Data: {staticKodimData.length} items
            <br />- Show Detail Modal: {showDetailModal ? "Yes" : "No"}
            <br />- Editing Asset: {editingAsset ? editingAsset.nama : "No"}
            <br />- Is Editing Location: {isEditingLocation ? "Yes" : "No"}
            <br />- Edited Location Data:{" "}
            {editedLocationData ? "Available" : "None"}
            {editingAsset && (
              <>
                <br />- Edit Asset ID: {editingAsset.id}
                <br />- Edit Asset kodim field: {editingAsset.kodim || "None"}
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
                    <h5 className="text-danger">
                      {
                        filteredAssets.filter((a) => a.status === "Sengketa")
                          .length
                      }
                    </h5>
                    <small className="text-muted">Sengketa</small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Form Edit - Pindah ke bawah dengan layout yang lebih baik */}
        {editingAsset && (
          <Col md={12} className="mt-4">
            <div className="card shadow-sm">
              <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                <span>Edit Aset Tanah - {editingAsset.nama}</span>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={handleEditLocation}
                    disabled={isEditingLocation}
                  >
                    {isEditingLocation
                      ? "Sedang Edit Lokasi..."
                      : "Edit Lokasi"}
                  </Button>
                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    ✕
                  </Button>
                </div>
              </div>
              <div className="card-body">
                <Row>
                  <Col md={6}>
                    <FormAset
                      onSave={handleSaveAsset}
                      onCancel={handleCancelEdit}
                      koremList={koremList}
                      kodimList={kodimList}
                      selectedKorem={selectedKorem?.id || ""}
                      selectedKodim={selectedKodim}
                      assetToEdit={editingAsset}
                      isEnabled={true}
                      viewMode={false}
                      initialGeometry={
                        editedLocationData ? editedLocationData.geometry : null
                      }
                      initialArea={
                        editedLocationData ? editedLocationData.area : null
                      }
                    />

                    {/* Status edit lokasi */}
                    {editedLocationData && (
                      <div className="alert alert-success mt-2">
                        <small>
                          <i className="fas fa-map-marked-alt me-1"></i>
                          <strong>Lokasi baru telah digambar!</strong>
                          <br />
                          Luas: {editedLocationData.area?.toFixed(2)} m²
                          <br />
                          <button
                            className="btn btn-link btn-sm p-0 text-decoration-none"
                            onClick={handleCancelEditLocation}
                          >
                            <i className="fas fa-undo me-1"></i>
                            Batalkan perubahan lokasi
                          </button>
                        </small>
                      </div>
                    )}

                    {/* Informasi editing */}
                    <div className="alert alert-info mt-2">
                      <small>
                        <i className="fas fa-info-circle me-1"></i>
                        <strong>Tips Editing:</strong>
                        <br />
                        • Gunakan tombol "Edit Lokasi" untuk mengubah area di
                        peta
                        <br />
                        • Semua perubahan akan disimpan setelah klik "Simpan"
                        <br />• Data asli tetap aman sampai Anda menyimpan
                        perubahan
                      </small>
                    </div>
                  </Col>
                  <Col md={6}>
                    {/* Preview area atau informasi tambahan */}
                    <div className="bg-light p-3 rounded">
                      <h6 className="text-muted mb-3">Preview Data</h6>
                      <small>
                        <strong>NUP:</strong> {editingAsset.nama}
                        <br />
                        <strong>Status Saat Ini:</strong>{" "}
                        <span
                          className={`badge ${
                            editingAsset.status === "Aktif"
                              ? "bg-success"
                              : editingAsset.status === "Tidak Aktif"
                              ? "bg-secondary"
                              : editingAsset.status === "Dalam Proses"
                              ? "bg-warning"
                              : editingAsset.status === "Sengketa"
                              ? "bg-danger"
                              : "bg-light text-dark"
                          }`}
                        >
                          {editingAsset.status}
                        </span>
                        <br />
                        <strong>Alamat:</strong> {editingAsset.alamat || "-"}
                        <br />
                        <strong>Peruntukan:</strong>{" "}
                        {editingAsset.peruntukan || editingAsset.fungsi || "-"}
                        <br />
                        <strong>Kodim:</strong>{" "}
                        {staticKodimData.find(
                          (k) => k.id === editingAsset.kodim
                        )?.nama ||
                          editingAsset.kodim ||
                          "-"}
                        <br />
                        {editingAsset.luas && (
                          <>
                            <strong>Luas Peta:</strong>{" "}
                            {Number(editingAsset.luas).toLocaleString("id-ID")}{" "}
                            m²
                            <br />
                          </>
                        )}
                        {editingAsset.sertifikat_luas && (
                          <>
                            <strong>Luas Sertifikat:</strong>{" "}
                            {Number(
                              editingAsset.sertifikat_luas
                            ).toLocaleString("id-ID")}{" "}
                            m²
                            <br />
                          </>
                        )}
                        {editingAsset.belum_sertifikat_luas && (
                          <>
                            <strong>Luas Belum Sertifikat:</strong>{" "}
                            {Number(
                              editingAsset.belum_sertifikat_luas
                            ).toLocaleString("id-ID")}{" "}
                            m²
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
              <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">
                    Edit Lokasi Aset Tanah - {editingAsset.nama}
                  </h6>
                  <small>Gambar ulang polygon untuk lokasi aset ini</small>
                </div>
                <div className="d-flex gap-2">
                  {editedLocationData && (
                    <span className="badge bg-success">
                      <i className="fas fa-check me-1"></i>
                      Lokasi Baru Siap
                    </span>
                  )}
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={handleCancelEditLocation}
                  >
                    <i className="fas fa-times me-1"></i>
                    Selesai Edit Lokasi
                  </Button>
                </div>
              </div>
              <div className="card-body p-2">
                <div style={{ height: "60vh", width: "100%" }}>
                  {/* Map container with proper key to force re-render */}
                  <div
                    key={`map-edit-${editingAsset.id}-${isEditingLocation}`}
                    className="position-relative w-100 h-100"
                  >
                    <PetaAset
                      key={`peta-${editingAsset.id}-${Date.now()}`} // Force re-render
                      assets={prepareEditAssetForMap()} // Tampilkan asset yang sedang diedit
                      isDrawing={true} // Enable drawing mode
                      onDrawingCreated={handleLocationDrawingCreated}
                      jatengBoundary={jatengBoundary}
                      diyBoundary={diyBoundary}
                      fitBounds={true} // Auto fit ke lokasi existing
                      selectedKorem={selectedKorem?.id}
                      selectedKodim={selectedKodim}
                      drawingMode="polygon" // Explicitly set polygon mode
                      editMode={true} // Flag untuk edit mode
                      allowEdit={true} // Allow editing
                      showDrawingTools={true} // Show drawing tools
                    />
                  </div>
                </div>
                <div className="mt-2 p-2 bg-light rounded">
                  <Row>
                    <Col md={8}>
                      <small className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        <strong>Instruksi:</strong>
                        {prepareEditAssetForMap().length > 0
                          ? "Polygon hijau menunjukkan lokasi saat ini. Gambar polygon baru untuk mengubah lokasi aset."
                          : "Belum ada lokasi sebelumnya. Gambar polygon baru untuk menentukan lokasi aset."}
                      </small>
                    </Col>
                    <Col md={4} className="text-end">
                      {editedLocationData ? (
                        <small className="text-success">
                          <i className="fas fa-check-circle me-1"></i>
                          Luas baru: {editedLocationData.area?.toFixed(2)} m²
                        </small>
                      ) : (
                        <small className="text-warning">
                          <i className="fas fa-draw-polygon me-1"></i>
                          Belum ada polygon baru
                        </small>
                      )}
                    </Col>
                  </Row>

                  {/* Drawing Instructions Panel */}
                  <Row className="mt-2">
                    <Col md={12}>
                      <div className="alert alert-info py-2 mb-0">
                        <small>
                          <strong>Cara Menggambar Polygon:</strong>
                          <br />
                          1. Klik pada peta untuk memulai menggambar
                          <br />
                          2. Klik beberapa titik untuk membuat bentuk polygon
                          <br />
                          3. Klik pada titik pertama atau double-click untuk
                          menyelesaikan
                          <br />
                          4. Polygon akan otomatis tersimpan dan luas akan
                          dihitung
                        </small>
                      </div>
                    </Col>
                  </Row>

                  {/* Real-time Map Debug Info - Development Only */}
                  {process.env.NODE_ENV === "development" && (
                    <Row className="mt-2">
                      <Col md={12}>
                        <div className="alert alert-secondary py-2 mb-0">
                          <small>
                            <strong>Map Debug Info:</strong>
                            <br />- Map Key: peta-{editingAsset.id}-{Date.now()}
                            <br />- Assets for Map:{" "}
                            {prepareEditAssetForMap().length} items
                            <br />- Is Drawing Mode:{" "}
                            {isEditingLocation ? "Active" : "Inactive"}
                            <br />- Drawing Callback:{" "}
                            {typeof handleLocationDrawingCreated === "function"
                              ? "Available"
                              : "Missing"}
                            <br />- Boundaries: Jateng=
                            {jatengBoundary ? "Loaded" : "Missing"}, DIY=
                            {diyBoundary ? "Loaded" : "Missing"}
                            {prepareEditAssetForMap().map((asset, idx) => (
                              <div key={idx}>
                                - Asset {idx + 1}: {asset.nama} (lokasi:{" "}
                                {asset.lokasi ? "Available" : "None"})
                              </div>
                            ))}
                          </small>
                        </div>
                      </Col>
                    </Row>
                  )}
                </div>
              </div>
            </div>
          </Col>
        )}
      </Row>

      {/* Enhanced Modal Detail Aset with Map */}
      <DetailModalAset
        asset={selectedAssetDetail}
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        koremList={koremList}
        kodimList={allKodimList}
      />
    </Container>
  );
};

export default DataAsetTanahPage;
