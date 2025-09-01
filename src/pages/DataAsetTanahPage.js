import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Table,
  Button,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import FormAset from "../components/FormAset";
import FilterPanel from "../components/FilterPanel";
import PetaAset from "../components/PetaAset";
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// New simplified table component
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

  return (
    <Table striped bordered hover responsive>
      <thead className="table-dark">
        <tr>
          <th style={{ width: "30%" }}>Nama Aset</th>
          <th style={{ width: "25%" }}>Wilayah Korem</th>
          <th style={{ width: "25%" }}>Kodim</th>
          <th style={{ width: "20%" }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => {
          const korem = koremList.find((k) => k.id == asset.korem_id);
          // Fix: Try multiple field variations for kodim_id
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
          );
        })}
      </tbody>
    </Table>
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

  useEffect(() => {
    if (selectedKorem) {
      setFilteredAssets(assets.filter((a) => a.korem_id == selectedKorem.id));
      fetchKodim(selectedKorem.id);
    } else {
      setFilteredAssets(assets);
      setKodimList([]);
      setSelectedKodim("");
    }
  }, [selectedKorem, assets, fetchKodim]);

  // Handle Korem selection change
  const handleKoremChange = (koremId) => {
    const korem = koremList.find((k) => k.id == koremId);
    setSelectedKorem(korem || null);
    if (koremId) {
      fetchKodim(koremId);
    } else {
      setKodimList([]);
      setSelectedKodim("");
    }
  };

  // Handle Kodim selection change
  const handleKodimChange = (kodimId) => {
    setSelectedKodim(kodimId);
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
    setSelectedKorem(null);
    setSelectedKodim("");
    setKodimList([]);
  };

  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      if (editingAsset) {
        // Get the selected kodim name for saving
        const selectedKodimObj = kodimList.find((k) => k.id === selectedKodim);
        const kodimName = selectedKodimObj
          ? selectedKodimObj.nama
          : selectedKodim;

        const response = await axios.put(
          `${API_URL}/assets/${editingAsset.id}`,
          {
            ...assetData,
            korem_id: selectedKorem?.id || editingAsset.korem_id,
            kodim_id:
              selectedKodim || editingAsset.kodim_id || editingAsset.kodim,
            kodim: kodimName || editingAsset.kodim, // Save kodim name for display
          }
        );
        setAssets(
          assets.map((a) => (a.id === editingAsset.id ? response.data : a))
        );
        toast.success("Aset berhasil diperbarui!", { id: toastId });
      }
      setShowModal(false);
      setEditingAsset(null);
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error("Gagal menyimpan aset", err);
      setError("Gagal menyimpan aset.");
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
    setSelectedKorem(null);
    setSelectedKodim("");
    setKodimList([]);
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  // Detail view layout (like TambahAsetPage)
  if (showDetailView && selectedAssetDetail) {
    return (
      <Container fluid className="mt-4">
        <div className="mb-3">
          <Button variant="secondary" onClick={handleBackFromDetail}>
            ← Kembali ke Daftar Aset
          </Button>
        </div>

        <h3>Detail Aset Tanah - {selectedAssetDetail.nama}</h3>

        <Row>
          <Col md={7}>
            <div style={{ height: "70vh", width: "100%" }}>
              <PetaAset
                assets={[selectedAssetDetail]} // Show only this asset on map
                isDrawing={false}
                onDrawingCreated={() => {}}
                jatengBoundary={jatengBoundary}
                diyBoundary={diyBoundary}
                selectedKorem={selectedKorem?.id}
                selectedKodim={selectedKodim}
                viewMode={true} // Add view mode to show existing assets
              />
            </div>
          </Col>
          <Col md={5}>
            <FormAset
              onSave={() => {}} // No save function in view mode
              onCancel={handleBackFromDetail}
              koremList={koremList}
              kodimList={allKodimList}
              selectedKorem={selectedKorem?.id}
              selectedKodim={selectedKodim}
              assetToEdit={selectedAssetDetail}
              isEnabled={false} // Disable editing in detail view
              viewMode={true} // Add view mode prop
            />
          </Col>
        </Row>
      </Container>
    );
  }

  // Main table view
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
            <br />- All Kodim List: {allKodimList.length} items
            <br />- Selected Kodim: {selectedKodim || "None"}
            <br />- Kodim Loading: {kodimLoading ? "Yes" : "No"}
            <br />- Editing Asset: {editingAsset?.id || "None"}
            <br />- Show Detail View: {showDetailView ? "Yes" : "No"}
            <br />- API URL: {API_URL}
            <br />- Sample Asset Kodim Field:{" "}
            {assets[0]
              ? JSON.stringify({
                  kodim_id: assets[0].kodim_id,
                  kodim: assets[0].kodim,
                  kodim_id_val: assets[0].kodim_id_val,
                })
              : "No assets"}
          </small>
        </Alert>
      )}

      <Row>
        {assets.length > 0 && (
          <Col md={3} className="bg-light p-3">
            <h4 className="mb-3">Filter Data</h4>
            <FilterPanel
              koremList={koremList}
              onSelectKorem={setSelectedKorem}
              onShowAll={() => setSelectedKorem(null)}
              selectedKorem={selectedKorem}
            />
          </Col>
        )}
        <Col md={assets.length > 0 ? 9 : 12}>
          <h2 className="mt-3"></h2>
          <div style={{ height: "calc(100vh - 180px)", overflowY: "auto" }}>
            <TabelAset
              assets={filteredAssets}
              onEdit={user ? handleEditAsset : null}
              onDelete={user ? handleDeleteAsset : null}
              onViewDetail={handleViewDetail}
              koremList={koremList}
              kodimList={allKodimList} // Use all kodim list for better matching
            />
          </div>
        </Col>
      </Row>

      {editingAsset && (
        <div className="mt-4">
          <FormAset
            onSave={handleSaveAsset}
            onCancel={handleCancel}
            koremList={koremList}
            kodimList={kodimList}
            selectedKorem={selectedKorem?.id || ""}
            selectedKodim={selectedKodim}
            assetToEdit={editingAsset}
            isEnabled={true}
          />
        </div>
      )}
    </Container>
  );
};

export default DataAsetTanahPage;
