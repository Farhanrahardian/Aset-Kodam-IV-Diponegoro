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
    const kodim = allKodimList.find(k => k.id === assetKodimIdentifier || k.nama === assetKodimIdentifier);
    return kodim ? kodim.nama : (asset.kodim_nama || asset.kodim || "-");
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
                <span
                  className={`badge ${
                    asset.status === "Dimiliki"
                      ? "bg-success"
                      : asset.status === "Dikuasai"
                      ? "bg-info"
                      : asset.status === "Aktif"
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
    { value: "Dimiliki", label: "Dimiliki" },
    { value: "Dikuasai", label: "Dikuasai" },
    { value: "Aktif", label: "Aktif" },
    { value: "Tidak Aktif", label: "Tidak Aktif" },
    { value: "Dalam Proses", label: "Dalam Proses" },
    { value: "Sengketa", label: "Sengketa" },
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
                <option value="">
                  Semua Kodim
                </option>
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
  const kodim = allKodimList.find((k) => k.id === asset.kodim || k.nama === asset.kodim);

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
                            asset.status === "Dimiliki"
                              ? "bg-success"
                              : asset.status === "Dikuasai"
                              ? "bg-info"
                              : asset.status === "Aktif"
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

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);

  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocationData, setEditedLocationData] = useState(null);

  const fetchKodim = useCallback((koremId) => {
    if (!koremId) {
      setKodimList([]);
      return;
    }
    setKodimLoading(true);
    try {
      const selectedKoremData = koremList.find(k => k.id === koremId);
      if (selectedKoremData && selectedKoremData.kodim) {
        const kodimObjects = selectedKoremData.kodim.map(kName => ({ id: kName, nama: kName }));
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
  }, [koremList]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assetsRes = await axios.get(`${API_URL}/assets`);
        const koremRes = await axios.get(`${API_URL}/korem`);
        setAssets(assetsRes.data);
        setKoremList(koremRes.data);
        const allKodims = koremRes.data.flatMap(korem => korem.kodim.map(k => ({ id: k, nama: k, korem_id: korem.id })));
        setAllKodimList(allKodims);
        setError(null);
      } catch (err) {
        setError("Gagal memuat data dari server. Pastikan server API berjalan.");
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
  }, [
    selectedKorem,
    selectedKodim,
    statusFilter,
    assets,
  ]);

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
  };

  const handleViewDetail = (asset) => {
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  };

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
      let fileUploadData = {};

      if (
        assetData.bukti_pemilikan_file &&
        assetData.bukti_pemilikan_file instanceof File
      ) {
        const formData = new FormData();
        formData.append("bukti_pemilikan", assetData.bukti_pemilikan_file);

        try {
          const uploadRes = await axios.post(
            `${API_URL}/upload/bukti-pemilikan`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 30000,
            }
          );

          fileUploadData = {
            bukti_pemilikan_url: uploadRes.data.url,
            bukti_pemilikan_filename: uploadRes.data.filename,
          };

          toast.success("File berhasil diupload", { id: toastId });
        } catch (uploadErr) {
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

      let locationData = {};

      if (editedLocationData) {
        if (
          editedLocationData.geometry &&
          Array.isArray(editedLocationData.geometry)
        ) {
          locationData = {
            lokasi: editedLocationData.geometry,
            luas: editedLocationData.area,
          };
        } else {
          toast.error("Data koordinat tidak valid", { id: toastId });
          return;
        }
      }

      const kodimId = selectedKodim || editingAsset.kodim;

      const finalData = {
        ...assetData,
        ...fileUploadData,
        ...locationData,
        korem_id: selectedKorem?.id || editingAsset.korem_id,
        kodim: kodimId,
        kodim_id: kodimId,
      };

      const response = await axios.put(
        `${API_URL}/assets/${editingAsset.id}`,
        finalData,
        { timeout: 15000 }
      );

      const updatedAssets = assets.map((a) =>
        a.id === editingAsset.id ? response.data : a
      );
      setAssets(updatedAssets);

      if (selectedAssetDetail && selectedAssetDetail.id === editingAsset.id) {
        setSelectedAssetDetail(response.data);
      }

      toast.success("Aset berhasil diperbarui!", { id: toastId });

      setEditingAsset(null);
      setIsEditingLocation(false);
      setEditedLocationData(null);
    } catch (err) {
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

    const korem = koremList.find((k) => k.id == asset.korem_id);
    setSelectedKorem(korem || null);
    setSelectedKodim(asset.kodim || "");
    if (korem) {
      fetchKodim(korem.id);
    }
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setIsEditingLocation(false);
    setEditedLocationData(null);
  };

  const handleEditLocation = () => {
    if (!editingAsset) {
      toast.error("Tidak ada aset yang dipilih untuk edit lokasi");
      return;
    }

    setEditedLocationData(null);
    setIsEditingLocation(true);

    toast("Mode edit lokasi aktif. Gambar polygon baru di peta.", {
      duration: 3000,
      icon: "📍",
      style: {
        border: "1px solid #3b82f6",
        color: "#3b82f6",
      },
    });

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
    setIsEditingLocation(false);
    setEditedLocationData(null);

    toast("Mode edit lokasi dibatalkan", {
      icon: "↩️",
      style: {
        border: "1px solid #f59e0b",
        color: "#f59e0b",
      },
    });
  };

  const handleLocationDrawingCreated = (data) => {
    if (!data || !data.geometry) {
      toast.error("Data lokasi tidak valid");
      return;
    }

    let coordinates = null;

    if (
      data.geometry.coordinates &&
      Array.isArray(data.geometry.coordinates[0])
    ) {
      coordinates = data.geometry.coordinates[0];
    } else {
      toast.error("Format geometry tidak valid");
      return;
    }

    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      toast.error(
        `Polygon harus minimal 3 titik. Saat ini: ${coordinates?.length || 0}`
      );
      return;
    }

    const locationData = {
      geometry: coordinates,
      area: data.area || 0,
      type: "polygon",
    };

    setEditedLocationData(locationData);
    setIsEditingLocation(false);

    toast.success(
      `Lokasi berhasil digambar! Luas: ${(data.area / 10000).toFixed(2)} Ha`
    );
  };

  const prepareEditAssetForMap = () => {
    if (!editingAsset) return [];

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
        if (Array.isArray(lokasi[0]) && typeof lokasi[0][0] === "number") {
          return lokasi;
        } else if (Array.isArray(lokasi[0]) && Array.isArray(lokasi[0][0])) {
          return lokasi[0];
        }
      }

      if (lokasi.type === "Polygon" && lokasi.coordinates) {
        return lokasi.coordinates[0];
      }

      if (lokasi.coordinates && Array.isArray(lokasi.coordinates)) {
        if (Array.isArray(lokasi.coordinates[0])) {
          return lokasi.coordinates[0];
        }
      }

      return null;
    };

    const validatedLocation = validateLocationData(editingAsset);

    if (!validatedLocation) {
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
      type: "aset_tanah",
      isEditing: true,
    };

    return [assetForMap];
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Tanah</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={12}>
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
                        {allKodimList.find(
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
                  <div
                    key={`map-edit-${editingAsset.id}-${isEditingLocation}`}
                    className="position-relative w-100 h-100"
                  >
                    <PetaAset
                      key={`peta-${editingAsset.id}-${Date.now()}`}
                      assets={prepareEditAssetForMap()}
                      isDrawing={true}
                      onDrawingCreated={handleLocationDrawingCreated}
                      jatengBoundary={jatengBoundary}
                      diyBoundary={diyBoundary}
                      fitBounds={true}
                      selectedKorem={selectedKorem?.id}
                      selectedKodim={selectedKodim}
                      drawingMode="polygon"
                      editMode={true}
                      allowEdit={true}
                      showDrawingTools={true}
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

                </div>
              </div>
            </div>
          </Col>
        )}
      </Row>

      <DetailModalAset
        asset={selectedAssetDetail}
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        koremList={koremList}
        allKodimList={allKodimList}
      />
    </Container>
  );
};

export default DataAsetTanahPage;