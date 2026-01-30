import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
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
import * as turf from "@turf/turf";

import { parseLocation, getCentroid } from "../utils/locationUtils";
import { normalizeKodimName } from "../utils/kodimUtils";
import PetaAset from "../components/PetaAset";
import DetailOffcanvasAset from "../components/DetailOffcanvasAset";
import EditAsetModal from "../components/EditAsetModal"; // Import the new modal

const API_URL = "http://localhost:3001";

// Helper functions (getImageUrl, isImageFile, etc.) remain the same...
const getImageUrl = (asset) => {
  if (!asset) return null;
  let imageUrl =
    asset.bukti_pemilikan_url ||
    asset.bukti_pemilikan ||
    asset.bukti_kepemilikan_url ||
    asset.bukti_kepemilikan;
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/")) {
    return `${API_URL}${imageUrl}`;
  }
  return `${API_URL}/${imageUrl}`;
};

const isImageFile = (filename) => {
  if (!filename) return false;
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const isPdfFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".pdf");
};

const isVideoFile = (filename) => {
  if (!filename) return false;
  const videoExtensions = [".mp4", ".mov", ".webm", ".avi"];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "Dimiliki/Dikuasai":
      return "bg-success";
    case "TIdak Dimiliki/Dikuasai":
      return "bg-danger";
    default:
      return "bg-light text-dark";
  }
};

const TabelAset = ({
  assets,
  onEdit,
  onDelete,
  onViewDetail,
  koremList,
  allKodimList,
  userRole,
}) => {
  // Fungsi getKodimName dan renderLuas tetap sama
  const getKodimName = (asset) => {
    const assetKodimIdentifier = String(
      asset.kodim || asset.kodim_id || ""
    ).trim();
    if (!assetKodimIdentifier) return "-";

    const normalizedAssetKodim = normalizeKodimName(assetKodimIdentifier);

    if (
      normalizedAssetKodim === "Kodim 0733/Kota Semarang" ||
      assetKodimIdentifier === "Kodim 0733/Semarang (BS)"
    ) {
      return "Kodim 0733/Kota Semarang";
    }

    const kodim = allKodimList.find(
      (k) =>
        k.id === assetKodimIdentifier ||
        k.nama === assetKodimIdentifier ||
        normalizeKodimName(k.nama) === normalizedAssetKodim
    );
    return kodim ? kodim.nama : asset.kodim_nama || assetKodimIdentifier || "-";
  };

  const renderLuas = (asset) => {
    const totalLuas = parseFloat(asset.luas) || 0;
    return totalLuas > 0 ? totalLuas.toLocaleString("id-ID") + " m²" : "-";
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Tidak ada data aset yang ditemukan.</p>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: "50vh", overflow: "auto" }}>
      <table
        className="table table-striped table-bordered table-hover mb-0"
        style={{ minWidth: "1200px", width: "100%" }}
      >
        <thead
          className="table-dark"
          style={{ position: "sticky", top: 0, zIndex: 1 }}
        >
          <tr>
            <th style={{ minWidth: "120px" }}>NUP</th>
            <th style={{ minWidth: "140px" }}>Wilayah Korem</th>
            <th style={{ minWidth: "140px" }}>Wilayah Kodim</th>
            <th style={{ minWidth: "200px" }}>Alamat</th>
            <th style={{ minWidth: "120px" }}>Peruntukan</th>
            <th style={{ minWidth: "100px" }}>Status</th>
            <th style={{ minWidth: "120px" }}>Luas</th>
            <th style={{ minWidth: "100px" }}>Sertifikat</th>
            <th style={{ minWidth: "100px" }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const korem = koremList.find((k) => k.id == asset.korem_id);
            const kodimName = getKodimName(asset);

            return (
              <tr key={asset.id}>
                <td style={{ minWidth: "120px" }}>{asset.nama || "-"}</td>
                <td style={{ minWidth: "140px" }}>{korem?.nama || "-"}</td>
                <td style={{ minWidth: "140px" }}>{kodimName}</td>
                <td style={{ minWidth: "200px" }}>
                  <div style={{ whiteSpace: "normal" }}>
                    {asset.alamat
                      ? asset.alamat.length > 40
                        ? `${asset.alamat.substring(0, 40)}...`
                        : asset.alamat
                      : "-"}
                  </div>
                </td>
                <td style={{ minWidth: "120px" }}>
                  {asset.peruntukan || asset.fungsi || "-"}
                </td>
                <td style={{ minWidth: "100px" }}>
                  <span
                    className={`badge ${getStatusBadgeClass(asset.status)}`}
                  >
                    {asset.status || "-"}
                  </span>
                </td>
                <td style={{ minWidth: "120px" }}>{renderLuas(asset)}</td>
                <td style={{ minWidth: "100px" }}>
                  {asset.pemilikan_sertifikat === "Ya" ? (
                    <span className="badge bg-success">Ya</span>
                  ) : (
                    <span className="badge bg-danger">Tidak</span>
                  )}
                </td>
                <td style={{ minWidth: "100px" }}>
                  <div className="d-flex gap-1 flex-wrap">
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => onViewDetail(asset)}
                      title="Lihat Detail"
                    >
                      Detail
                    </Button>
                    {userRole === "admin" && onEdit && (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => onEdit(asset)}
                        title="Edit Aset"
                      >
                        Edit
                      </Button>
                    )}
                    {userRole === "admin" && onDelete && (
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
      </table>
    </div>
  );
};

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
  filteredAssetsCount,
  assetsOnMapCount,
}) => {
  // FilterPanelTop implementation remains the same
  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "Dimiliki/Dikuasai", label: "Dimiliki/Dikuasai" },
    { value: "TIdak Dimiliki/Dikuasai", label: "TIdak Dimiliki/Dikuasai" },
  ];

  // Handle special case for "Berdiri Sendiri" Korem
  const filteredKodimForFilter = selectedKorem ? kodimList : allKodimList;

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Filter Data Aset BMN</h5>
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
                    {korem.nama === "Berdiri Sendiri"
                      ? "Kodim 0733/Kota Semarang"
                      : korem.nama}
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
                onChange={(e) => {
                  console.log("Kodim selected:", e.target.value);
                  onSelectKodim(e.target.value);
                }}
                disabled={!selectedKorem}
              >
                <option value="">Pilih Kodim</option>
                {filteredKodimForFilter.map((kodim, index) => {
                  // Normalisasi nama kodim untuk ditampilkan
                  const normalizedKodimName = normalizeKodimName(kodim.nama);
                  return (
                    <option key={`${kodim.id}-${index}`} value={normalizedKodimName}>
                      {normalizedKodimName}
                    </option>
                  );
                })}
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

        <Row>
          <Col>
            <div className="bg-light p-2 rounded">
              <small className="text-muted">
                <strong>Hasil:</strong> Menampilkan{" "}
                <strong>{assetsOnMapCount}</strong> aset di peta dari{" "}
                <strong>{filteredAssetsCount}</strong> yang cocok dengan filter.
                {filteredAssetsCount > assetsOnMapCount && (
                  <em className="ms-2">
                    ({filteredAssetsCount - assetsOnMapCount} aset tidak
                    memiliki lokasi valid)
                  </em>
                )}
              </small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

