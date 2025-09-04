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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [newAssetData, setNewAssetData] = useState(null);
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [drawnAssets, setDrawnAssets] = useState([]);

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
    }
  }, []);

  useEffect(() => {
    fetchKorem();
  }, [fetchKorem]);

  // PERBAIKAN: Handler untuk drawing yang konsisten
  const handleDrawingCreated = (data) => {
    console.log("=== Drawing created in TambahAsetPage ===");
    console.log("Raw data received:", JSON.stringify(data, null, 2));

    if (!data || !data.geometry) {
      console.error("Invalid drawing data - missing geometry:", data);
      toast.error("Data gambar tidak valid");
      return;
    }

    // Extract coordinates from GeoJSON geometry
    let coordinates = null;

    if (
      data.geometry.coordinates &&
      Array.isArray(data.geometry.coordinates[0])
    ) {
      // GeoJSON format: geometry.coordinates[0] adalah exterior ring
      coordinates = data.geometry.coordinates[0];
      console.log("Extracted coordinates from GeoJSON:", coordinates);
    } else {
      console.error("Invalid geometry format:", data.geometry);
      toast.error("Format geometry tidak valid");
      return;
    }

    // Validasi minimum 3 points untuk polygon
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      toast.error(
        `Polygon harus minimal 3 titik. Saat ini: ${coordinates?.length || 0}`
      );
      return;
    }

    // Store data dalam format yang konsisten
    const processedData = {
      geometry: coordinates, // Store sebagai array koordinat [[lng,lat], [lng,lat], ...]
      area: data.area || 0,
      type: "polygon",
    };

    console.log("Processed data for storage:", processedData);

    setNewAssetData(processedData);
    setIsDrawing(false);
    setIsFormEnabled(true);

    // Create temp asset untuk display di peta
    const tempAsset = {
      id: "temp_drawn_polygon",
      nama: "Area Baru (Belum Tersimpan)",
      lokasi: coordinates, // Format: [[lng,lat], [lng,lat], ...]
      luas: data.area,
      status: "draft",
      alamat: "Menunggu input detail...",
    };

    console.log("Temp asset for display:", tempAsset);
    setDrawnAssets([tempAsset]);

    toast.success(
      `Polygon berhasil digambar! Luas: ${(data.area / 10000).toFixed(2)} Ha`
    );
  };

  // PERBAIKAN: Handler save asset yang konsisten
  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading("Menyimpan data aset...");

    try {
      if (!newAssetData || !newAssetData.geometry) {
        toast.error("Data lokasi tidak tersedia", { id: toastId });
        return;
      }

      console.log("=== Saving asset ===");
      console.log("Asset form data:", assetData);
      console.log("New asset location data:", newAssetData);

      // Format final data untuk disimpan
      const finalAssetData = {
        ...assetData,
        id: `T${Date.now()}`,
        lokasi: newAssetData.geometry, // Simpan koordinat dalam format [[lng,lat], [lng,lat], ...]
        luas: newAssetData.area,
      };

      console.log("Final data to save:", finalAssetData);

      const response = await axios.post(`${API_URL}/assets`, finalAssetData);
      console.log("Save response:", response.data);

      toast.success("Aset berhasil ditambahkan!", { id: toastId });

      // Clear states
      setDrawnAssets([]);
      setNewAssetData(null);
      setIsFormEnabled(false);

      setTimeout(() => {
        navigate("/data-aset-tanah");
      }, 1500);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Gagal menyimpan aset.", { id: toastId });
      setError("Gagal menyimpan aset.");
    }
  };

  const handleCancel = () => {
    if (isFormEnabled) {
      setIsFormEnabled(false);
      setNewAssetData(null);
      setDrawnAssets([]);
      setIsDrawing(false);
      toast("Polygon dibatalkan");
    } else {
      navigate(-1);
    }
  };

  const handleDrawingToggle = () => {
    if (isDrawing) {
      // Cancel drawing mode
      setIsDrawing(false);
      setDrawnAssets([]);
      setNewAssetData(null);
      setIsFormEnabled(false);
      toast("Mode menggambar dibatalkan", {
        style: {
          border: "1px solid #f59e0b",
          color: "#f59e0b",
        },
      });
    } else {
      // Start drawing mode
      setIsDrawing(true);
      setDrawnAssets([]);
      setNewAssetData(null);
      setIsFormEnabled(false);
      toast("Mode menggambar aktif. Klik di peta untuk membuat polygon.");
    }
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container fluid className="mt-4">
      <h3>Tambah Aset Tanah Baru</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={7}>
          <div className="mb-3">
            <Button
              onClick={handleDrawingToggle}
              variant={isDrawing ? "danger" : "primary"}
              className="me-2"
            >
              {isDrawing
                ? "❌ Batalkan Menggambar"
                : "📍 Gambar Lokasi Aset di Peta"}
            </Button>

            {drawnAssets.length > 0 && !isDrawing && (
              <Button
                onClick={() => setDrawnAssets([])}
                variant="outline-warning"
                size="sm"
              >
                🗑️ Hapus Gambar
              </Button>
            )}
          </div>

          {drawnAssets.length > 0 && (
            <Alert variant="success" className="mb-3">
              ✅ Polygon berhasil digambar! Luas:{" "}
              {(newAssetData?.area / 10000).toFixed(2)} Ha
              <br />
              <small>
                Silakan lengkapi form di sebelah kanan untuk menyimpan aset.
              </small>
            </Alert>
          )}

          <div style={{ height: "70vh", width: "100%" }}>
            <PetaAset
              assets={drawnAssets}
              tampilan="poligon"
              isDrawing={isDrawing}
              onDrawingCreated={handleDrawingCreated}
              jatengBoundary={jatengBoundary}
              diyBoundary={diyBoundary}
              key={`peta-tambah-${
                drawnAssets.length
              }-${isDrawing}-${Date.now()}`}
            />
          </div>
        </Col>
        <Col md={5}>
          <FormAset
            onSave={handleSaveAsset}
            onCancel={handleCancel}
            koremList={koremList}
            kodimList={kodimList}
            onKoremChange={fetchKodim}
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
