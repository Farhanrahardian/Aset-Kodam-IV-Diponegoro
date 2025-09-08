import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  Card,
} from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PetaGambarAset from "../components/PetaGambarAset";
import FormAset from "../components/FormAset";

const API_URL = "http://localhost:3001";

const TambahAsetPage = () => {
  const navigate = useNavigate();

  const [koremList, setKoremList] = useState([]);
  const [kodimBoundaries, setKodimBoundaries] = useState(null);

  const [selectedKoremId, setSelectedKoremId] = useState("");
  const [selectedKodimId, setSelectedKodimId] = useState("");

  const [selectedKorem, setSelectedKorem] = useState(null);
  const [selectedKodim, setSelectedKodim] = useState(null);

  const [drawnAsset, setDrawnAsset] = useState(null);
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isLocationSelected, setIsLocationSelected] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [koremRes, kodimGeoRes] = await Promise.all([
          axios.get(`${API_URL}/korem`),
          axios.get('/data/Kodim.geojson'),
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

  const handleLocationChange = useCallback((koremId, kodimName) => {
    const wasLocationSelected = isLocationSelected;

    setSelectedKoremId(koremId);
    setSelectedKodimId(kodimName);

    if (koremId && kodimName && kodimBoundaries) {
      const kodimFeature = kodimBoundaries.features.find((f) => {
        const featureName = f.properties.listkodim_Kodim;
        if (kodimName === "Kodim 0733/Kota Semarang") {
          return featureName.startsWith("Kodim 0733/Semarang");
        }
        if (kodimName === "Kodim 0717/Grobogan") {
          return featureName === "Kodim 0717/Purwodadi";
        }
        return featureName === kodimName;
      });

      const koremData = koremList.find((k) => k.id === koremId);
      const firstKodimName = koremData?.kodim?.[0] || kodimName;
      const koremFeature = kodimBoundaries.features.find(
        (f) => f.properties.listkodim_Kodim === firstKodimName
      );

      setSelectedKorem(koremFeature);
      setSelectedKodim(kodimFeature);
      setIsLocationSelected(true);

      if (!wasLocationSelected) {
        toast.success("Lokasi dipilih! Silakan gambar area aset di peta.");
      }
    } else {
      setSelectedKorem(null);
      setSelectedKodim(null);
      setIsLocationSelected(false);
    }
  }, [kodimBoundaries, koremList, isLocationSelected]);

  const handleDrawingCreated = (data) => {
    if (!data || !data.geometry) {
      toast.error("Data gambar tidak valid.");
      return;
    }
    setDrawnAsset(data);
    setIsFormEnabled(true);
    setIsLocationSelected(true);
    toast.success(`Polygon berhasil digambar! Luas: ${data.area.toFixed(2)} m²`);
  };

  const handleSaveAsset = async (assetData, file) => {
    const toastId = toast.loading("Menyimpan data aset...");

    let fileUrl = "";
    let fileName = "";

    // Step 1: Upload the file if it exists
    if (file) {
      try {
        const fileFormData = new FormData();
        fileFormData.append("bukti_pemilikan", file);

        const uploadRes = await axios.post(`${API_URL}/upload/bukti-pemilikan`, fileFormData);
        
        fileUrl = uploadRes.data.url;
        fileName = uploadRes.data.filename;

        toast.loading(`File berhasil diupload: ${fileName}`, { id: toastId });
      } catch (err) {
        toast.error("Gagal mengupload file.", { id: toastId });
        console.error("File upload error:", err.response?.data || err.message);
        return;
      }
    }

    // Step 2: Save the asset data
    const assetPayload = {
      ...assetData,
      id: `T${Date.now()}`,
      korem_id: selectedKoremId,
      kodim: selectedKodimId,
      lokasi: drawnAsset ? drawnAsset.geometry : null,
      luas: drawnAsset ? drawnAsset.area : 0,
      sertifikat_bidang: assetData.sertifikat_bidang || 0,
      sertifikat_luas: assetData.sertifikat_luas || 0,
      belum_sertifikat_bidang: assetData.belum_sertifikat_bidang || 0,
      belum_sertifikat_luas: assetData.belum_sertifikat_luas || 0,
      bukti_pemilikan_url: fileUrl,
      bukti_pemilikan_filename: fileName,
    };

    console.log("Asset Payload to be sent:", assetPayload);

    try {
      if (!drawnAsset || !drawnAsset.geometry) {
        toast.error("Data lokasi dari gambar tidak tersedia.", { id: toastId });
        return;
      }

      await axios.post(`${API_URL}/assets`, assetPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast.success("Aset berhasil ditambahkan!", { id: toastId });
      navigate("/data-aset-tanah");
    } catch (err) {
      toast.error("Gagal menyimpan aset.", { id: toastId });
      console.error("Save error:", err.response?.data || err.message);
    }
  };

  const handleCancel = () => {
    navigate("/data-aset-tanah");
  };

  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4 className="mb-0">Tambah Aset Tanah Baru</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={7}>
                  <Alert variant="info">
                    <b>Alur Pengisian:</b>
                    <ol className="mb-0 ps-3">
                      <li>Pilih Wilayah Korem dan Kodim pada form di sebelah kanan.</li>
                      <li>Gunakan kontrol di pojok kanan atas peta untuk menggambar batas area aset.</li>
                      <li>Lengkapi sisa detail aset pada form.</li>
                    </ol>
                  </Alert>
                  <div style={{ height: "70vh", width: "100%" }}>
                    <PetaGambarAset
                      onPolygonCreated={handleDrawingCreated}
                      selectedKorem={selectedKorem}
                      selectedKodim={selectedKodim}
                      isLocationSelected={isLocationSelected}
                    />
                  </div>
                </Col>
                <Col md={5}>
                  <FormAset
                    onSave={handleSaveAsset}
                    onCancel={handleCancel}
                    koremList={koremList}
                    onLocationChange={handleLocationChange}
                    initialGeometry={drawnAsset ? drawnAsset.geometry : null}
                    initialArea={drawnAsset ? drawnAsset.area : null}
                    isEnabled={isFormEnabled}
                    selectedKoremId={selectedKoremId}
                    selectedKodimId={selectedKodimId}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetPage;