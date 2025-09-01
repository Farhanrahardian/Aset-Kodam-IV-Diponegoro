import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PetaAset from "../components/PetaAset";
import FormAset from "../components/FormAset";
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

const TambahAsetPage = () => {
  const navigate = useNavigate();
  const [koremList, setKoremList] = useState([]);
  const [kodimList, setKodimList] = useState([]);
  const [selectedKorem, setSelectedKorem] = useState("");
  const [selectedKodim, setSelectedKodim] = useState("");
  const [loading, setLoading] = useState(true);
  const [kodimLoading, setKodimLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [newAssetData, setNewAssetData] = useState(null); // { geometry, area }
  const [isFormEnabled, setIsFormEnabled] = useState(false);

  // Fetch Korem data
  const fetchKorem = useCallback(async () => {
    setLoading(true);
    try {
      const koremRes = await axios.get(`${API_URL}/korem`);
      setKoremList(koremRes.data);
      setError(null);
    } catch (err) {
      setError("Gagal memuat data Korem.");
      console.error("Error fetching Korem:", err);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchKorem();
  }, [fetchKorem]);

  // Handle Korem selection change
  const handleKoremChange = (koremId) => {
    setSelectedKorem(koremId);
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

  const handleDrawingCreated = (data) => {
    // data now contains { geometry, area }
    setNewAssetData(data);
    setIsDrawing(false);
    setIsFormEnabled(true);
  };

  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading("Menyimpan data aset...");
    try {
      // Get kodim name instead of ID for saving
      const selectedKodimObj = kodimList.find((k) => k.id === selectedKodim);
      const kodimName = selectedKodimObj
        ? selectedKodimObj.nama
        : selectedKodim;

      await axios.post(`${API_URL}/assets`, {
        ...assetData,
        id: `T${Date.now()}`,
        lokasi: newAssetData.geometry,
        korem_id: selectedKorem,
        kodim_id: selectedKodim, // Keep ID for backend reference
        kodim: kodimName, // Save name for display purposes
      });
      toast.success("Aset berhasil ditambahkan!", { id: toastId });
      setTimeout(() => {
        navigate("/data-aset-tanah"); // Redirect after saving
      }, 1500); // Delay for toast to be seen
    } catch (err) {
      toast.error("Gagal menyimpan aset.", { id: toastId });
      console.error("Gagal menyimpan aset", err);
      setError("Gagal menyimpan aset.");
    }
  };

  const handleCancel = () => {
    // Navigate back or reset the state
    if (isFormEnabled) {
      setIsFormEnabled(false);
      setNewAssetData(null);
    } else {
      navigate(-1); // Go back to previous page if nothing has been drawn
    }
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container fluid className="mt-4">
      <h3>Tambah Aset Tanah Baru</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === "development" && (
        <Alert variant="info" className="mb-3">
          <small>
            <strong>Debug Info:</strong>
            <br />- Korem List: {koremList.length} items
            <br />- Selected Korem: {selectedKorem || "None"}
            <br />- Kodim List: {kodimList.length} items
            <br />- Selected Kodim: {selectedKodim || "None"}
            <br />- Selected Kodim Name:{" "}
            {kodimList.find((k) => k.id === selectedKodim)?.nama || "None"}
            <br />- Kodim Loading: {kodimLoading ? "Yes" : "No"}
            <br />- API URL: {API_URL}
          </small>
        </Alert>
      )}

      {/* Step 1 & 2: Korem and Kodim Selection */}
      <Row className="mb-4">
        <Col md={6}>
          <div className="mb-3">
            <label className="form-label">1. Pilih Korem</label>
            <select
              className="form-select"
              value={selectedKorem}
              onChange={(e) => handleKoremChange(e.target.value)}
            >
              <option value="">-- Pilih Korem --</option>
              {koremList.map((korem) => (
                <option key={korem.id} value={korem.id}>
                  {korem.nama}
                </option>
              ))}
            </select>
          </div>
        </Col>
        <Col md={6}>
          <div className="mb-3">
            <label className="form-label">2. Pilih Kodim</label>
            <select
              className="form-select"
              value={selectedKodim}
              onChange={(e) => handleKodimChange(e.target.value)}
              disabled={!selectedKorem || kodimLoading}
            >
              <option value="">
                {kodimLoading
                  ? "Loading..."
                  : !selectedKorem
                  ? "Pilih Korem dulu"
                  : "-- Pilih Kodim --"}
              </option>
              {kodimList.map((kodim) => (
                <option key={kodim.id} value={kodim.id}>
                  {kodim.nama}
                </option>
              ))}
            </select>
            {kodimLoading && (
              <small className="text-muted">Memuat data Kodim...</small>
            )}
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={7}>
          <div className="mb-3">
            <Button
              onClick={() => setIsDrawing(!isDrawing)}
              variant={isDrawing ? "danger" : "primary"}
              disabled={!selectedKorem || !selectedKodim}
            >
              {isDrawing
                ? "Batalkan Menggambar"
                : "📍 Gambar Lokasi Aset di Peta"}
            </Button>
            {(!selectedKorem || !selectedKodim) && (
              <small className="text-muted d-block mt-1">
                Pilih Korem dan Kodim terlebih dahulu untuk mengaktifkan peta
              </small>
            )}
          </div>
          <div style={{ height: "70vh", width: "100%" }}>
            <PetaAset
              assets={[]}
              isDrawing={isDrawing}
              onDrawingCreated={handleDrawingCreated}
              jatengBoundary={jatengBoundary}
              diyBoundary={diyBoundary}
              selectedKorem={selectedKorem}
              selectedKodim={selectedKodim}
            />
          </div>
        </Col>
        <Col md={5}>
          <FormAset
            onSave={handleSaveAsset}
            onCancel={handleCancel}
            koremList={koremList}
            kodimList={kodimList}
            selectedKorem={selectedKorem}
            selectedKodim={selectedKodim}
            initialGeometry={newAssetData ? newAssetData.geometry : null}
            initialArea={newAssetData ? newAssetData.area : null}
            isEnabled={isFormEnabled}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetPage;
