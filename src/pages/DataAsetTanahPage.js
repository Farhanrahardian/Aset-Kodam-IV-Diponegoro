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

// Debug dan test semua kemungkinan path gambar
const ImagePreviewModal = ({ show, onHide, imageData, assetName }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");
  const [debugInfo, setDebugInfo] = useState([]);

  // Test semua kemungkinan path
  const testImagePaths = async (imageData) => {
    if (!imageData) return { found: false, workingUrl: null, debugInfo: [] };

    const baseUrl = API_URL.replace(/\/$/, "");
    const testPaths = [];

    // Jika sudah full URL
    if (imageData.startsWith("http")) {
      testPaths.push(imageData);
    } else {
      // Coba berbagai kemungkinan path
      testPaths.push(
        `${baseUrl}/uploads/bukti-pemilikan/${imageData}`,
        `${baseUrl}/uploads/${imageData}`,
        `${baseUrl}/static/uploads/bukti-pemilikan/${imageData}`,
        `${baseUrl}/static/uploads/${imageData}`,
        `${baseUrl}/public/uploads/bukti-pemilikan/${imageData}`,
        `${baseUrl}/public/uploads/${imageData}`,
        `${baseUrl}/files/bukti-pemilikan/${imageData}`,
        `${baseUrl}/files/${imageData}`,
        `${baseUrl}/static/${imageData}`,
        `${baseUrl}/${imageData}`
      );
    }

    const debugResults = [];

    // Test setiap path
    for (const path of testPaths) {
      try {
        const response = await fetch(path, { method: "HEAD" });
        debugResults.push({
          path,
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get("content-type"),
        });

        if (response.ok) {
          return { found: true, workingUrl: path, debugInfo: debugResults };
        }
      } catch (error) {
        debugResults.push({
          path,
          status: "ERROR",
          ok: false,
          error: error.message,
        });
      }
    }

    return { found: false, workingUrl: null, debugInfo: debugResults };
  };

  useEffect(() => {
    if (show && imageData) {
      setImageLoading(true);
      setImageError(false);

      testImagePaths(imageData).then((result) => {
        setDebugInfo(result.debugInfo);

        if (result.found) {
          setCurrentUrl(result.workingUrl);
          setImageError(false);
        } else {
          setImageError(true);
          setImageLoading(false);
        }
      });
    }
  }, [show, imageData]);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Bukti Pemilikan - {assetName}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {imageLoading && !imageError && (
          <div className="py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Memuat gambar...</p>
          </div>
        )}

        {imageError && (
          <div className="py-4">
            <FaImage size={50} className="text-muted mb-3" />
            <p className="text-muted mb-3">Gambar tidak dapat dimuat</p>

            {/* Debug information */}
            <div className="text-start">
              <small className="text-muted">
                <strong>Debug Info:</strong>
                <br />
                Original data: {imageData}
                <br />
                Paths tested: {debugInfo.length}
              </small>

              <details className="mt-2">
                <summary style={{ cursor: "pointer", fontSize: "12px" }}>
                  Show detailed test results
                </summary>
                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    fontSize: "11px",
                  }}
                >
                  {debugInfo.map((info, idx) => (
                    <div key={idx} className="mb-1">
                      <div className={info.ok ? "text-success" : "text-danger"}>
                        {info.status}: {info.path}
                      </div>
                      {info.contentType && <div>Type: {info.contentType}</div>}
                      {info.error && <div>Error: {info.error}</div>}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}

        {!imageError && currentUrl && (
          <img
            src={currentUrl}
            alt="Bukti Pemilikan"
            className="img-fluid"
            style={{
              maxHeight: "70vh",
              display: imageLoading ? "none" : "block",
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        {!imageError && currentUrl && (
          <Button
            variant="primary"
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaDownload className="me-2" />
            Download
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// Original table component - tidak diubah
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
          <th style={{ width: "12%" }}>NUP</th>
          <th style={{ width: "15%" }}>Wilayah Korem</th>
          <th style={{ width: "15%" }}>Wilayah Kodim</th>
          <th style={{ width: "20%" }}>Alamat</th>
          <th style={{ width: "12%" }}>Peruntukan</th>
          <th style={{ width: "10%" }}>Status</th>
          <th style={{ width: "13%" }}>Luas</th>
          <th style={{ width: "8%" }}>Aksi</th>
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
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Lihat Detail</Tooltip>}
                  >
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onViewDetail(asset)}
                      className="text-info p-1"
                    >
                      <FaInfoCircle />
                    </Button>
                  </OverlayTrigger>

                  {onEdit && (
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>Edit Aset</Tooltip>}
                    >
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onEdit(asset)}
                        className="text-warning p-1"
                      >
                        <FaEdit />
                      </Button>
                    </OverlayTrigger>
                  )}

                  {onDelete && (
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>Hapus Aset</Tooltip>}
                    >
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onDelete(asset.id)}
                        className="text-danger p-1"
                      >
                        <FaTrash />
                      </Button>
                    </OverlayTrigger>
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

// Original filter component - tidak diubah
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

// Enhanced FormAset Component dengan Image Preview di bawah
const EnhancedFormAset = (props) => {
  const [showImageModal, setShowImageModal] = useState(false);

  // Get image data dari berbagai kemungkinan field
  const getImageData = () => {
    if (!props.assetToEdit) return null;

    // Coba berbagai field yang mungkin menyimpan path gambar
    return (
      props.assetToEdit.bukti_pemilikan_url ||
      props.assetToEdit.bukti_pemilikan_filename ||
      props.assetToEdit.bukti_pemilikan ||
      props.assetToEdit.bukti_pemilikan_file
    );
  };

  const imageData = getImageData();
  const hasImage = !!imageData;

  return (
    <div>
      {/* Form Aset Original tanpa field bukti pemilikan */}
      <FormAset {...props} hideBuktiPemilikan={props.viewMode} />

      {/* Image Preview Section - dipindah ke bawah dan terpisah */}
      <div className="card mt-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Bukti Pemilikan</h6>
          {hasImage && <small className="text-muted">File: {imageData}</small>}
        </div>
        <div className="card-body">
          {hasImage ? (
            <div className="text-center">
              <div className="mb-3">
                <Button
                  variant="outline-primary"
                  onClick={() => setShowImageModal(true)}
                  className="d-flex align-items-center mx-auto"
                >
                  <FaEye className="me-2" />
                  Lihat Bukti Pemilikan
                </Button>
              </div>
              <div className="small text-muted">
                <div>Format yang didukung: PNG, JPG, PDF (maksimal 50MB)</div>
                <div>Klik tombol untuk melihat gambar bukti pemilikan</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted py-4">
              <FaImage size={40} className="mb-3" />
              <p className="mb-2">Gambar belum tersedia</p>
              <div className="small">
                <div>Format yang didukung: PNG, JPG, PDF (maksimal 50MB)</div>
                <div>Upload bukti pemilikan melalui halaman edit aset</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal dengan debug info */}
      <ImagePreviewModal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        imageData={imageData}
        assetName={props.assetToEdit?.nama || "Aset"}
      />
    </div>
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

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // State for detail view
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);

  // Fetch all Kodim data
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

      try {
        console.log(`Trying: ${API_URL}/kodim?korem_id=${koremId}`);
        kodimRes = await axios.get(`${API_URL}/kodim?korem_id=${koremId}`);
        endpointUsed = "kodim?korem_id";
        console.log("Success with Option 1:", kodimRes.data);
      } catch (err1) {
        console.log("Option 1 failed:", err1.response?.status, err1.message);

        try {
          console.log(`Trying: ${API_URL}/korem/${koremId}/kodim`);
          kodimRes = await axios.get(`${API_URL}/korem/${koremId}/kodim`);
          endpointUsed = "korem/id/kodim";
          console.log("Success with Option 2:", kodimRes.data);
        } catch (err2) {
          console.log("Option 2 failed:", err2.response?.status, err2.message);

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
      setSelectedKodim("");
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

  // Filtering logic
  useEffect(() => {
    let filtered = assets;

    if (selectedKorem) {
      filtered = filtered.filter((a) => a.korem_id == selectedKorem.id);
      if (selectedKorem && !kodimList.length) {
        fetchKodim(selectedKorem.id);
      }
    }

    if (selectedKodim) {
      filtered = filtered.filter(
        (a) =>
          a.kodim_id == selectedKodim ||
          a.kodim == selectedKodim ||
          a.kodim_id_val == selectedKodim
      );
    }

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
    setSelectedKodim("");
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

  // Handle view detail
  const handleViewDetail = (asset) => {
    setSelectedAssetDetail(asset);
    setShowDetailView(true);

    const korem = koremList.find((k) => k.id == asset.korem_id);
    if (korem) {
      setSelectedKorem(korem);
      fetchKodim(korem.id);
    }
  };

  // Handle back from detail view
  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedAssetDetail(null);
  };

  // Enhanced save function with file verification
  const handleSaveAsset = async (assetData) => {
    if (!editingAsset) {
      toast.error("Tidak ada aset yang sedang diedit");
      return;
    }

    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      const selectedKodimObj = kodimList.find((k) => k.id === selectedKodim);
      const kodimName = selectedKodimObj
        ? selectedKodimObj.nama
        : selectedKodim;

      // Handle file upload dengan verifikasi lebih ketat
      let fileUploadData = {};

      if (
        assetData.bukti_pemilikan_file &&
        assetData.bukti_pemilikan_file instanceof File
      ) {
        const file = assetData.bukti_pemilikan_file;

        // Validasi file
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          toast.error("File terlalu besar. Maksimal 50MB.", { id: toastId });
          return;
        }

        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "application/pdf",
        ];
        if (!validTypes.includes(file.type)) {
          toast.error(
            "Format file tidak didukung. Gunakan PNG, JPG, atau PDF.",
            { id: toastId }
          );
          return;
        }

        // Siapkan FormData
        const formData = new FormData();
        formData.append("bukti_pemilikan", file);

        // Tambah metadata untuk debugging
        formData.append("originalName", file.name);
        formData.append("fileSize", file.size.toString());
        formData.append("fileType", file.type);

        console.log("Uploading file:", {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        toast.loading("Mengupload file...", { id: toastId });

        try {
          // Coba upload dengan endpoint yang berbeda
          const uploadEndpoints = [
            { url: `${API_URL}/upload/bukti-pemilikan`, method: "POST" },
            { url: `${API_URL}/api/upload/bukti-pemilikan`, method: "POST" },
            { url: `${API_URL}/uploads`, method: "POST" },
            { url: `${API_URL}/api/upload`, method: "POST" },
          ];

          let uploadResponse = null;
          let successEndpoint = null;

          for (const endpoint of uploadEndpoints) {
            try {
              console.log(`Trying upload to: ${endpoint.url}`);

              uploadResponse = await axios.post(endpoint.url, formData, {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
                timeout: 120000, // 2 menit timeout
                onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  console.log(`Upload progress: ${percentCompleted}%`);
                },
              });

              console.log(
                `Upload successful to ${endpoint.url}:`,
                uploadResponse.data
              );
              successEndpoint = endpoint.url;
              break;
            } catch (endpointErr) {
              console.log(`Upload failed to ${endpoint.url}:`, {
                status: endpointErr.response?.status,
                statusText: endpointErr.response?.statusText,
                data: endpointErr.response?.data,
              });

              if (endpoint === uploadEndpoints[uploadEndpoints.length - 1]) {
                throw endpointErr;
              }
            }
          }

          if (!uploadResponse || !uploadResponse.data) {
            throw new Error("Upload response tidak valid");
          }

          // Extract data dari response
          const responseData = uploadResponse.data;
          fileUploadData = {
            bukti_pemilikan_url:
              responseData.url || responseData.path || responseData.filename,
            bukti_pemilikan_filename:
              responseData.filename || responseData.fileName || file.name,
          };

          console.log("File upload successful:", fileUploadData);

          // Verifikasi file berhasil diupload dengan test akses
          if (
            fileUploadData.bukti_pemilikan_url ||
            fileUploadData.bukti_pemilikan_filename
          ) {
            const testUrl =
              fileUploadData.bukti_pemilikan_url ||
              `${API_URL}/uploads/bukti-pemilikan/${fileUploadData.bukti_pemilikan_filename}`;

            try {
              const testResponse = await fetch(testUrl, { method: "HEAD" });
              if (testResponse.ok) {
                console.log("File verification successful:", testUrl);
                toast.success(`File berhasil diupload ke: ${successEndpoint}`, {
                  id: toastId,
                });
              } else {
                console.warn(
                  "File upload success but verification failed:",
                  testResponse.status
                );
                toast.warning("File diupload tapi tidak bisa diverifikasi", {
                  id: toastId,
                });
              }
            } catch (verifyErr) {
              console.warn("File verification error:", verifyErr);
              toast.warning("File diupload tapi tidak bisa diverifikasi", {
                id: toastId,
              });
            }
          }
        } catch (uploadErr) {
          console.error("File upload failed completely:", uploadErr);

          let errorMsg = "Gagal mengupload file";

          if (uploadErr.response) {
            const status = uploadErr.response.status;
            const data = uploadErr.response.data;

            switch (status) {
              case 413:
                errorMsg += ": File terlalu besar (maksimal 50MB)";
                break;
              case 400:
                errorMsg += `: ${data?.message || "Request tidak valid"}`;
                break;
              case 415:
                errorMsg += ": Format file tidak didukung";
                break;
              case 500:
                errorMsg += ": Error server internal";
                break;
              default:
                errorMsg += `: HTTP ${status} - ${
                  data?.message || uploadErr.response.statusText
                }`;
            }
          } else if (uploadErr.request) {
            errorMsg +=
              ": Server tidak merespons. Periksa koneksi dan server API.";
          } else {
            errorMsg += `: ${uploadErr.message}`;
          }

          toast.error(errorMsg, { id: toastId });
          return;
        }
      }

      // Update progress
      toast.loading("Menyimpan data aset...", { id: toastId });

      // Prepare data untuk save
      const saveData = {
        ...assetData,
        ...fileUploadData,
        korem_id: selectedKorem?.id || editingAsset.korem_id,
        kodim_id: selectedKodim || editingAsset.kodim_id || editingAsset.kodim,
        kodim: kodimName || editingAsset.kodim,
      };

      console.log("Saving asset data:", saveData);

      const response = await axios.put(
        `${API_URL}/assets/${editingAsset.id}`,
        saveData,
        { timeout: 30000 }
      );

      console.log("Save response:", response.data);

      // Update state
      const updatedAssets = assets.map((a) =>
        a.id === editingAsset.id ? response.data : a
      );
      setAssets(updatedAssets);

      if (selectedAssetDetail && selectedAssetDetail.id === editingAsset.id) {
        setSelectedAssetDetail(response.data);
      }

      toast.success("Aset berhasil diperbarui!", { id: toastId });

      setShowModal(false);
      setEditingAsset(null);
    } catch (err) {
      console.error("Save failed:", err);
      let errorMsg = "Gagal menyimpan perubahan";

      if (err.response) {
        errorMsg += `: ${err.response.status} - ${
          err.response.data?.message || err.response.statusText
        }`;
      } else if (err.request) {
        errorMsg += ": Server tidak merespons";
      } else {
        errorMsg += `: ${err.message}`;
      }

      toast.error(errorMsg, { id: toastId });
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
    setShowModal(true);
    const korem = koremList.find((k) => k.id == asset.korem_id);
    setSelectedKorem(korem || null);
    setSelectedKodim(asset.kodim_id || asset.kodim || "");
    if (korem) {
      fetchKodim(korem.id);
    }
  };

  const handleCancel = () => {
    setEditingAsset(null);
    setShowModal(false);
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  // Detail view - dengan preview gambar yang diperbaiki
  if (showDetailView && selectedAssetDetail) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Container fluid className="mt-4">
          <div className="mb-3">
            <Button
              variant="secondary"
              onClick={handleBackFromDetail}
              style={{
                zIndex: 10,
                position: "relative",
                pointerEvents: "auto",
              }}
            >
              ← Kembali ke Daftar Aset
            </Button>
          </div>

          <h3>Detail Aset Tanah - {selectedAssetDetail.nama}</h3>

          <Row>
            <Col md={7}>
              <div style={{ height: "70vh", width: "100%" }}>
                <PetaAset
                  assets={[selectedAssetDetail]}
                  isDrawing={false}
                  onDrawingCreated={() => {}}
                  jatengBoundary={jatengBoundary}
                  diyBoundary={diyBoundary}
                  selectedKorem={selectedKorem?.id}
                  selectedKodim={selectedKodim}
                  viewMode={true}
                />
              </div>
            </Col>
            <Col md={5}>
              <div
                style={{
                  position: "relative",
                  zIndex: 10,
                  pointerEvents: "auto",
                  width: "100%",
                }}
              >
                <EnhancedFormAset
                  onSave={() => console.log("Detail view - no save")}
                  onCancel={handleBackFromDetail}
                  koremList={koremList}
                  kodimList={allKodimList}
                  selectedKorem={selectedKorem?.id}
                  selectedKodim={selectedKodim}
                  assetToEdit={selectedAssetDetail}
                  isEnabled={true}
                  viewMode={true}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Main table view
  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Tanah</h3>
      {error && <Alert variant="danger">{error}</Alert>}

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

      <Card>
        <Card.Header className="bg-light">
          <h5 className="mb-0">Daftar Aset Tanah</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <TabelAset
              assets={filteredAssets}
              onEdit={user ? handleEditAsset : null}
              onDelete={user ? handleDeleteAsset : null}
              onViewDetail={handleViewDetail}
              koremList={koremList}
              kodimList={allKodimList}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Edit modal */}
      {editingAsset && showModal && (
        <div style={{ position: "relative", zIndex: 9999 }}>
          <Modal
            show={showModal}
            onHide={handleCancel}
            size="xl"
            backdrop="static"
            keyboard={true}
            style={{ zIndex: 9999 }}
            enforceFocus={false}
            autoFocus={false}
          >
            <Modal.Header closeButton style={{ zIndex: 10000 }}>
              <Modal.Title>Edit Aset - {editingAsset.nama}</Modal.Title>
            </Modal.Header>
            <Modal.Body
              style={{
                maxHeight: "80vh",
                overflowY: "auto",
                zIndex: 9999,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "relative",
                  zIndex: 10,
                  pointerEvents: "auto",
                  width: "100%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <FormAset
                  onSave={handleSaveAsset}
                  onCancel={handleCancel}
                  koremList={koremList}
                  kodimList={kodimList}
                  selectedKorem={selectedKorem?.id || ""}
                  selectedKodim={selectedKodim}
                  assetToEdit={editingAsset}
                  isEnabled={true}
                  viewMode={false}
                />
              </div>
            </Modal.Body>
            <Modal.Footer style={{ zIndex: 10000 }}>
              <Button
                variant="secondary"
                onClick={handleCancel}
                style={{ pointerEvents: "auto" }}
              >
                Tutup
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      )}
    </Container>
  );
};

export default DataAsetTanahPage;
