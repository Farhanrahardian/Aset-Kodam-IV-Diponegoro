import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import RingkasanAset from "../components/RingkasanAset";
import FormAset from "../components/FormAset";
import FilterPanel from "../components/FilterPanel";

const API_URL = "http://localhost:3001";

const DataAsetTanahPage = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [koremList, setKoremList] = useState([]);
  const [kodimList, setKodimList] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedKorem, setSelectedKorem] = useState(null);
  const [selectedKodim, setSelectedKodim] = useState("");

  const [loading, setLoading] = useState(true);
  const [kodimLoading, setKodimLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

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
  }, [fetchData]);

  useEffect(() => {
    if (selectedKorem) {
      setFilteredAssets(assets.filter((a) => a.korem_id == selectedKorem.id));
      // Fetch kodim when korem is selected
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

  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      if (editingAsset) {
        const response = await axios.put(
          `${API_URL}/assets/${editingAsset.id}`,
          {
            ...assetData,
            korem_id: selectedKorem?.id || editingAsset.korem_id,
            kodim_id: selectedKodim || editingAsset.kodim_id,
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
    setSelectedKodim(asset.kodim_id || "");
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
            <br />- Kodim Loading: {kodimLoading ? "Yes" : "No"}
            <br />- Editing Asset: {editingAsset?.id || "None"}
            <br />- API URL: {API_URL}
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
            <RingkasanAset
              assets={filteredAssets}
              onEdit={user ? handleEditAsset : null}
              onDelete={user ? handleDeleteAsset : null}
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
