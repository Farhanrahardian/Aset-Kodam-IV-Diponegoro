import React, { useState, useCallback, useMemo } from "react";
import { Container, Row, Col, Button, Alert, Card } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PetaAsetYardip from "../components/PetaAsetYardip";
import FormYardip from "../components/FormYardip";
import MapErrorBoundary from "../components/MapErrorBoundary";
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// Enhanced city data with better bounds for auto zoom
const kotaData = {
  jateng: [
    // === KOTA-KOTA (6 kota) dengan bounds besar tapi pusat tepat di tengah kota ===
    {
      id: "semarang",
      name: "Semarang",
      bounds: [
        [-6.9, 110.35], // Bounds diperluas, tapi pusat tetap di Semarang (-7.00, 110.42)
        [-7.1, 110.49],
      ],
    },
    {
      id: "solo",
      name: "Surakarta (Solo)",
      bounds: [
        [-7.46, 110.75], // Bounds diperluas, pusat di Solo (-7.56, 110.83)
        [-7.66, 110.91],
      ],
    },
    {
      id: "magelang_kota",
      name: "Magelang",
      bounds: [
        [-7.37, 110.14], // Bounds diperluas, pusat di Magelang (-7.47, 110.22)
        [-7.57, 110.3],
      ],
    },
    {
      id: "salatiga",
      name: "Salatiga",
      bounds: [
        [-7.23, 110.42], // Bounds diperluas, pusat di Salatiga (-7.33, 110.50)
        [-7.43, 110.58],
      ],
    },
    {
      id: "tegal_kota",
      name: "Tegal",
      bounds: [
        [-6.76, 109.06], // Bounds diperluas, pusat di Tegal (-6.86, 109.14)
        [-6.96, 109.22],
      ],
    },
    {
      id: "pekalongan_kota",
      name: "Pekalongan",
      bounds: [
        [-6.78, 109.6], // Bounds diperluas, pusat di Pekalongan (-6.88, 109.68)
        [-6.98, 109.76],
      ],
    },

    // === KABUPATEN-KABUPATEN (29 kabupaten) dengan bounds besar, pusat di ibukota ===
    {
      id: "banjarnegara",
      name: "Banjarnegara",
      bounds: [
        [-7.2, 109.61], // Bounds diperluas, pusat di Banjarnegara (-7.30, 109.69)
        [-7.4, 109.77],
      ],
    },
    {
      id: "banyumas",
      name: "Banyumas",
      bounds: [
        [-7.41, 109.22], // Bounds diperluas, pusat di Purwokerto (-7.51, 109.30)
        [-7.61, 109.38],
      ],
    },
    {
      id: "batang",
      name: "Batang",
      bounds: [
        [-6.8, 109.66], // Bounds diperluas, pusat di Batang (-6.90, 109.74)
        [-7.0, 109.82],
      ],
    },
    {
      id: "blora",
      name: "Blora",
      bounds: [
        [-6.86, 111.34], // Bounds diperluas, pusat di Blora (-6.96, 111.42)
        [-7.06, 111.5],
      ],
    },
    {
      id: "boyolali",
      name: "Boyolali",
      bounds: [
        [-7.43, 110.52], // Bounds diperluas, pusat di Boyolali (-7.53, 110.60)
        [-7.63, 110.68],
      ],
    },
    {
      id: "brebes",
      name: "Brebes",
      bounds: [
        [-6.77, 108.97], // Bounds diperluas, pusat di Brebes (-6.87, 109.05)
        [-6.97, 109.13],
      ],
    },
    {
      id: "cilacap",
      name: "Cilacap",
      bounds: [
        [-7.62, 108.94], // Bounds diperluas, pusat di Cilacap (-7.72, 109.02)
        [-7.82, 109.1],
      ],
    },
    {
      id: "demak",
      name: "Demak",
      bounds: [
        [-6.79, 110.57], // Bounds diperluas, pusat di Demak (-6.89, 110.65)
        [-6.99, 110.73],
      ],
    },
    {
      id: "grobogan",
      name: "Grobogan",
      bounds: [
        [-6.95, 110.84], // Bounds diperluas, pusat di Purwodadi (-7.05, 110.92)
        [-7.15, 111.0],
      ],
    },
    {
      id: "jepara",
      name: "Jepara",
      bounds: [
        [-6.48, 110.59], // Bounds diperluas, pusat di Jepara (-6.58, 110.67)
        [-6.68, 110.75],
      ],
    },
    {
      id: "karanganyar",
      name: "Karanganyar",
      bounds: [
        [-7.55, 110.88], // Bounds diperluas, pusat di Karanganyar (-7.65, 110.96)
        [-7.75, 111.04],
      ],
    },
    {
      id: "kebumen",
      name: "Kebumen",
      bounds: [
        [-7.56, 109.58], // Bounds diperluas, pusat di Kebumen (-7.66, 109.66)
        [-7.76, 109.74],
      ],
    },
    {
      id: "kendal",
      name: "Kendal",
      bounds: [
        [-6.81, 110.13], // Bounds diperluas, pusat di Kendal (-6.91, 110.21)
        [-7.01, 110.29],
      ],
    },
    {
      id: "klaten",
      name: "Klaten",
      bounds: [
        [-7.6, 110.53], // Bounds diperluas, pusat di Klaten (-7.70, 110.61)
        [-7.8, 110.69],
      ],
    },
    {
      id: "kudus",
      name: "Kudus",
      bounds: [
        [-6.7, 110.77], // Bounds diperluas, pusat di Kudus (-6.80, 110.85)
        [-6.9, 110.93],
      ],
    },
    {
      id: "magelang_kab",
      name: "Magelang (Kabupaten)",
      bounds: [
        [-7.44, 110.14], // Bounds diperluas, pusat di Mungkid (-7.54, 110.22)
        [-7.64, 110.3],
      ],
    },
    {
      id: "pati",
      name: "Pati",
      bounds: [
        [-6.65, 110.96], // Bounds diperluas, pusat di Pati (-6.75, 111.04)
        [-6.85, 111.12],
      ],
    },
    {
      id: "pekalongan_kab",
      name: "Pekalongan (Kabupaten)",
      bounds: [
        [-6.8, 109.58], // Bounds diperluas, pusat di Kajen (-6.90, 109.66)
        [-7.0, 109.74],
      ],
    },
    {
      id: "pemalang",
      name: "Pemalang",
      bounds: [
        [-6.79, 109.3], // Bounds diperluas, pusat di Pemalang (-6.89, 109.38)
        [-6.99, 109.46],
      ],
    },
    {
      id: "purbalingga",
      name: "Purbalingga",
      bounds: [
        [-7.28, 109.29], // Bounds diperluas, pusat di Purbalingga (-7.38, 109.37)
        [-7.48, 109.45],
      ],
    },
    {
      id: "purworejo",
      name: "Purworejo",
      bounds: [
        [-7.62, 109.93], // Bounds diperluas, pusat di Purworejo (-7.72, 110.01)
        [-7.82, 110.09],
      ],
    },
    {
      id: "rembang",
      name: "Rembang",
      bounds: [
        [-6.6, 111.27], // Bounds diperluas, pusat di Rembang (-6.70, 111.35)
        [-6.8, 111.43],
      ],
    },
    {
      id: "semarang_kab",
      name: "Semarang (Kabupaten)",
      bounds: [
        [-7.05, 110.33], // Bounds diperluas, pusat di Ungaran (-7.15, 110.41)
        [-7.25, 110.49],
      ],
    },
    {
      id: "sragen",
      name: "Sragen",
      bounds: [
        [-7.32, 110.95], // Bounds diperluas, pusat di Sragen (-7.42, 111.03)
        [-7.52, 111.11],
      ],
    },
    {
      id: "sukoharjo",
      name: "Sukoharjo",
      bounds: [
        [-7.58, 110.76], // Bounds diperluas, pusat di Sukoharjo (-7.68, 110.84)
        [-7.78, 110.92],
      ],
    },
    {
      id: "tegal_kab",
      name: "Tegal (Kabupaten)",
      bounds: [
        [-6.79, 109.06], // Bounds diperluas, pusat di Slawi (-6.89, 109.14)
        [-6.99, 109.22],
      ],
    },
    {
      id: "temanggung",
      name: "Temanggung",
      bounds: [
        [-7.21, 110.1], // Bounds diperluas, pusat di Temanggung (-7.31, 110.18)
        [-7.41, 110.26],
      ],
    },
    {
      id: "wonogiri",
      name: "Wonogiri",
      bounds: [
        [-7.71, 110.86], // Bounds diperluas, pusat di Wonogiri (-7.81, 110.94)
        [-7.91, 111.02],
      ],
    },
    {
      id: "wonosobo",
      name: "Wonosobo",
      bounds: [
        [-7.26, 109.83], // Bounds diperluas, pusat di Wonosobo (-7.36, 109.91)
        [-7.46, 109.99],
      ],
    },
  ],
  diy: [
    {
      id: "jogja",
      name: "Yogyakarta",
      bounds: [
        [-7.69, 110.29], // Bounds diperluas, pusat di Yogyakarta (-7.79, 110.37)
        [-7.89, 110.45],
      ],
    },
    {
      id: "sleman",
      name: "Sleman",
      bounds: [
        [-7.61, 110.28], // Bounds diperluas, pusat di Sleman (-7.71, 110.36)
        [-7.81, 110.44],
      ],
    },
    {
      id: "bantul",
      name: "Bantul",
      bounds: [
        [-7.78, 110.25], // Bounds diperluas, pusat di Bantul (-7.88, 110.33)
        [-7.98, 110.41],
      ],
    },
    {
      id: "kulonprogo",
      name: "Kulon Progo",
      bounds: [
        [-7.72, 110.08], // Bounds diperluas, pusat di Wates (-7.82, 110.16)
        [-7.92, 110.24],
      ],
    },
    {
      id: "gunungkidul",
      name: "Gunung Kidul",
      bounds: [
        [-7.81, 110.53], // Bounds diperluas, pusat di Wonosari (-7.91, 110.61)
        [-8.01, 110.69],
      ],
    },
  ],
};

