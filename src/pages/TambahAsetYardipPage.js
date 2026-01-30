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
import PetaGambarYardip from "../components/PetaGambarYardip";
import FormYardip from "../components/FormYardip";
import MapErrorBoundary from "../components/MapErrorBoundary";

const API_URL = "http://localhost:3001";

const TambahAsetYardipPage = () => {
  const navigate = useNavigate();

  const [selectedLocation, setSelectedLocation] = useState({
    provinsi: null,
    kabupaten: null,
  });
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [drawnAsset, setDrawnAsset] = useState(null);

  // NEW: Separate state for manual area editing
  const [manualArea, setManualArea] = useState(null);

  const [error, setError] = useState(null);
  const [yardipAssets, setYardipAssets] = useState([]);
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const handleLocationSelect = useCallback((type, name) => {
    if (type === "provinsi") {
      setSelectedLocation({ provinsi: name, kabupaten: null });
      setIsDrawingEnabled(false);
      setDrawnAsset(null);
      setManualArea(null);
      toast.success(`Provinsi ${name} dipilih. Silakan pilih kabupaten/kota.`);
    } else if (type === "kabupaten") {
      setSelectedLocation((prev) => ({ ...prev, kabupaten: name }));
      setIsDrawingEnabled(true);
      setDrawnAsset(null);
      setManualArea(null);
      toast.success(
        `Kabupaten/Kota ${name} dipilih. Silakan gambar area aset.`
      );
    } else {
      setSelectedLocation({ provinsi: null, kabupaten: null });
      setIsDrawingEnabled(false);
      setDrawnAsset(null);
      setManualArea(null);
    }
  }, []);

  const handleLocationChangeFromForm = useCallback((provinsi, kabupaten) => {
    setSelectedLocation({ provinsi, kabupaten });
    if (kabupaten) {
      setIsDrawingEnabled(true);
    } else {
      setIsDrawingEnabled(false);
    }
    setDrawnAsset(null);
    setManualArea(null);
  }, []);

  const handleMapLocationSelect = useCallback((type, name) => {
    setMapNavigationTrigger({ type, name, timestamp: Date.now() });

    if (type === "provinsi") {
      setSelectedLocation({ provinsi: name, kabupaten: null });
      setIsDrawingEnabled(false);
      setDrawnAsset(null);
      setManualArea(null);
      toast.success(`Peta dipindahkan ke Provinsi ${name}`);
    } else if (type === "kabupaten") {
      setSelectedLocation((prev) => ({ ...prev, kabupaten: name }));
      setIsDrawingEnabled(true);
      setDrawnAsset(null);
      setManualArea(null);
      toast.success(`Peta dipindahkan ke Kabupaten/Kota ${name}`);
    }
  }, []);

  const handleDrawingCreated = useCallback((data) => {
    // Handle deletion (data is null)
    if (data === null) {
      setDrawnAsset(null);
      toast.success("Gambar berhasil dihapus.");
      return;
    }

    if (!data || !data.geometry) {
      toast.error("Data gambar tidak valid.");
      return;
    }
    setDrawnAsset({ ...data, source: 'manual' });
    setManualArea(data.area); // Set initial manual area from calculated area
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
          setDrawnAsset({ geometry, area, source: 'import' });
          setManualArea(area);
          toast.success(
            `Poligon berhasil diimpor! Lokasi: ${containingKab}, ${containingProv}.`
          );
        } else {
          toast.error(
            "Tidak dapat menentukan lokasi poligon. Pastikan poligon berada di dalam wilayah yang didukung."
          );
          setDrawnAsset({ geometry, area, source: 'import' });
          setManualArea(area);
        }
      } catch (e) {
        toast.error("Terjadi kesalahan saat menganalisis poligon.");
        console.error("Polygon analysis error:", e);
        setDrawnAsset({ geometry, area, source: 'import' });
        setManualArea(area);
      }
    },
    [kabupatenData, provinsiData]
  );

  // NEW: Handler for manual area changes
  const handleManualAreaChange = useCallback((newArea) => {
    setManualArea(newArea);
  }, []);

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

      // Use manual area if set, otherwise use calculated area from polygon
      const finalArea = manualArea !== null ? manualArea : drawnAsset.area;

      const toastId = toast.loading("Menyimpan data aset yardip...");
      try {
        const payload = {
          ...assetData,
          id: `Y${Date.now()}`,
          lokasi: JSON.stringify(drawnAsset.geometry),
          area: finalArea, // Use manual area here
          type: "yardip",
          provinsi: selectedLocation.provinsi,
          kabkota: selectedLocation.kabupaten,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await axios.post(`${API_URL}/yardip_assets`, payload);
        toast.success("Aset Yardip berhasil ditambahkan!", { id: toastId });

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
    [drawnAsset, selectedLocation, manualArea, navigate]
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
                selectedProvinsi={selectedLocation.provinsi}
                selectedKabupaten={selectedLocation.kabupaten}
                importedGeometry={drawnAsset && drawnAsset.source === 'import' ? drawnAsset.geometry : null}
                geoJsonKey={0}
              />
            </MapErrorBoundary>
          </div>
        </Col>

        <Col md={5}>
          <div className="card border-0 shadow-sm">
            <FormYardip
              onSave={handleSaveAsset}
              onCancel={handleCancel}
              isEnabled={true}
              selectedProvinceName={selectedLocation.provinsi}
              selectedKabupatenName={selectedLocation.kabupaten}
              initialArea={manualArea !== null ? manualArea : (drawnAsset ? drawnAsset.area : 0)}
              onKmlImport={handleImportedGeometry}
              onCoordsImport={handleImportedGeometry}
              provinsiData={provinsiData}
              kabupatenData={kabupatenData}
              onLocationChange={handleLocationChangeFromForm}
              isPolygonCreated={!!drawnAsset}
              onMapLocationSelect={handleMapLocationSelect}
              onManualAreaChange={handleManualAreaChange} // NEW: Pass handler to form
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetYardipPage;