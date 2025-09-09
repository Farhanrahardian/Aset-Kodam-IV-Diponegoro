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
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [error, setError] = useState(null);

  // Enhanced states for city selection with loading
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cityBounds, setCityBounds] = useState(null);
  const [showMapAndForm, setShowMapAndForm] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);

  const handleProvinceChange = (e) => {
    const province = e.target.value;
    setSelectedProvince(province);
    setSelectedCity("");
    setCityBounds(null);
    setShowMapAndForm(false);
    setIsLoadingMap(false);

    if (province) {
      toast.success(
        `Provinsi ${
          province === "jateng" ? "Jawa Tengah" : "DI Yogyakarta"
        } dipilih!`
      );
    }
  };

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);

    if (cityId && selectedProvince) {
      const cities = kotaData[selectedProvince];
      const selectedCityData = cities.find((city) => city.id === cityId);

      if (selectedCityData) {
        setIsLoadingMap(true);

        // Show loading state briefly
        toast.loading(`Memuat peta untuk ${selectedCityData.name}...`, {
          id: "map-loading",
        });

        // Set city bounds and enable map after a brief delay
        setTimeout(() => {
          setCityBounds(selectedCityData.bounds);
          setShowMapAndForm(true);
          setIsLoadingMap(false);

          toast.success(
            ` Peta ${selectedCityData.name} siap! Area target telah dipilih dan peta akan auto-zoom ke lokasi.`,
            { id: "map-loading", duration: 4000 }
          );
        }, 800);
      }
    } else {
      setCityBounds(null);
      setShowMapAndForm(false);
      setIsLoadingMap(false);
    }
  };

  const handleDrawingCreated = (data) => {
    console.log("Drawing created data:", data);
    setNewAssetData(data);
    setIsDrawing(false);
    setIsFormEnabled(true);

    toast.success(
      `✅ Lokasi berhasil digambar! Luas area: ${data.area?.toFixed(2)} m²`
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

      const payload = {
        ...assetData,
        id: `Y${Date.now()}`,
        lokasi: JSON.stringify(formattedLokasi),
        area: newAssetData.area,
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
    if (isFormEnabled) {
      setIsFormEnabled(false);
      setNewAssetData(null);
      setIsDrawing(false);
      toast.success("Form direset. Silakan gambar ulang lokasi aset.");
    } else {
      navigate(-1);
    }
  };

  const resetForm = () => {
    setIsFormEnabled(false);
    setNewAssetData(null);
    setIsDrawing(false);
    setError(null);
    toast.success("Form dan gambar telah direset!");
  };

  const resetSelection = () => {
    setSelectedProvince("");
    setSelectedCity("");
    setCityBounds(null);
    setShowMapAndForm(false);
    setIsLoadingMap(false);
    resetForm();

    // Using basic toast with custom styling instead of toast.info
    toast("Pemilihan lokasi direset. Silakan pilih ulang provinsi dan kota.", {
      duration: 3000,
      style: {
        background: "#3b82f6",
        color: "#fff",
      },
    });
  };

  const getSelectedCityData = () => {
    if (!selectedProvince || !selectedCity) return null;
    return kotaData[selectedProvince].find((c) => c.id === selectedCity);
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

      {/* City Selection Card - Enhanced UI */}
      {!showMapAndForm && !isLoadingMap && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Header
            className="bg-gradient"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
            }}
          >
            <div className="d-flex align-items-center">
              <div>
                <h5 className="mb-1">Pilih Lokasi Target</h5>
                <small className="opacity-75">
                  Tentukan provinsi dan kota untuk penempatan aset Yardip
                </small>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-4">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-secondary mb-2">
                    <i className="bi bi-geo-alt-fill me-2 text-primary"></i>
                    Pilih Provinsi:
                  </Form.Label>
                  <Form.Select
                    value={selectedProvince}
                    onChange={handleProvinceChange}
                    size="lg"
                    className="border-0 bg-light"
                  >
                    <option value="">-- Pilih Provinsi --</option>
                    <option value="jateng"> Jawa Tengah</option>
                    <option value="diy"> DI Yogyakarta</option>
                  </Form.Select>
                  {selectedProvince && (
                    <Form.Text className="text-success">
                      ✅{" "}
                      {selectedProvince === "jateng"
                        ? "Jawa Tengah"
                        : "DI Yogyakarta"}{" "}
                      dipilih
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-secondary mb-2">
                    <i className="bi bi-building me-2 text-warning"></i>
                    Pilih Kota/Kabupaten:
                  </Form.Label>
                  <Form.Select
                    value={selectedCity}
                    onChange={handleCityChange}
                    disabled={!selectedProvince}
                    size="lg"
                    className="border-0 bg-light"
                  >
                    <option value="">-- Pilih Kota --</option>
                    {selectedProvince &&
                      kotaData[selectedProvince].map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                  </Form.Select>
                  {selectedCity && (
                    <Form.Text className="text-success">
                      ✅ {getSelectedCityData()?.name} dipilih
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <div className="border-top pt-3 mt-3">
              {selectedProvince && selectedCity && (
                <Alert
                  variant="success"
                  className="mb-0 border-0"
                  style={{ background: "rgba(25,135,84,0.1)" }}
                >
                  <div className="d-flex align-items-center">
                    <div className="me-3 fs-5">✅</div>
                    <div>
                      <strong>Siap!</strong> Lokasi telah dipilih. Peta akan
                      segera dimuat dengan auto-zoom ke area{" "}
                      {getSelectedCityData()?.name}.
                    </div>
                  </div>
                </Alert>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingMap && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-primary mb-2">Memuat Peta...</h5>
            <p className="text-muted mb-0">
              Sedang mempersiapkan peta untuk {getSelectedCityData()?.name}
              <br />
              <small>Peta akan otomatis zoom ke area yang dipilih</small>
            </p>
          </Card.Body>
        </Card>
      )}

      {/* Map and Form Section - Only show after city selection */}
      {showMapAndForm && !isLoadingMap && (
        <>
          {/* Selected Location Info - Enhanced */}
          <Alert variant="success" className="mb-3 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div>
                  <div className="fw-bold">
                    Lokasi Target: {getSelectedCityData()?.name}
                  </div>
                  <small className="text-success">
                    {selectedProvince === "jateng"
                      ? "Jawa Tengah"
                      : "DI Yogyakarta"}{" "}
                    • Peta telah auto-zoom ke area target • Siap untuk
                    menggambar aset
                  </small>
                </div>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={resetSelection}
              >
                <i className="bi bi-arrow-left-circle me-1"></i>
                Ganti Lokasi
              </Button>
            </div>
          </Alert>

          {/* Debug info untuk development - Enhanced */}
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
                      <strong>Map State:</strong>
                      <br />- City Bounds:{" "}
                      {cityBounds
                        ? `${cityBounds[0][0]},${cityBounds[0][1]} to ${cityBounds[1][0]},${cityBounds[1][1]}`
                        : "None"}
                      <br />- Drawing State: {isDrawing ? "Active" : "Inactive"}
                      <br />- Form Enabled: {isFormEnabled ? "Yes" : "No"}
                      <br />- New Asset Data: {newAssetData ? "Ready" : "None"}
                      {newAssetData && (
                        <>
                          <br />- Area: {newAssetData.area?.toFixed(2)} m²
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

                      {isFormEnabled && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={resetForm}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Reset
                        </Button>
                      )}
                    </div>

                    {newAssetData && (
                      <div className="text-success small">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Area: {newAssetData.area?.toFixed(2)} m²
                      </div>
                    )}
                  </div>

                  {isDrawing && (
                    <Alert variant="warning" className="mb-0 mt-2 py-2">
                      <small>
                        <i className="bi bi-info-circle me-1"></i>
                        Klik pada peta untuk mulai menggambar polygon. Klik
                        ganda untuk menyelesaikan.
                      </small>
                    </Alert>
                  )}
                </Card.Header>
              </Card>

              <div
                style={{ height: "70vh", width: "100%" }}
                className="border rounded shadow-sm overflow-hidden"
              >
                <PetaAsetYardip
                  assets={[]}
                  isDrawing={isDrawing}
                  onDrawingCreated={handleDrawingCreated}
                  jatengBoundary={jatengBoundary}
                  diyBoundary={diyBoundary}
                  cityBounds={cityBounds} // Pass city bounds to map for auto zoom
                  selectedCity={getSelectedCityData()?.name} // Pass selected city info
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
                  isEnabled={isFormEnabled}
                  selectedCity={getSelectedCityData()?.name}
                  selectedProvince={
                    selectedProvince === "jateng"
                      ? "Jawa Tengah"
                      : "DI Yogyakarta"
                  }
                />
              </div>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default TambahAsetYardipPage;