const DetailModalAset = ({
  asset,
  show,
  onHide,
  koremList,
  allKodimList,
  koremGeoJSON,
  kodimGeoJSON,
}) => {
  // State untuk popup preview - HARUS DIDEKLARASIKAN DI AWAL SEBELUM LOGIKA APA PUN
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewImageTitle, setPreviewImageTitle] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [previewAssetPhotos, setPreviewAssetPhotos] = useState([]);

  // Re-use the location parsing logic from the main map to ensure consistency.
  if (!asset) return null;

  const locationData = parseLocation(asset.lokasi);
  const hasValidLocation = locationData && getCentroid(locationData) !== null;

  // Calculate centroid for display
  const centroid = hasValidLocation ? getCentroid(locationData) : null;
  const centroidLat = centroid ? centroid[0].toFixed(6) : "N/A";
  const centroidLng = centroid ? centroid[1].toFixed(6) : "N/A";

  const assetForMap = hasValidLocation
    ? {
      id: asset.id || `temp-${Date.now()}`,
      nama: asset.nama || "Unknown",
      kodim: asset.kodim || "",
      lokasi: asset.lokasi, // Pass original data, PetaAset will parse it
      luas: Number(asset.luas) || 0,
      status: asset.status || "",
      alamat: asset.alamat || "",
      peruntukan: asset.peruntukan || asset.fungsi || "",
      keterangan: asset.keterangan || "",
      pemilikan_sertifikat: asset.pemilikan_sertifikat || "Tidak", // Add this line
      type: "aset",
    }
    : null;

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

  // Fungsi untuk menampilkan preview bukti pemilikan
  const handleShowImagePreview = (url, title, isBuktiPemilikan = false) => {
    setPreviewImageUrl(url);
    setPreviewImageTitle(title);
    // If it's a 'bukti pemilikan', don't load the asset photos gallery
    setPreviewAssetPhotos(isBuktiPemilikan ? [] : asset?.foto_aset || []);
    setShowImagePreview(true);
  };

  // Fungsi untuk menavigasi foto aset
  const handleNextPhoto = () => {
    if (previewAssetPhotos && previewAssetPhotos.length > 0) {
      setCurrentPhotoIndex((prevIndex) => {
        const newIndex =
          prevIndex === previewAssetPhotos.length - 1 ? 0 : prevIndex + 1;
        const newPhotoUrl = previewAssetPhotos[newIndex];
        const fullUrl = newPhotoUrl.startsWith("http")
          ? newPhotoUrl
          : `${API_URL}${newPhotoUrl}`;
        setPreviewImageUrl(fullUrl);
        return newIndex;
      });
    }
  };

  const handlePrevPhoto = () => {
    if (previewAssetPhotos && previewAssetPhotos.length > 0) {
      setCurrentPhotoIndex((prevIndex) => {
        const newIndex =
          prevIndex === 0 ? previewAssetPhotos.length - 1 : prevIndex - 1;
        const newPhotoUrl = previewAssetPhotos[newIndex];
        const fullUrl = newPhotoUrl.startsWith("http")
          ? newPhotoUrl
          : `${API_URL}${newPhotoUrl}`;
        setPreviewImageUrl(fullUrl);
        return newIndex;
      });
    }
  };

  const handleShowPhotoPreview = (url, title, index, allPhotos) => {
    setPreviewImageUrl(url);
    setPreviewImageTitle(title);
    setCurrentPhotoIndex(index);
    setPreviewAssetPhotos(allPhotos || []);
    setShowImagePreview(true);
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Detail Aset Tanah - {asset.nama || "Unknown"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
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
                          <strong>Status Sertifikat:</strong>
                        </td>
                        <td>
                          {asset.pemilikan_sertifikat === "Ya" ? (
                            <span className="badge bg-success">Bersertifikat</span>
                          ) : (
                            <span className="badge bg-danger">Tidak Bersertifikat</span>
                          )}
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
                          <strong>Keterangan:</strong>
                        </td>
                        <td
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {asset.keterangan || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Luas:</strong>
                        </td>
                        <td>
                          <span>
                            {asset.luas
                              ? parseFloat(asset.luas).toLocaleString("id-ID")
                              : "0"}{" "}
                            m²
                          </span>
                        </td>
                      </tr>
                      {asset.pemilikan_sertifikat === "Ya" && (
                        <tr>
                          <td>
                            <strong>Jumlah Bidang Bersertifikat:</strong>
                          </td>
                          <td>
                            {asset.sertifikat_bidang || "N/A"}
                          </td>
                        </tr>
                      )}
                      {asset.pemilikan_sertifikat === "Ya" && (
                        <tr>
                          <td>
                            <strong>Luas Bersertifikat:</strong>
                          </td>
                          <td>
                            {asset.sertifikat_luas
                              ? parseFloat(asset.sertifikat_luas).toLocaleString("id-ID") + " m²"
                              : "N/A"}
                          </td>
                        </tr>
                      )}
                      {asset.pemilikan_sertifikat === "Tidak" && (
                        <tr>
                          <td>
                            <strong>Jumlah Bidang Belum Bersertifikat:</strong>
                          </td>
                          <td>
                            {asset.belum_sertifikat_bidang || "N/A"}
                          </td>
                        </tr>
                      )}
                      {asset.pemilikan_sertifikat === "Tidak" && (
                        <tr>
                          <td>
                            <strong>Luas Belum Bersertifikat:</strong>
                          </td>
                          <td>
                            {asset.belum_sertifikat_luas
                              ? parseFloat(asset.belum_sertifikat_luas).toLocaleString("id-ID") + " m²"
                              : "N/A"}
                          </td>
                        </tr>
                      )}
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
                                  }}
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
                              <div>
                                <div>{filename}</div>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() =>
                                    handleShowImagePreview(
                                      imageUrl,
                                      "Bukti Kepemilikan",
                                      true
                                    )
                                  }
                                  className="p-0"
                                  disabled={!hasPdf && !hasValidImage}
                                >
                                  {hasPdf ? "Lihat PDF" : "Lihat Gambar"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Tidak ada file</span>
                          )}
                        </td>
                      </tr>
                      {asset.foto_aset && asset.foto_aset.length > 0 && (
                        <tr>
                          <td>
                            <strong>Foto Aset:</strong>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              {asset.foto_aset.map((fotoUrl, index) => {
                                const fullUrl = fotoUrl.startsWith("http")
                                  ? fotoUrl
                                  : `${API_URL}${fotoUrl}`;
                                const isVideo = isVideoFile(fullUrl);
                                return (
                                  <div
                                    key={index}
                                    style={{
                                      width: "100px",
                                      height: "100px",
                                      border: "1px solid #ddd",
                                      borderRadius: "4px",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {isVideo ? (
                                      <video
                                        src={fullUrl}
                                        controls={false}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          cursor: "pointer",
                                        }}
                                        onClick={() =>
                                          handleShowPhotoPreview(
                                            fullUrl,
                                            `Foto Aset ${index + 1}`,
                                            index,
                                            asset.foto_aset || []
                                          )
                                        }
                                        title="Klik untuk lihat video"
                                      />
                                    ) : (
                                      <Image
                                        src={fullUrl}
                                        alt={`Foto Aset ${index + 1}`}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          cursor: "pointer",
                                        }}
                                        onClick={() =>
                                          handleShowPhotoPreview(
                                            fullUrl,
                                            `Foto Aset ${index + 1}`,
                                            index,
                                            asset.foto_aset || []
                                          )
                                        }
                                        fluid
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
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
                      {asset.gambar_tampak_atas_url && (
                        <tr>
                          <td>
                            <strong>Foto Aset Tampak Atas:</strong>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                }}
                              >
                                <img
                                  src={
                                    asset.gambar_tampak_atas_url.startsWith(
                                      "http"
                                    )
                                      ? asset.gambar_tampak_atas_url
                                      : `${API_URL}${asset.gambar_tampak_atas_url}`
                                  }
                                  alt="Preview Tampak Atas"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                              <div>
                                <div>{asset.gambar_tampak_atas_filename}</div>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() =>
                                    handleShowImagePreview(
                                      asset.gambar_tampak_atas_url.startsWith(
                                        "http"
                                      )
                                        ? asset.gambar_tampak_atas_url
                                        : `${API_URL}${asset.gambar_tampak_atas_url}`,
                                      "Foto Aset Tampak Atas", // Changed from "Foto Tampak Atas"
                                      true // This will prevent loading the gallery
                                    )
                                  } className="p-0"
                                >
                                  Lihat Aset Tampak Atas
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          <strong>Koordinat:</strong>
                        </td>
                        <td>
                          {hasValidLocation && centroid ? (
                            <div>
                              Lat: {centroidLat}, Lng: {centroidLng}
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

            <Col md={6}>
              <div className="card h-100">
                <div className="card-header bg-info text-white">
                  <h5 className="mb-0">Lokasi di Peta</h5>
                </div>
                <div className="card-body p-0">
                  <div style={{ height: "500px", width: "100%" }}>
                    {hasValidLocation && assetForMap ? (
                      <PetaAset
                        assets={assetForMap ? [assetForMap] : []}
                        koremData={koremGeoJSON}
                        kodimData={kodimGeoJSON}
                        mode="detail"
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        <div className="text-center">
                          <i className="fas fa-map-marker-alt fa-3x mb-3"></i>
                          <p>Lokasi tidak tersedia</p>
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
                                  <Col md={12}>
                                    <strong>Luas Total:</strong>
                                    <br />
                                    <span className="text-muted">
                                      {asset.luas
                                        ? parseFloat(asset.luas).toLocaleString("id-ID") + " m²"
                                        : "N/A"}
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

      {/* Modal untuk preview gambar */}
      <Modal
        show={showImagePreview}
        onHide={() => setShowImagePreview(false)}
        size="lg"
        centered
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title>{previewImageTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {isPdfFile(previewImageUrl) ? (
            <iframe
              src={previewImageUrl}
              style={{
                width: "100%",
                height: "70vh",
                border: "none",
              }}
              title="Preview PDF"
            ></iframe>
          ) : isImageFile(previewImageUrl) ? (
            <img
              src={previewImageUrl}
              alt="Preview"
              className="img-fluid"
              style={{ maxHeight: "70vh", objectFit: "contain" }}
            />
          ) : isVideoFile(previewImageUrl) ? (
            <video
              src={previewImageUrl}
              controls
              className="img-fluid"
              style={{ maxHeight: "70vh", objectFit: "contain" }}
              onClick={(e) => e.stopPropagation()}
            >
              Browser Anda tidak mendukung elemen video.
            </video>
          ) : (
            <div>
              <p>Preview tidak tersedia untuk file ini.</p>
              <Button
                variant="primary"
                onClick={() => window.open(previewImageUrl, "_blank")}
              >
                Buka File
              </Button>
            </div>
          )}

          {/* Navigasi untuk foto aset jika ada */}
          {previewAssetPhotos && previewAssetPhotos.length > 1 && (
            <div className="mt-3 d-flex justify-content-between align-items-center">
              <Button
                variant="outline-primary"
                onClick={handlePrevPhoto}
                disabled={previewAssetPhotos.length <= 1}
              >
                &larr; Sebelumnya
              </Button>
              <span>
                {currentPhotoIndex + 1} dari {previewAssetPhotos.length}
              </span>
              <Button
                variant="outline-primary"
                onClick={handleNextPhoto}
                disabled={previewAssetPhotos.length <= 1}
              >
                Berikutnya &rarr;
              </Button>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowImagePreview(false)}
          >
            Tutup
          </Button>
          <Button
            variant="primary"
            onClick={() => window.open(previewImageUrl, "_blank")}
          >
            Buka di Tab Baru
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

const DataAsetTanahPage = () => {
  const { user } = useAuth();
  const location = useLocation();
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editModalKey, setEditModalKey] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);

  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [assetForOffcanvas, setAssetForOffcanvas] = useState(null);
  const [zoomToAsset, setZoomToAsset] = useState(null);

  // NEW: State for holding actual GeoJSON content
  const [koremGeoJSON, setKoremGeoJSON] = useState(null);
  const [kodimGeoJSON, setKodimGeoJSON] = useState(null);
  const [koremGeoJSONSimplified, setKoremGeoJSONSimplified] = useState(null);
  const [kodimGeoJSONSimplified, setKodimGeoJSONSimplified] = useState(null);
  const [koremDataForMap, setKoremDataForMap] = useState(null);
  const [kodimDataForMap, setKodimDataForMap] = useState(null);
  const [koremDataForMapSimplified, setKoremDataForMapSimplified] =
    useState(null);
  const [kodimDataForMapSimplified, setKodimDataForMapSimplified] =
    useState(null);

  const handleMarkerClick = (asset) => {
    setAssetForOffcanvas(asset);
    setShowOffcanvas(true);
    setZoomToAsset(asset);
  };

  const handleCloseOffcanvas = () => {
    setShowOffcanvas(false);
    setAssetForOffcanvas(null);
    setZoomToAsset(null);
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
        if (selectedKoremData) {
          // Handle special case for "Berdiri Sendiri" Korem
          if (selectedKoremData.nama === "Kodim 0733/Kota Semarang") {
            // For "Berdiri Sendiri", create a single Kodim entry
            const kodimObjects = [
              {
                id: "Kodim 0733/Kota Semarang",
                nama: "Kodim 0733/Kota Semarang",
              },
            ];
            setKodimList(kodimObjects);
          } else if (selectedKoremData.kodim) {
            // For regular Korems with Kodim list
            // Remove duplicates by creating a Set of normalized names
            const uniqueKodimNames = [...new Set(selectedKoremData.kodim)];
            const kodimObjects = uniqueKodimNames.map((kName) => ({
              id: kName,
              nama: normalizeKodimName(kName),
            }));
            setKodimList(kodimObjects);
          } else {
            setKodimList([]);
          }
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use Promise.allSettled to fetch all data concurrently and handle failures individually
      const results = await Promise.allSettled([
        axios.get(`${API_URL}/assets`),
        axios.get(`${API_URL}/korem`),
        axios.get(`/data/korem.geojson`),
        axios.get(`/data/Kodim.geojson`),
        axios.get(`/data/korem_simplified.geojson`),
        axios.get(`/data/Kodim_simplified.geojson`),
      ]);

      const [
        assetsResult,
        koremResult,
        koremGeoJSONResult,
        kodimGeoJSONResult,
        koremGeoJSONSimplifiedResult,
        kodimGeoJSONSimplifiedResult,
      ] = results;

      const errors = [];

      // Handle Assets
      if (assetsResult.status === "fulfilled") {
        setAssets(assetsResult.value.data);
      } else {
        const msg = assetsResult.reason?.message || "Unknown error";
        console.error("Failed to fetch assets:", assetsResult.reason);
        errors.push(`Assets (${msg})`);
      }

      // Handle Korem List
      if (koremResult.status === "fulfilled") {
        setKoremList(koremResult.value.data);
      } else {
        const msg = koremResult.reason?.message || "Unknown error";
        console.error("Failed to fetch Korem list:", koremResult.reason);
        errors.push(`Korem List (${msg})`);
      }

      // Handle Korem GeoJSON
      if (koremGeoJSONResult.status === "fulfilled") {
        setKoremGeoJSON(koremGeoJSONResult.value.data);
      } else {
        const msg = koremGeoJSONResult.reason?.message || "Unknown error";
        console.error("Failed to fetch Korem GeoJSON:", koremGeoJSONResult.reason);
        errors.push(`Korem GeoJSON (${msg})`);
      }

      // Handle Kodim GeoJSON
      if (kodimGeoJSONResult.status === "fulfilled") {
        setKodimGeoJSON(kodimGeoJSONResult.value.data);
      } else {
        const msg = kodimGeoJSONResult.reason?.message || "Unknown error";
        console.error("Failed to fetch Kodim GeoJSON:", kodimGeoJSONResult.reason);
        errors.push(`Kodim GeoJSON (${msg})`);
      }

      // Handle Simplified Korem GeoJSON
      if (koremGeoJSONSimplifiedResult.status === "fulfilled") {
        setKoremGeoJSONSimplified(koremGeoJSONSimplifiedResult.value.data);
      } else {
        console.warn(
          "Failed to fetch simplified Korem GeoJSON, using original if available:",
          koremGeoJSONSimplifiedResult.reason
        );
        // Fallback to original if simplified fails
        if (koremGeoJSONResult.status === "fulfilled") {
          setKoremGeoJSONSimplified(koremGeoJSONResult.value.data);
        } else {
          // Optional: add to errors if critical, but simplified is optimization
          // errors.push("Korem Simplified GeoJSON");
        }
      }

      // Handle Simplified Kodim GeoJSON
      if (kodimGeoJSONSimplifiedResult.status === "fulfilled") {
        setKodimGeoJSONSimplified(kodimGeoJSONSimplifiedResult.value.data);
      } else {
        console.warn(
          "Failed to fetch simplified Kodim GeoJSON, using original if available:",
          kodimGeoJSONSimplifiedResult.reason
        );
        // Fallback to original if simplified fails
        if (kodimGeoJSONResult.status === "fulfilled") {
          setKodimGeoJSONSimplified(kodimGeoJSONResult.value.data);
        }
      }

      if (errors.length > 0) {
        setError(`Gagal memuat data: ${errors.join(", ")}. Pastikan backend berjalan dan file ada.`);
      } else {
        setError(null);
      }

      let allKodims = [];
      if (koremResult.status === "fulfilled") {
        allKodims = koremResult.value.data.flatMap((korem) => {
          // Handle special case for "Berdiri Sendiri" Korem
          if (korem.nama === "Kodim 0733/Kota Semarang") {
            return [
              {
                id: "Kodim 0733/Kota Semarang",
                nama: "Kodim 0733/Kota Semarang",
                korem_id: korem.id,
              },
            ];
          }
          // For regular Korems with Kodim list
          return korem.kodim
            ? [...new Set(korem.kodim)].map((k) => ({
              id: k,
              nama: normalizeKodimName(k),
              korem_id: korem.id,
            }))
            : [];
        });
      }
      console.log("All Kodims:", allKodims);
      setAllKodimList(allKodims);
      setError(null);
    } catch (err) {
      setError(
        "Gagal memuat data dari server. Pastikan server API dan file GeoJSON tersedia."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (location.state?.refresh) {
      fetchData();
      // Reset the state to avoid re-fetching on other re-renders
      // navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, fetchData]);

  // Effect to calculate asset counts per korem
  useEffect(() => {
    console.log("Calculating asset counts per korem (Revised Logic)");

    if (assets.length > 0 && koremGeoJSON?.features) {
      const koremFeatures = JSON.parse(JSON.stringify(koremGeoJSON.features));

      // Initialize counts
      koremFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });

      assets.forEach((asset) => {
        const geometry = parseLocation(asset.lokasi);
        const centroid = getCentroid(geometry);

        if (centroid) {
          const point = turf.point([centroid[1], centroid[0]]);
          // Find which korem polygon the asset is in
          for (const koremFeature of koremFeatures) {
            if (
              koremFeature.geometry &&
              turf.booleanPointInPolygon(point, koremFeature.geometry)
            ) {
              koremFeature.properties.asset_count++;
              // Break after finding the containing polygon
              break;
            }
          }
        }
      });

      console.log("Korem data with revised counts:", {
        ...koremGeoJSON,
        features: koremFeatures,
      });
      setKoremDataForMap({ ...koremGeoJSON, features: koremFeatures });
    } else if (koremGeoJSON?.features) {
      // If no assets, just initialize counts to 0
      const koremFeatures = JSON.parse(JSON.stringify(koremGeoJSON.features));
      koremFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });
      setKoremDataForMap({ ...koremGeoJSON, features: koremFeatures });
    }
  }, [assets, koremGeoJSON]);

  // Effect to calculate asset counts per kodim
  useEffect(() => {
    console.log("Calculating asset counts per kodim");

    if (assets.length > 0 && kodimGeoJSON?.features) {
      const kodimFeatures = JSON.parse(JSON.stringify(kodimGeoJSON.features));

      // Initialize counts
      kodimFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });

      assets.forEach((asset) => {
        const geometry = parseLocation(asset.lokasi);
        const centroid = getCentroid(geometry);

        if (centroid) {
          const point = turf.point([centroid[1], centroid[0]]);
          // Find which kodim polygon the asset is in
          for (const kodimFeature of kodimFeatures) {
            if (
              kodimFeature.geometry &&
              turf.booleanPointInPolygon(point, kodimFeature.geometry)
            ) {
              kodimFeature.properties.asset_count++;
              break;
            }
          }
        }
      });

      setKodimDataForMap({ ...kodimGeoJSON, features: kodimFeatures });
    } else if (kodimGeoJSON?.features) {
      // If no assets, just initialize counts to 0
      const kodimFeatures = JSON.parse(JSON.stringify(kodimGeoJSON.features));
      kodimFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });
      setKodimDataForMap({ ...kodimGeoJSON, features: kodimFeatures });
    }
  }, [assets, kodimGeoJSON]);

  // Effect to calculate asset counts per simplified korem
  useEffect(() => {
    if (assets.length > 0 && koremGeoJSONSimplified?.features) {
      const koremFeatures = JSON.parse(
        JSON.stringify(koremGeoJSONSimplified.features)
      );
      koremFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });
      assets.forEach((asset) => {
        const geometry = parseLocation(asset.lokasi);
        const centroid = getCentroid(geometry);
        if (centroid) {
          const point = turf.point([centroid[1], centroid[0]]);
          for (const koremFeature of koremFeatures) {
            if (
              koremFeature.geometry &&
              turf.booleanPointInPolygon(point, koremFeature.geometry)
            ) {
              koremFeature.properties.asset_count++;
              break;
            }
          }
        }
      });
      setKoremDataForMapSimplified({
        ...koremGeoJSONSimplified,
        features: koremFeatures,
      });
    } else if (koremGeoJSONSimplified?.features) {
      const koremFeatures = JSON.parse(
        JSON.stringify(koremGeoJSONSimplified.features)
      );
      koremFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });
      setKoremDataForMapSimplified({
        ...koremGeoJSONSimplified,
        features: koremFeatures,
      });
    }
  }, [assets, koremGeoJSONSimplified]);

  // Effect to calculate asset counts per simplified kodim
  useEffect(() => {
    if (assets.length > 0 && kodimGeoJSONSimplified?.features) {
      const kodimFeatures = JSON.parse(
        JSON.stringify(kodimGeoJSONSimplified.features)
      );
      kodimFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });
      assets.forEach((asset) => {
        const geometry = parseLocation(asset.lokasi);
        const centroid = getCentroid(geometry);
        if (centroid) {
          const point = turf.point([centroid[1], centroid[0]]);
          for (const kodimFeature of kodimFeatures) {
            if (
              kodimFeature.geometry &&
              turf.booleanPointInPolygon(point, kodimFeature.geometry)
            ) {
              kodimFeature.properties.asset_count++;
              break;
            }
          }
        }
      });
      setKodimDataForMapSimplified({
        ...kodimGeoJSONSimplified,
        features: kodimFeatures,
      });
    } else if (kodimGeoJSONSimplified?.features) {
      const kodimFeatures = JSON.parse(
        JSON.stringify(kodimGeoJSONSimplified.features)
      );
      kodimFeatures.forEach((f) => {
        f.properties.asset_count = 0;
      });
      setKodimDataForMapSimplified({
        ...kodimGeoJSONSimplified,
        features: kodimFeatures,
      });
    }
  }, [assets, kodimGeoJSONSimplified]);

  useEffect(() => {
    console.log("Filter effect triggered");
    console.log("Selected Korem:", selectedKorem);
    console.log("Selected Kodim:", selectedKodim);
    console.log("Status Filter:", statusFilter);

    let filtered = assets;

    if (selectedKodim) {
      console.log("Filtering by Kodim:", selectedKodim);
      const filterKodim = normalizeKodimName(
        String(selectedKodim || "").trim()
      );

      filtered = filtered.filter((asset) => {
        const assetKodim = normalizeKodimName(String(asset.kodim || "").trim());

        if (filterKodim === "Kodim 0733/Kota Semarang") {
          return (
            assetKodim === "Kodim 0733/Kota Semarang" ||
            asset.kodim === "Kodim 0733/Semarang (BS)"
          );
        }

        return assetKodim === filterKodim;
      });
    } else if (selectedKorem) {
      filtered = filtered.filter((asset) => asset.korem_id == selectedKorem.id);
    }

    if (statusFilter) {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    console.log("Filtered assets count:", filtered.length);
    setFilteredAssets(filtered);
  }, [selectedKorem, selectedKodim, statusFilter, assets]);

  const assetsOnMapCount = useMemo(
    () =>
      filteredAssets.filter((asset) => {
        const locationData = parseLocation(asset.lokasi);
        const centroid = getCentroid(locationData);
        return centroid !== null;
      }).length,
    [filteredAssets]
  );

  const handleKoremChange = (korem) => {
    setSelectedKorem(korem || null);

    if (korem) {
      fetchKodim(korem.id);

      // Handle special case for "Kodim 0733/Kota Semarang" - directly select the kodim
      if (korem.nama === "Kodim 0733/Kota Semarang" || korem.nama === "Berdiri Sendiri") {
        // Wait for kodimList to be updated before selecting the kodim
        setTimeout(() => {
          setSelectedKodim("Kodim 0733/Kota Semarang");
        }, 0);
      } else {
        setSelectedKodim("");
      }
    } else {
      setKodimList([]);
      setSelectedKodim("");
    }
  };

  const handleKodimChange = (kodimName) => {
    const normalizedKodimName = normalizeKodimName(kodimName || "");
    setSelectedKodim(normalizedKodimName);

    // If a kodim is selected, automatically select its parent korem
    if (normalizedKodimName) {
      const kodimData = allKodimList.find(
        (k) => normalizeKodimName(k.nama) === normalizedKodimName
      );
      if (kodimData) {
        const koremData = koremList.find((k) => k.id === kodimData.korem_id);
        // Check if the korem is already selected to avoid infinite loops
        if (koremData && selectedKorem?.id !== koremData.id) {
          setSelectedKorem(koremData);
        }
      }
    } else {
      // If kodim is cleared, but a korem is still selected, we don't clear the korem.
      // The user might want to select another kodim from the same korem.
    }
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status || "");
  };

  const handleShowAll = () => {
    setSelectedKorem(null);
    setSelectedKodim("");
    setStatusFilter("");
    setKodimList([]);
    setZoomToAsset(null);
  };

  const handleMapKoremSelect = (koremProperties) => {
    if (!koremProperties) {
      handleShowAll();
      return;
    }

    // Cari korem berdasarkan nama
    let koremFromList = koremList.find(
      (k) => k.nama === koremProperties.listkodim_Korem
    );

    // Tangani kasus khusus untuk "Berdiri Sendiri"
    if (
      !koremFromList &&
      koremProperties.listkodim_Korem === "Kodim 0733/Kota Semarang"
    ) {
      // Cari korem dengan nama "Berdiri Sendiri" atau id "5" (berdasarkan db.json)
      koremFromList = koremList.find(
        (k) => k.nama === "Berdiri Sendiri" || k.id === "5"
      );
    }

    if (koremFromList) {
      handleKoremChange(koremFromList);
    } else {
      // Jika tidak ditemukan, coba cari dengan pendekatan yang lebih fleksibel
      const koremFromListAlt = koremList.find(
        (k) =>
          k.nama &&
          k.nama
            .toLowerCase()
            .includes(koremProperties.listkodim_Korem.toLowerCase())
      );

      if (koremFromListAlt) {
        handleKoremChange(koremFromListAlt);
      } else {
        console.warn("Korem tidak ditemukan:", koremProperties.listkodim_Korem);
      }
    }
  };

  const handleMapKodimSelect = (kodimProperties) => {
    if (!kodimProperties) {
      handleKodimChange("");
      return;
    }
    // Pastikan kita menggunakan nama kodim yang sudah dinormalisasi
    const normalizedKodimName = normalizeKodimName(
      kodimProperties.listkodim_Kodim
    );

    // Tangani kasus khusus untuk Kodim Kota Semarang
    if (kodimProperties.listkodim_Kodim === "Kodim 0733/Semarang (BS)") {
      handleKodimChange("Kodim 0733/Kota Semarang");
    } else {
      handleKodimChange(normalizedKodimName);
    }
  };

  const handleMapBack = (viewState) => {
    // Update filter state based on map view changes
    if (viewState.type === "nasional") {
      // Reset all filters when going back to national view
      setSelectedKorem(null);
      setSelectedKodim("");
      setKodimList([]);
    } else if (viewState.type === "korem") {
      // Update to show only korem level filters
      if (viewState.korem) {
        // Tangani kasus khusus untuk "Berdiri Sendiri"
        let koremFromList = koremList.find(
          (k) => k.nama === viewState.korem.listkodim_Korem
        );

        if (
          !koremFromList &&
          viewState.korem.listkodim_Korem === "Kodim 0733/Kota Semarang"
        ) {
          // Cari korem dengan nama "Berdiri Sendiri" atau id "5" (berdasarkan db.json)
          koremFromList = koremList.find(
            (k) => k.nama === "Berdiri Sendiri" || k.id === "5"
          );
        }

        if (koremFromList) {
          setSelectedKorem(koremFromList);
          fetchKodim(koremFromList.id);
        }
      }
      setSelectedKodim("");
    }
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
    setEditingAsset(asset);
    setEditModalKey(Date.now()); // Set a new key to force re-mount
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditingAsset(null);
    setShowEditModal(false);
  };

  const handleSaveAsset = async (
    assetData,
    buktiPemilikanFile,
    assetPhotos,
    gambarTampakAtasFile
  ) => {
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      const { id } = assetData;
      let updatedData = { ...assetData };

      // 1. Upload Bukti Pemilikan
      if (buktiPemilikanFile) {
        try {
          toast.loading("Mengupload bukti pemilikan...", { id: toastId });
          const formData = new FormData();
          formData.append("bukti_pemilikan", buktiPemilikanFile);
          const uploadRes = await axios.post(
            `${API_URL}/upload/bukti-pemilikan`,
            formData
          );
          updatedData.bukti_pemilikan_url = uploadRes.data.url;
          updatedData.bukti_pemilikan_filename = uploadRes.data.filename;
        } catch (err) {
          const message =
            err.response?.data?.message || "Gagal mengupload bukti pemilikan.";
          toast.error(message, { id: toastId });
          console.error(
            "Upload error (bukti pemilikan):",
            err.response?.data || err
          );
          return; // Stop execution if upload fails
        }
      }

      // 2. Upload Foto/Video Aset
      if (assetPhotos && assetPhotos.length > 0) {
        try {
          toast.loading(`Mengupload ${assetPhotos.length} file aset...`, {
            id: toastId,
          });
          const photosFormData = new FormData();
          assetPhotos.forEach((photo) => {
            photosFormData.append("asset_photos", photo);
          });

          console.log(
            "--- DEBUG: Mengirim Foto Aset ---",
            assetPhotos,
            Array.from(photosFormData.entries())
          );

          const photosUploadRes = await axios.post(
            `${API_URL}/upload/asset-photos`,
            photosFormData
          );
          const newPhotoUrls = photosUploadRes.data.files.map(
            (file) => file.url
          );
          updatedData.foto_aset = [
            ...(updatedData.foto_aset || []),
            ...newPhotoUrls,
          ];
        } catch (err) {
          const message =
            err.response?.data?.message ||
            "Gagal mengupload file aset. File mungkin terlalu besar.";
          toast.error(message, { id: toastId });
          console.error(
            "Upload error (asset photos/videos):",
            err.response?.data || err
          );
          return; // Stop execution if upload fails
        }
      }

      // 3. Upload Gambar Tampak Atas
      if (gambarTampakAtasFile) {
        try {
          toast.loading("Mengupload foto tampak atas...", { id: toastId });
          const formData = new FormData();
          formData.append("foto_tampak_atas", gambarTampakAtasFile);
          const uploadRes = await axios.post(
            `${API_URL}/upload/foto-tampak-atas`,
            formData
          );
          updatedData.gambar_tampak_atas_url = uploadRes.data.url;
          updatedData.gambar_tampak_atas_filename = uploadRes.data.filename;
        } catch (err) {
          const message =
            err.response?.data?.message ||
            "Gagal mengupload foto tampak atas.";
          toast.error(message, { id: toastId });
          console.error(
            "Upload error (foto tampak atas):",
            err.response?.data || err
          );
          return;
        }
      }

      // 4. Update Asset Data in DB
      try {
        toast.loading("Menyimpan data ke database...", { id: toastId });
        await axios.put(`${API_URL}/assets/${id}`, updatedData);

        toast.success("Aset berhasil diperbarui!", { id: toastId });
        // handleCloseEditModal();  <-- COMMENT ATAU HAPUS BARIS INI

        // Refresh data aset yang sedang di-edit agar form menampilkan data terbaru
        const refreshedAsset = await axios.get(`${API_URL}/assets/${id}`);
        setEditingAsset(refreshedAsset.data);
        setEditModalKey(Date.now()); // Force a remount to clear file inputs and show new state

        fetchData(); // Refresh semua data di background
      } catch (err) {
        toast.error("Gagal menyimpan data aset ke database.", { id: toastId });
        console.error("DB save error:", err.response?.data || err);
      }
    } finally {
      setIsSaving(false);
      // We don't need to dismiss the main toast here as it's handled by success/error cases
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

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset BMN</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header as="h5">Peta Aset BMN</Card.Header>
            <Card.Body style={{ height: "50vh", padding: 0 }}>
              <PetaAset
                assets={filteredAssets}
                onAssetClick={handleMarkerClick}
                asetPilihan={assetForOffcanvas} // Pass selected asset for highlighting
                markerColorMode="certificate"
                koremData={koremDataForMap}
                kodimData={kodimDataForMap}
                koremDataSimplified={koremDataForMapSimplified}
                kodimDataSimplified={kodimDataForMapSimplified}
                koremFilter={selectedKorem} // Pass filter state
                kodimFilter={selectedKodim} // Pass filter state
                onMapKoremSelect={handleMapKoremSelect}
                onMapKodimSelect={handleMapKodimSelect}
                onMapBack={handleMapBack}
              />
              {/* Debug Info */}
              <div className="d-none">
                Korem Data: {koremDataForMap ? "Available" : "Missing"} ({koremDataForMap?.features?.length || 0})
                Kodim Data: {kodimDataForMap ? "Available" : "Missing"} ({kodimDataForMap?.features?.length || 0})
              </div>
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
            filteredAssetsCount={filteredAssets.length}
            assetsOnMapCount={assetsOnMapCount}
          />

          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">Daftar Aset BMN</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="position-relative">
                {assets.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="text-muted">
                      <i className="fas fa-folder-open fa-3x mb-3"></i>
                      <h5>Belum Ada Data Aset BMN</h5>
                      <p>
                        Silakan tambah aset BMN baru di halaman Tambah Aset BMN.
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
                    userRole={user?.role}
                  />
                )}
              </div>
            </Card.Body>
          </Card>

          {filteredAssets.length > 0 && (
            <Card className="mt-3">
              <Card.Body>
                <Row className="text-center">
                  <Col md={4}>
                    <div className="border-end">
                      <h5 className="text-primary">{filteredAssets.length}</h5>
                      <small className="text-muted">Total Aset</small>
                    </div>
                  </Col>
                  <Col md={4}>
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
                  <Col md={4}>
                    <h5 className="text-danger">
                      {
                        filteredAssets.filter(
                          (a) => a.status === "TIdak Dimiliki/Dikuasai"
                        ).length
                      }
                    </h5>
                    <small className="text-muted">
                      TIdak Dimiliki/Dikuasai
                    </small>
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
        koremGeoJSON={koremGeoJSON}
        kodimGeoJSON={kodimGeoJSON}
      />

      <EditAsetModal
        key={editModalKey}
        show={showEditModal}
        onHide={handleCloseEditModal}
        asset={editingAsset}
        koremList={koremList}
        onSave={handleSaveAsset}
        isSaving={isSaving}
      />

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
