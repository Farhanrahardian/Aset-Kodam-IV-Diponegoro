import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  Card,
  Form,
} from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PetaGambarAset from "../components/PetaGambarAset";
import FormAset from "../components/FormAset";

const API_URL = "http://localhost:3001";

const TambahAsetPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [koremList, setKoremList] = useState([]);
  const [kodimList, setKodimList] = useState([]);

  // We only need one boundary file as they appear to be the same
  const [kodimBoundaries, setKodimBoundaries] = useState(null);

  const [selectedKoremId, setSelectedKoremId] = useState("");
  const [selectedKodimId, setSelectedKodimId] = useState(""); // This will now store the Kodim name

  const [selectedKorem, setSelectedKorem] = useState(null); // This will hold the GeoJSON feature
  const [selectedKodim, setSelectedKodim] = useState(null); // This will hold the GeoJSON feature

  const [drawnAsset, setDrawnAsset] = useState(null);
  const [isFormEnabled, setIsFormEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [koremRes, kodimGeoRes] = await Promise.all([
          axios.get(`${API_URL}/korem`),
          axios.get(`/data/Kodim.geojson`),
        ]);
        setKoremList(koremRes.data);
        setKodimBoundaries(kodimGeoRes.data);
      } catch (err) {
        setError("Gagal memuat data. Coba muat ulang halaman.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const proceedToStep2 = useCallback((koremId, kodimName) => {
    if (!kodimBoundaries) return;

    // Find the boundary for the selected Kodim
    const kodimFeature = kodimBoundaries.features.find(
      (f) => {
        const featureName = f.properties.listkodim_Kodim;
        // Handle the specific mismatch for Semarang
        if (kodimName === "Kodim 0733/Kota Semarang") {
          return featureName.startsWith("Kodim 0733/Semarang");
        }
        return featureName === kodimName;
      }
    );

    // For the Korem boundary, we'll just find the first Kodim that belongs to it as a representative area
    const koremData = koremList.find(k => k.id === koremId);
    const firstKodimName = koremData?.kodim[0] || kodimName; // Fallback to current kodim if no list
    const koremFeature = kodimBoundaries.features.find(
        (f) => f.properties.listkodim_Kodim === firstKodimName
    );

    setSelectedKorem(koremFeature);
    setSelectedKodim(kodimFeature);
    setStep(2);
    toast.success("Lokasi dipilih! Silakan gambar area aset di peta.");

  }, [kodimBoundaries, koremList]);


  useEffect(() => {
    if (!selectedKoremId) {
      setKodimList([]);
      setSelectedKodimId("");
      return;
    }

    const korem = koremList.find(k => k.id === selectedKoremId);
    if (korem) {
      if (korem.kodim && korem.kodim.length === 0) {
        setSelectedKodimId(korem.nama);
        proceedToStep2(selectedKoremId, korem.nama);
      } else {
        const kodimObjects = korem.kodim.map(kName => ({ id: kName, nama: kName }));
        setKodimList(kodimObjects);
        setSelectedKodimId("");
      }
    }
  }, [selectedKoremId, koremList, proceedToStep2]);

  const handleNextStep = () => {
    if (!selectedKoremId || !selectedKodimId) {
      toast.error("Pilih Korem dan Kodim terlebih dahulu.");
      return;
    }
    proceedToStep2(selectedKoremId, selectedKodimId);
  };

  const handleDrawingCreated = (data) => {
    if (!data || !data.geometry) {
      toast.error("Data gambar tidak valid.");
      return;
    }
    setDrawnAsset(data);
    setIsFormEnabled(true);
    toast.success(`Polygon berhasil digambar! Luas: ${data.area.toFixed(2)} m²`);
  };

  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading("Menyimpan data aset...");
    try {
      if (!drawnAsset || !drawnAsset.geometry) {
        toast.error("Data lokasi dari gambar tidak tersedia.", { id: toastId });
        return;
      }
      const finalAssetData = {
        ...assetData,
        id: `T${Date.now()}`,
        lokasi: drawnAsset.geometry,
        luas: drawnAsset.area,
        korem_id: selectedKoremId,
        kodim: selectedKodimId,
      };
      await axios.post(`${API_URL}/assets`, finalAssetData);
      toast.success("Aset berhasil ditambahkan!", { id: toastId });
      navigate("/data-aset-tanah");
    } catch (err) {
      toast.error("Gagal menyimpan aset.", { id: toastId });
    }
  };

  const handleBackToSelection = () => {
    setStep(1);
    setDrawnAsset(null);
    setIsFormEnabled(false);
    setSelectedKoremId("");
    setSelectedKodimId("");
  };

  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Tambah Aset Tanah Baru</h4>
                {step === 2 && (
                  <Button variant="secondary" size="sm" onClick={handleBackToSelection}>
                    Kembali ke Pemilihan Lokasi
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {step === 1 && (
                <div>
                  <h5>Langkah 1: Pilih Lokasi Aset</h5>
                  <hr />
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pilih Korem</Form.Label>
                        <Form.Select value={selectedKoremId} onChange={(e) => setSelectedKoremId(e.target.value)}>
                          <option value="">-- Pilih Korem --</option>
                          {koremList.map((korem) => (<option key={korem.id} value={korem.id}>{korem.nama}</option>))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pilih Kodim</Form.Label>
                        <Form.Select value={selectedKodimId} onChange={(e) => setSelectedKodimId(e.target.value)} disabled={!selectedKoremId || (kodimList && kodimList.length === 0)}>
                          <option value="">-- Pilih Kodim --</option>
                          {kodimList.map((kodim) => (<option key={kodim.id} value={kodim.id}>{kodim.nama}</option>))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end">
                    <Button onClick={handleNextStep} disabled={!selectedKoremId || !selectedKodimId}>
                      Lanjutkan ke Peta
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <Row>
                  <Col md={7}>
                    <h5>Langkah 2: Gambar Lokasi & Lengkapi Detail</h5>
                    <Alert variant="info" className="mt-3">
                      Gunakan kontrol di pojok kanan atas peta untuk menggambar batas area aset (polygon).
                    </Alert>
                    <div style={{ height: "70vh", width: "100%" }}>
                      <PetaGambarAset onPolygonCreated={handleDrawingCreated} selectedKorem={selectedKorem} selectedKodim={selectedKodim} />
                    </div>
                  </Col>
                  <Col md={5}>
                    <FormAset
                      onSave={handleSaveAsset}
                      onCancel={handleBackToSelection}
                      koremList={koremList}
                      kodimList={kodimList}
                      selectedKorem={selectedKoremId}
                      selectedKodim={selectedKodimId}
                      initialGeometry={drawnAsset ? drawnAsset.geometry : null}
                      initialArea={drawnAsset ? drawnAsset.area : null}
                      isEnabled={isFormEnabled}
                    />
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetPage;