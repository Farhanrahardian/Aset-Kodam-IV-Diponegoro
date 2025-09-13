import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Card,
  Form,
} from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PetaAsetYardip from "../components/PetaAsetYardip";
import FormYardip from "../components/FormYardip";
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// Enhanced city data with better bounds for auto zoom
const kotaData = {
  jateng: [
    {
      id: "semarang",
      name: "Semarang",
      bounds: [
        [-6.95, 110.35],
        [-7.05, 110.45],
      ],
    },
    {
      id: "solo",
      name: "Surakarta (Solo)",
      bounds: [
        [-7.52, 110.75],
        [-7.62, 110.85],
      ],
    },
    {
      id: "yogya",
      name: "Yogyakarta",
      bounds: [
        [-7.72, 110.32],
        [-7.82, 110.42],
      ],
    },
    {
      id: "magelang",
      name: "Magelang",
      bounds: [
        [-7.42, 110.18],
        [-7.52, 110.28],
      ],
    },
    {
      id: "salatiga",
      name: "Salatiga",
      bounds: [
        [-7.32, 110.42],
        [-7.42, 110.52],
      ],
    },
    {
      id: "tegal",
      name: "Tegal",
      bounds: [
        [-6.83, 109.12],
        [-6.93, 109.22],
      ],
    },
    {
      id: "pekalongan",
      name: "Pekalongan",
      bounds: [
        [-6.83, 109.63],
        [-6.93, 109.73],
      ],
    },
    {
      id: "purwokerto",
      name: "Purwokerto",
      bounds: [
        [-7.42, 109.22],
        [-7.52, 109.32],
      ],
    },
    {
      id: "cilacap",
      name: "Cilacap",
      bounds: [
        [-7.68, 109.02],
        [-7.78, 109.12],
      ],
    },
    {
      id: "kudus",
      name: "Kudus",
      bounds: [
        [-6.78, 110.82],
        [-6.88, 110.92],
      ],
    },
    {
      id: "jepara",
      name: "Jepara",
      bounds: [
        [-6.55, 110.62],
        [-6.65, 110.72],
      ],
    },
    {
      id: "rembang",
      name: "Rembang",
      bounds: [
        [-6.68, 111.32],
        [-6.78, 111.42],
      ],
    },
  ],
  diy: [
    {
      id: "jogja",
      name: "Yogyakarta",
      bounds: [
        [-7.72, 110.32],
        [-7.82, 110.42],
      ],
    },
    {
      id: "sleman",
      name: "Sleman",
      bounds: [
        [-7.62, 110.28],
        [-7.72, 110.38],
      ],
    },
    {
      id: "bantul",
      name: "Bantul",
      bounds: [
        [-7.82, 110.28],
        [-7.92, 110.38],
      ],
    },
    {
      id: "kulonprogo",
      name: "Kulon Progo",
      bounds: [
        [-7.72, 110.05],
        [-7.82, 110.15],
      ],
    },
    {
      id: "gunungkidul",
      name: "Gunung Kidul",
      bounds: [
        [-7.92, 110.45],
        [-8.02, 110.55],
      ],
    },
  ],
};

