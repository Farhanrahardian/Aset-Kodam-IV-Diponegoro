import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Card,
  Spinner,
} from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as turf from "@turf/turf";
import PetaGambarYardip from "../components/PetaGambarYardip"; // DIUBAH
import FormYardip from "../components/FormYardip";
import MapErrorBoundary from "../components/MapErrorBoundary";

const API_URL = "http://localhost:3001";

const TambahAsetYardipPage = () => {
  const navigate = useNavigate();

  // State yang disederhanakan untuk alur baru
  const [selectedLocation, setSelectedLocation] = useState({
    provinsi: null,
    kabupaten: null,
  });
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [drawnAsset, setDrawnAsset] = useState(null);
  const [error, setError] = useState(null);
  const [yardipAssets, setYardipAssets] = useState([]);
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);
  const [loading, setLoading] = useState(true);

  // NEW: State to handle form-triggered map navigation
  const [mapNavigationTrigger, setMapNavigationTrigger] = useState(null);

  // Load boundary data on mount
  useEffect(() => {
    const loadBoundaryData = async () => {
      try {
        const [provRes, kabRes] = await Promise.all([
          axios.get("/data/provinsi.geojson"),
          axios.get("/data/kabupaten_kota.geojson"),
        ]);
        setProvinsiData(provRes.data);
        setKabupatenData(kabRes.data);
      } catch (err) {
        console.error("Error loading boundary data:", err);
        toast.error("Gagal memuat data batas wilayah.");
      } finally {
        setLoading(false);
      }
    };

    loadBoundaryData();
  }, []);

  // Handler untuk menerima data dari PetaGambarYardip
  const handleLocationSelect = useCallback((type, name) => {
    if (type === "provinsi") {
      setSelectedLocation({ provinsi: name, kabupaten: null });
      setIsDrawingEnabled(false);
      setDrawnAsset(null);
      toast.success(`Provinsi ${name} dipilih. Silakan pilih kabupaten/kota.`);
    } else if (type === "kabupaten") {
      setSelectedLocation((prev) => ({ ...prev, kabupaten: name }));
      setIsDrawingEnabled(true);
      setDrawnAsset(null);
      toast.success(
        `Kabupaten/Kota ${name} dipilih. Silakan gambar area aset.`
      );
    } else {
      // Kembali ke tampilan nasional
      setSelectedLocation({ provinsi: null, kabupaten: null });
      setIsDrawingEnabled(false);
      setDrawnAsset(null);
    }
  }, []);

  const handleLocationChangeFromForm = useCallback((provinsi, kabupaten) => {
    setSelectedLocation({ provinsi, kabupaten });
    if (kabupaten) {
      setIsDrawingEnabled(true);
    } else {
      setIsDrawingEnabled(false);
    }
    setDrawnAsset(null); // Clear any drawing when location changes
  }, []);

  // NEW: Handler untuk navigasi peta dari form
  const handleMapLocationSelect = useCallback((type, name) => {
    // Set trigger untuk memaksa map component untuk zoom ke lokasi
    setMapNavigationTrigger({ type, name, timestamp: Date.now() });

    if (type === "provinsi") {
      setSelectedLocation({ provinsi: name, kabupaten: null });
      setIsDrawingEnabled(false);
      setDrawnAsset(null);
      toast.success(`Peta dipindahkan ke Provinsi ${name}`);
    } else if (type === "kabupaten") {
      setSelectedLocation((prev) => ({ ...prev, kabupaten: name }));
      setIsDrawingEnabled(true);
      setDrawnAsset(null);
      toast.success(`Peta dipindahkan ke Kabupaten/Kota ${name}`);
    }
  }, []);

  const handleDrawingCreated = useCallback((data) => {
    setDrawnAsset(data);
    toast.success(`Area seluas ${data.area.toFixed(2)} m² berhasil digambar.`);
  }, []);

  const handleImportedGeometry = useCallback(
    (geometry) => {
      if (!geometry || !kabupatenData || !provinsiData) {
        toast.error("Gagal memproses geometri, data batas wilayah belum siap.");
        return;
      }

      const area = turf.area(geometry);
      let containingKab = null;
      let containingProv = null;

      try {
        const centroid = turf.centroid(geometry);

        for (const kabFeature of kabupatenData.features) {
          if (turf.booleanPointInPolygon(centroid, kabFeature)) {
            containingKab = kabFeature.properties.Kabupaten;
            containingProv = kabFeature.properties.PROVINCE;
            break;
          }
        }

        if (containingProv && containingKab) {
          setSelectedLocation({
            provinsi: containingProv,
            kabupaten: containingKab,
          });
          setDrawnAsset({ geometry, area });
          toast.success(
            `Poligon berhasil diimpor! Lokasi: ${containingKab}, ${containingProv}.`
          );
        } else {
          toast.error(
            "Tidak dapat menentukan lokasi poligon. Pastikan poligon berada di dalam wilayah yang didukung."
          );
          // Still draw the asset, but don't set the location
          setDrawnAsset({ geometry, area });
        }
      } catch (e) {
        toast.error("Terjadi kesalahan saat menganalisis poligon.");
        console.error("Polygon analysis error:", e);
        setDrawnAsset({ geometry, area }); // Draw it anyway
      }
    },
    [kabupatenData, provinsiData]
  );

  const handleSaveAsset = useCallback(
    async (assetData) => {
      if (!drawnAsset) {
        toast.error("Silakan gambar lokasi di peta terlebih dahulu!");
        return;
      }
      if (!selectedLocation.provinsi || !selectedLocation.kabupaten) {
        toast.error(
          "Lokasi provinsi dan kabupaten/kota belum dipilih di peta."
        );
        return;
      }

      const toastId = toast.loading("Menyimpan data aset yardip...");
      try {
        const payload = {
          ...assetData,
          id: `Y${Date.now()}`,
          lokasi: JSON.stringify(drawnAsset.geometry),
          area: drawnAsset.area,
          type: "yardip",
          provinsi: selectedLocation.provinsi,
          kabkota: selectedLocation.kabupaten, // Menggunakan nama kab/kota dari peta
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await axios.post(`${API_URL}/yardip_assets`, payload);
        toast.success("Aset Yardip berhasil ditambahkan!", { id: toastId });

        // Reload assets to include the new one
        const response = await axios.get(`${API_URL}/yardip_assets`);
        setYardipAssets(response.data || []);

        setTimeout(() => navigate("/data-aset-yardip"), 1500);
      } catch (err) {
        toast.error("Gagal menyimpan aset yardip.", { id: toastId });
        console.error("Error saving yardip asset:", err);
        setError(
          `Gagal menyimpan: ${err.response?.data?.message || err.message}`
        );
      }
    },
    [drawnAsset, selectedLocation, navigate]
  );

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const alertMessage = useMemo(() => {
    if (!selectedLocation.provinsi) {
      return "Pilih Provinsi di Peta atau melalui dropdown untuk memulai.";
    }
    if (!selectedLocation.kabupaten) {
      return `Provinsi ${selectedLocation.provinsi} dipilih. Selanjutnya, pilih Kabupaten/Kota di peta atau melalui dropdown.`;
    }
    if (!drawnAsset) {
      return `Kabupaten/Kota ${selectedLocation.kabupaten} dipilih. Gunakan tool di pojok kiri atas peta untuk menggambar area aset.`;
    }
    return `Area aset telah digambar di ${selectedLocation.kabupaten}. Silakan lengkapi form di sebelah kanan.`;
  }, [selectedLocation, drawnAsset]);

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <h3 className="mb-4">Tambah Aset Yardip Baru</h3>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={7}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white border-bottom-0">
              <Alert variant="info" className="mb-0 mt-2 py-2">
                <small>
                  <i className="bi bi-info-circle me-1"></i>
                  <strong>Petunjuk:</strong> {alertMessage}
                </small>
              </Alert>
            </Card.Header>
          </Card>

          <div
            className="border rounded shadow-sm overflow-hidden position-relative"
            style={{ height: "70vh", width: "100%" }}
          >
            <MapErrorBoundary height="70vh">
              <PetaGambarYardip
                provinsiData={provinsiData}
                kabupatenData={kabupatenData}
                onLocationSelect={handleLocationSelect}
                onPolygonCreated={handleDrawingCreated}
                isDrawingEnabled={isDrawingEnabled}
                assets={yardipAssets} // Pass existing YARDIP assets to the map
                newlyDrawnGeometry={drawnAsset ? drawnAsset.geometry : null} // Auto zoom to newly drawn geometry
                mapNavigationTrigger={mapNavigationTrigger} // NEW: Pass trigger for form-controlled navigation
              />
            </MapErrorBoundary>
          </div>
        </Col>

        <Col md={5}>
          <div className="card border-0 shadow-sm">
            <FormYardip
              onSave={handleSaveAsset}
              onCancel={handleCancel}
              isEnabled={true} // Form is enabled by default
              selectedProvinceName={selectedLocation.provinsi}
              selectedKabupatenName={selectedLocation.kabupaten}
              initialArea={drawnAsset ? drawnAsset.area : 0}
              onKmlImport={handleImportedGeometry}
              onCoordsImport={handleImportedGeometry}
              provinsiData={provinsiData}
              kabupatenData={kabupatenData}
              onLocationChange={handleLocationChangeFromForm}
              isPolygonCreated={!!drawnAsset}
              onMapLocationSelect={handleMapLocationSelect} // NEW: Pass handler for form-controlled map navigation
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetYardipPage;