const TambahAsetYardipPage = () => {
  const navigate = useNavigate();

  // Consolidated map state untuk mengurangi re-renders
  const [mapState, setMapState] = useState({
    isDrawing: false,
    newAssetData: null,
    manualAreaAdjustment: null,
    isLocationSelected: false,
    cityBounds: null,
    mapKey: Date.now(), // Key untuk force re-render map jika perlu
  });

  const [error, setError] = useState(null);

  // Location selection states
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Handle location change dari form - menggunakan useCallback
  const handleLocationChange = useCallback((province, city) => {
    console.log("Location change:", province, city);

    setSelectedProvince(province);
    setSelectedCity(city);

    if (province && city) {
      const cities = kotaData[province];
      const selectedCityData = cities?.find((c) => c.id === city);

      if (selectedCityData) {
        setMapState((prev) => ({
          ...prev,
          cityBounds: selectedCityData.bounds,
          isLocationSelected: true,
          // Reset drawing state when location changes
          isDrawing: false,
          newAssetData: null,
          manualAreaAdjustment: null,
          mapKey: Date.now(), // Force map re-render
        }));

        toast.success(
          `Lokasi ${selectedCityData.name} dipilih! Peta akan auto-zoom dan siap untuk menggambar aset.`,
          { duration: 4000 }
        );
      }
    } else {
      setMapState((prev) => ({
        ...prev,
        cityBounds: null,
        isLocationSelected: false,
        isDrawing: false,
        newAssetData: null,
        manualAreaAdjustment: null,
        mapKey: Date.now(),
      }));
    }
  }, []);

  // Handle manual area change dari form - menggunakan useCallback
  const handleAreaChange = useCallback((newArea) => {
    console.log("Manual area change received:", newArea);

    setMapState((prev) => ({
      ...prev,
      manualAreaAdjustment: newArea,
      newAssetData: prev.newAssetData
        ? {
            ...prev.newAssetData,
            area: newArea,
            isManuallyAdjusted: true,
          }
        : prev.newAssetData,
    }));

    toast.success(`Luas area diubah menjadi ${newArea.toFixed(2)} m²`);
  }, []);

  // Handle drawing created - menggunakan useCallback
  const handleDrawingCreated = useCallback((data) => {
    console.log("Drawing created data:", data);

    setMapState((prev) => ({
      ...prev,
      newAssetData: data,
      isDrawing: false,
      manualAreaAdjustment: null, // Reset manual adjustment when new drawing is created
    }));

    toast.success(
      `Lokasi berhasil digambar! Luas area: ${data.area?.toFixed(2)} m²`
    );
  }, []);

  // Toggle drawing mode - menggunakan useCallback
  const toggleDrawing = useCallback(() => {
    setMapState((prev) => ({
      ...prev,
      isDrawing: !prev.isDrawing,
    }));
  }, []);

  // Reset form - menggunakan useCallback
  const resetForm = useCallback(() => {
    setMapState({
      isDrawing: false,
      newAssetData: null,
      manualAreaAdjustment: null,
      isLocationSelected: mapState.isLocationSelected,
      cityBounds: mapState.cityBounds,
      mapKey: Date.now(),
    });
    setError(null);
    toast.success("Gambar peta telah direset!");
  }, [mapState.isLocationSelected, mapState.cityBounds]);

  // Handle save asset - menggunakan useCallback
  const handleSaveAsset = useCallback(
    async (assetData) => {
      if (!mapState.newAssetData) {
        toast.error("Silakan gambar lokasi di peta terlebih dahulu!");
        return;
      }

      const toastId = toast.loading("Menyimpan data aset yardip...");
      try {
        let formattedLokasi;

        if (
          mapState.newAssetData.geometry &&
          mapState.newAssetData.geometry.coordinates
        ) {
          formattedLokasi = mapState.newAssetData.geometry.coordinates;
        } else if (Array.isArray(mapState.newAssetData.geometry)) {
          formattedLokasi = mapState.newAssetData.geometry;
        } else {
          formattedLokasi = mapState.newAssetData.geometry;
        }

        const selectedCityData = kotaData[selectedProvince]?.find(
          (c) => c.id === selectedCity
        );

        // Use manual area if available, otherwise use drawn area
        const finalArea =
          mapState.manualAreaAdjustment || mapState.newAssetData.area;

        const payload = {
          ...assetData,
          id: `Y${Date.now()}`,
          lokasi: JSON.stringify(formattedLokasi),
          area: finalArea,
          originalDrawnArea: mapState.newAssetData.area,
          isManuallyAdjusted: !!mapState.manualAreaAdjustment,
          type: "yardip",
          kota: selectedCityData?.name || "",
          kota_id: selectedCity,
          provinsi:
            selectedProvince === "jateng" ? "Jawa Tengah" : "DI Yogyakarta",
          provinsi_id: selectedProvince,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log("Payload being sent:", payload);

        const response = await axios.post(`${API_URL}/yardip_assets`, payload);

        console.log("Response from server:", response.data);

        toast.success("Aset Yardip berhasil ditambahkan!", { id: toastId });

        setTimeout(() => {
          navigate("/data-aset-yardip");
        }, 1500);
      } catch (err) {
        toast.error("Gagal menyimpan aset yardip.", { id: toastId });
        console.error("Error saving yardip asset:", err);
        console.error("Error response:", err.response?.data);
        setError(
          `Gagal menyimpan aset yardip: ${
            err.response?.data?.message || err.message
          }`
        );
      }
    },
    [
      mapState.newAssetData,
      mapState.manualAreaAdjustment,
      selectedProvince,
      selectedCity,
      navigate,
    ]
  );

  // Handle cancel - menggunakan useCallback
  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Get selected city data - menggunakan useMemo
  const selectedCityData = useMemo(() => {
    if (!selectedProvince || !selectedCity) return null;
    return kotaData[selectedProvince]?.find((c) => c.id === selectedCity);
  }, [selectedProvince, selectedCity]);

  // Get current effective area - menggunakan useMemo
  const currentEffectiveArea = useMemo(() => {
    return mapState.manualAreaAdjustment || mapState.newAssetData?.area || 0;
  }, [mapState.manualAreaAdjustment, mapState.newAssetData?.area]);

  // Error boundary handlers
  const handleMapError = useCallback(() => {
    console.warn("Map error occurred, resetting map state");
    setMapState((prev) => ({
      ...prev,
      mapKey: Date.now(),
    }));
  }, []);

  const handleFallbackMode = useCallback(() => {
    toast.info(
      "Beralih ke mode tanpa peta. Anda tetap bisa mengisi form data."
    );
    setMapState((prev) => ({
      ...prev,
      isLocationSelected: true,
      newAssetData: { area: 0, geometry: null }, // Dummy data untuk enable form
    }));
  }, []);

  return (
    <Container fluid className="mt-4">
      <h3 className="mb-4">
        Tambah Aset Yardip Baru
        {selectedCityData && (
          <small className="text-muted ms-2">- {selectedCityData.name}</small>
        )}
      </h3>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Location Info Alert - Only show when location is selected */}
      {mapState.isLocationSelected && (
        <Alert variant="success" className="mb-3 border-0 shadow-sm">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div>
                <div className="fw-bold">
                  Lokasi Target: {selectedCityData?.name}
                </div>
                <small className="text-success">
                  {selectedProvince === "jateng"
                    ? "Jawa Tengah"
                    : "DI Yogyakarta"}{" "}
                  • Peta telah auto-zoom ke area target • Siap untuk menggambar
                  aset
                </small>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Manual Area Adjustment Alert */}
      {mapState.manualAreaAdjustment && mapState.newAssetData && (
        <Alert variant="warning" className="mb-3 border-0 shadow-sm">
          <div className="d-flex align-items-center">
            <div>
              <div className="fw-bold">Luas Area Telah Diubah Manual</div>
              <small className="text-warning">
                Dari {mapState.newAssetData.area.toFixed(2)} m² menjadi{" "}
                {mapState.manualAreaAdjustment.toFixed(2)} m² • Polygon di peta
                akan menyesuaikan dengan luas baru
              </small>
            </div>
          </div>
        </Alert>
      )}

      {/* Debug info untuk development */}
      {process.env.NODE_ENV === "development" && (
        <Alert
          variant="info"
          className="mb-3 border-0"
          style={{ background: "rgba(13,202,240,0.05)" }}
        >
          <details>
            <summary className="fw-bold text-primary mb-2 cursor-pointer">
              Debug Information (Development Only)
            </summary>
            <div className="small">
              <div className="row">
                <div className="col-md-6">
                  <strong>Database:</strong>
                  <br />
                  - Collection: yardip_assets
                  <br />
                  - Endpoint: POST /yardip_assets
                  <br />
                  - ID Prefix: Y (Yardip)
                  <br />- Selected Province: {selectedProvince}
                  <br />- Selected City: {selectedCity}
                  <br />- Map Key: {mapState.mapKey}
                </div>
                <div className="col-md-6">
                  <strong>Map & Area State:</strong>
                  <br />- Location Selected:{" "}
                  {mapState.isLocationSelected ? "Yes" : "No"}
                  <br />- City Bounds:{" "}
                  {mapState.cityBounds
                    ? `${mapState.cityBounds[0][0]},${mapState.cityBounds[0][1]} to ${mapState.cityBounds[1][0]},${mapState.cityBounds[1][1]}`
                    : "None"}
                  <br />- Drawing State:{" "}
                  {mapState.isDrawing ? "Active" : "Inactive"}
                  <br />- New Asset Data:{" "}
                  {mapState.newAssetData ? "Ready" : "None"}
                  {mapState.newAssetData && (
                    <>
                      <br />- Original Area:{" "}
                      {mapState.newAssetData.area?.toFixed(2)} m²
                      <br />- Manual Adjustment:{" "}
                      {mapState.manualAreaAdjustment
                        ? mapState.manualAreaAdjustment.toFixed(2) + " m²"
                        : "None"}
                      <br />- Effective Area: {currentEffectiveArea.toFixed(2)}{" "}
                      m²
                      <br />- Geometry Type:{" "}
                      {mapState.newAssetData.geometry?.type || "Array"}
                    </>
                  )}
                </div>
              </div>
            </div>
          </details>
        </Alert>
      )}

      <Row>
        <Col md={7}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white border-bottom-0">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex gap-2 align-items-center">
                  <Button
                    onClick={toggleDrawing}
                    variant={mapState.isDrawing ? "danger" : "primary"}
                    size="sm"
                    disabled={!mapState.isLocationSelected}
                  >
                    {mapState.isDrawing ? (
                      <>
                        <i className="bi bi-x-circle me-1"></i>
                        Batalkan Menggambar
                      </>
                    ) : (
                      <>
                        <i className="bi bi-pencil-square me-1"></i>
                        Gambar Lokasi Aset
                      </>
                    )}
                  </Button>

                  {mapState.newAssetData && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={resetForm}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Reset Gambar
                    </Button>
                  )}
                </div>

                {mapState.newAssetData && (
                  <div className="text-success small">
                    <i className="bi bi-check-circle-fill me-1"></i>
                    Area: {currentEffectiveArea.toFixed(2)} m²
                    {mapState.manualAreaAdjustment && (
                      <small className="text-warning ms-1">(Manual)</small>
                    )}
                  </div>
                )}
              </div>

              {!mapState.isLocationSelected && (
                <Alert variant="warning" className="mb-0 mt-2 py-2">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    Pilih lokasi di form terlebih dahulu untuk mengaktifkan
                    fitur menggambar di peta.
                  </small>
                </Alert>
              )}

              {mapState.isDrawing && (
                <Alert variant="info" className="mb-0 mt-2 py-2">
                  <small>
                    <i className="bi bi-pencil me-1"></i>
                    Klik pada peta untuk mulai menggambar polygon. Klik ganda
                    untuk menyelesaikan.
                  </small>
                </Alert>
              )}
            </Card.Header>
          </Card>

          <div
            className="border rounded shadow-sm overflow-hidden position-relative"
            style={{ height: "70vh", width: "100%" }}
          >
            {mapState.isLocationSelected ? (
              <MapErrorBoundary
                height="70vh"
                onRetry={handleMapError}
                onFallback={handleFallbackMode}
              >
                <PetaAsetYardip
                  key={`map-${mapState.mapKey}`}
                  assets={[]}
                  isDrawing={mapState.isDrawing}
                  onDrawingCreated={handleDrawingCreated}
                  jatengBoundary={jatengBoundary}
                  diyBoundary={diyBoundary}
                  cityBounds={mapState.cityBounds}
                  selectedCity={selectedCityData?.name}
                  manualAreaAdjustment={mapState.manualAreaAdjustment}
                  originalGeometry={mapState.newAssetData?.geometry}
                />
              </MapErrorBoundary>
            ) : (
              <div
                className="position-absolute d-flex align-items-center justify-content-center w-100 h-100 bg-white bg-opacity-75"
                style={{ zIndex: 900 }}
              >
                <div className="text-center">
                  <i className="bi bi-geo-alt display-4 text-muted mb-3"></i>
                  <h5 className="text-muted">Pilih Lokasi Terlebih Dahulu</h5>
                  <p className="text-muted">
                    Gunakan form yang di sediakan untuk memilih provinsi dan
                    kota
                  </p>
                </div>
              </div>
            )}
          </div>
        </Col>

        <Col md={5}>
          <div className="card border-0 shadow-sm">
            <FormYardip
              onSave={handleSaveAsset}
              onCancel={handleCancel}
              initialGeometry={
                mapState.newAssetData ? mapState.newAssetData.geometry : null
              }
              initialArea={
                mapState.newAssetData ? mapState.newAssetData.area : null
              }
              isEnabled={true} // Form always enabled, but location selection controls map
              selectedCity={selectedCityData?.name}
              selectedProvince={
                selectedProvince === "jateng" ? "Jawa Tengah" : "DI Yogyakarta"
              }
              kotaData={kotaData} // Pass kotaData to form
              onLocationChange={handleLocationChange} // Pass location change handler
              hasDrawnArea={!!mapState.newAssetData} // Pass info about drawn area
              onAreaChange={handleAreaChange} // Pass area change handler
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetYardipPage;