const TambahAsetYardipPage = () => {
  const navigate = useNavigate();
  const [isDrawing, setIsDrawing] = useState(false);
  const [newAssetData, setNewAssetData] = useState(null);
  const [error, setError] = useState(null);

  // Location selection states
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cityBounds, setCityBounds] = useState(null);
  const [isLocationSelected, setIsLocationSelected] = useState(false);

  // Manual area adjustment state
  const [manualAreaAdjustment, setManualAreaAdjustment] = useState(null);

  // Handle location selection from form
  const handleLocationChange = (province, city) => {
    setSelectedProvince(province);
    setSelectedCity(city);

    if (province && city) {
      const cities = kotaData[province];
      const selectedCityData = cities.find((c) => c.id === city);

      if (selectedCityData) {
        setCityBounds(selectedCityData.bounds);
        setIsLocationSelected(true);

        toast.success(
          `📍 Lokasi ${selectedCityData.name} dipilih! Peta akan auto-zoom dan siap untuk menggambar aset.`,
          { duration: 4000 }
        );
      }
    } else {
      setCityBounds(null);
      setIsLocationSelected(false);
      // Reset drawing state when location is cleared
      setIsDrawing(false);
      setNewAssetData(null);
      setManualAreaAdjustment(null);
    }
  };

  // Handle manual area change from form
  const handleAreaChange = (newArea) => {
    console.log("Manual area change received:", newArea);
    setManualAreaAdjustment(newArea);

    // Update the newAssetData with new area
    if (newAssetData) {
      setNewAssetData((prev) => ({
        ...prev,
        area: newArea,
        isManuallyAdjusted: true,
      }));
    }

    toast.success(`📐 Luas area diubah menjadi ${newArea.toFixed(2)} m²`);
  };

  const handleDrawingCreated = (data) => {
    console.log("Drawing created data:", data);
    setNewAssetData(data);
    setIsDrawing(false);
    setManualAreaAdjustment(null); // Reset manual adjustment when new drawing is created

    toast.success(
      ` Lokasi berhasil digambar! Luas area: ${data.area?.toFixed(2)} m²`
    );
  };

  const handleSaveAsset = async (assetData) => {
    if (!newAssetData) {
      toast.error("Silakan gambar lokasi di peta terlebih dahulu!");
      return;
    }

    const toastId = toast.loading("Menyimpan data aset yardip...");
    try {
      let formattedLokasi;

      if (newAssetData.geometry && newAssetData.geometry.coordinates) {
        formattedLokasi = newAssetData.geometry.coordinates;
      } else if (Array.isArray(newAssetData.geometry)) {
        formattedLokasi = newAssetData.geometry;
      } else {
        formattedLokasi = newAssetData.geometry;
      }

      const selectedCityData = kotaData[selectedProvince].find(
        (c) => c.id === selectedCity
      );

      // Use manual area if available, otherwise use drawn area
      const finalArea = manualAreaAdjustment || newAssetData.area;

      const payload = {
        ...assetData,
        id: `Y${Date.now()}`,
        lokasi: JSON.stringify(formattedLokasi),
        area: finalArea,
        originalDrawnArea: newAssetData.area,
        isManuallyAdjusted: !!manualAreaAdjustment,
        type: "yardip",
        kota: selectedCityData.name,
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

      toast.success(" Aset Yardip berhasil ditambahkan!", { id: toastId });

      setTimeout(() => {
        navigate("/data-aset-yardip");
      }, 1500);
    } catch (err) {
      toast.error("❌ Gagal menyimpan aset yardip.", { id: toastId });
      console.error("Error saving yardip asset:", err);
      console.error("Error response:", err.response?.data);
      setError(
        `Gagal menyimpan aset yardip: ${
          err.response?.data?.message || err.message
        }`
      );
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const resetForm = () => {
    setNewAssetData(null);
    setIsDrawing(false);
    setError(null);
    setManualAreaAdjustment(null);
    toast.success("Gambar peta telah direset!");
  };

  const getSelectedCityData = () => {
    if (!selectedProvince || !selectedCity) return null;
    return kotaData[selectedProvince].find((c) => c.id === selectedCity);
  };

  // Get current effective area (manual adjustment or original drawn area)
  const getCurrentEffectiveArea = () => {
    return manualAreaAdjustment || newAssetData?.area || 0;
  };

  return (
    <Container fluid className="mt-4">
      <h3 className="mb-4">
        Tambah Aset Yardip Baru
        {getSelectedCityData() && (
          <small className="text-muted ms-2">
            - {getSelectedCityData().name}
          </small>
        )}
      </h3>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Location Info Alert - Only show when location is selected */}
      {isLocationSelected && (
        <Alert variant="success" className="mb-3 border-0 shadow-sm">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <div>
                <div className="fw-bold">
                  📍 Lokasi Target: {getSelectedCityData()?.name}
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
      {manualAreaAdjustment && newAssetData && (
        <Alert variant="warning" className="mb-3 border-0 shadow-sm">
          <div className="d-flex align-items-center">
            <div>
              <div className="fw-bold">⚠️ Luas Area Telah Diubah Manual</div>
              <small className="text-warning">
                Dari {newAssetData.area.toFixed(2)} m² menjadi{" "}
                {manualAreaAdjustment.toFixed(2)} m² • Polygon di peta akan
                menyesuaikan dengan luas baru
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
                </div>
                <div className="col-md-6">
                  <strong>Map & Area State:</strong>
                  <br />- Location Selected: {isLocationSelected ? "Yes" : "No"}
                  <br />- City Bounds:{" "}
                  {cityBounds
                    ? `${cityBounds[0][0]},${cityBounds[0][1]} to ${cityBounds[1][0]},${cityBounds[1][1]}`
                    : "None"}
                  <br />- Drawing State: {isDrawing ? "Active" : "Inactive"}
                  <br />- New Asset Data: {newAssetData ? "Ready" : "None"}
                  {newAssetData && (
                    <>
                      <br />- Original Area: {newAssetData.area?.toFixed(2)} m²
                      <br />- Manual Adjustment:{" "}
                      {manualAreaAdjustment
                        ? manualAreaAdjustment.toFixed(2) + " m²"
                        : "None"}
                      <br />- Effective Area:{" "}
                      {getCurrentEffectiveArea().toFixed(2)} m²
                      <br />- Geometry Type:{" "}
                      {newAssetData.geometry?.type || "Array"}
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
                    onClick={() => setIsDrawing(!isDrawing)}
                    variant={isDrawing ? "danger" : "primary"}
                    size="sm"
                    disabled={!isLocationSelected}
                  >
                    {isDrawing ? (
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

                  {newAssetData && (
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

                {newAssetData && (
                  <div className="text-success small">
                    <i className="bi bi-check-circle-fill me-1"></i>
                    Area: {getCurrentEffectiveArea().toFixed(2)} m²
                    {manualAreaAdjustment && (
                      <small className="text-warning ms-1">(Manual)</small>
                    )}
                  </div>
                )}
              </div>

              {!isLocationSelected && (
                <Alert variant="warning" className="mb-0 mt-2 py-2">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    Pilih lokasi di form terlebih dahulu untuk mengaktifkan
                    fitur menggambar di peta.
                  </small>
                </Alert>
              )}

              {isDrawing && (
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
            style={{
              height: "70vh",
              width: "100%",
              opacity: isLocationSelected ? 1 : 0.6,
              pointerEvents: isLocationSelected ? "auto" : "none",
            }}
            className="border rounded shadow-sm overflow-hidden position-relative"
          >
            {!isLocationSelected && (
              <div
                className="position-absolute d-flex align-items-center justify-content-center w-100 h-100 bg-white bg-opacity-75"
                style={{ zIndex: 1000 }}
              >
                <div className="text-center">
                  <i className="bi bi-geo-alt display-4 text-muted mb-3"></i>
                  <h5 className="text-muted">Pilih Lokasi Terlebih Dahulu</h5>
                  <p className="text-muted">
                    Gunakan form di sebelah kanan untuk memilih provinsi dan
                    kota
                  </p>
                </div>
              </div>
            )}
            <PetaAsetYardip
              assets={[]}
              isDrawing={isDrawing}
              onDrawingCreated={handleDrawingCreated}
              jatengBoundary={jatengBoundary}
              diyBoundary={diyBoundary}
              cityBounds={cityBounds}
              selectedCity={getSelectedCityData()?.name}
              manualAreaAdjustment={manualAreaAdjustment}
              originalGeometry={newAssetData?.geometry}
            />
          </div>
        </Col>

        <Col md={5}>
          <div className="card border-0 shadow-sm">
            <FormYardip
              onSave={handleSaveAsset}
              onCancel={handleCancel}
              initialGeometry={newAssetData ? newAssetData.geometry : null}
              initialArea={newAssetData ? newAssetData.area : null}
              isEnabled={true} // Form always enabled, but location selection controls map
              selectedCity={getSelectedCityData()?.name}
              selectedProvince={
                selectedProvince === "jateng" ? "Jawa Tengah" : "DI Yogyakarta"
              }
              kotaData={kotaData} // Pass kotaData to form
              onLocationChange={handleLocationChange} // Pass location change handler
              hasDrawnArea={!!newAssetData} // Pass info about drawn area
              onAreaChange={handleAreaChange} // Pass area change handler
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetYardipPage;
