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
          <th style={{ width: "12%" }}>Bukti Pemilikan</th>
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
              <td>{renderBuktiPemilikan(asset)}</td>
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

  // New state for detail view (like TambahAsetPage layout)
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);

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

  // Handle view detail - like TambahAsetPage layout
  const handleViewDetail = (asset) => {
    setSelectedAssetDetail(asset);
    setShowDetailView(true);

    // Set up korem and kodim for detail view
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
    // Don't reset filters when going back
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

      // Prepare the data to save
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

      // Close modal and reset states
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
    setShowModal(false); // Tidak perlu modal lagi
    // Set selected korem and kodim for editing
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
    // Don't reset filters here
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  // Detail view layout - FULLY FIXED for interaction issues
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
                <FormAset
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

  // Main table view with top filters
  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Tanah</h3>
      {error && <Alert variant="danger">{error}</Alert>}

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

      {/* Enhanced Table WITHOUT bukti pemilikan column */}
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

      {/* COMPLETELY FIXED: Edit form modal with proper event handling */}
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

      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === "development" && (
        <Alert variant="info" className="mt-3">
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
            <br />- Show Detail View: {showDetailView ? "Yes" : "No"}
            <br />- Show Modal: {showModal ? "Yes" : "No"}
            <br />- Editing Asset: {editingAsset ? "Yes" : "No"}
            {editingAsset && (
              <>
                <br />- Edit Asset bukti_pemilikan_url:{" "}
                {editingAsset.bukti_pemilikan_url || "None"}
                <br />- Edit Asset bukti_pemilikan:{" "}
                {editingAsset.bukti_pemilikan || "None"}
                <br />- Edit Asset bukti_pemilikan_filename:{" "}
                {editingAsset.bukti_pemilikan_filename || "None"}
              </>
            )}
            {selectedAssetDetail && (
              <>
                <br />- Detail Asset bukti_pemilikan_url:{" "}
                {selectedAssetDetail.bukti_pemilikan_url || "None"}
                <br />- Detail Asset bukti_pemilikan:{" "}
                {selectedAssetDetail.bukti_pemilikan || "None"}
                <br />- Detail Asset bukti_pemilikan_filename:{" "}
                {selectedAssetDetail.bukti_pemilikan_filename || "None"}
              </>
            )}
          </small>
        </Alert>
      )}

      {/* Image Debug Modal - untuk debugging path gambar */}
      {process.env.NODE_ENV === "development" && (
        <Modal show={false} size="sm">
          <Modal.Body>
            <small>Image Debug Info</small>
          </Modal.Body>
        </Modal>
      )}
    </Container>
  );
};

export default DataAsetTanahPage;
