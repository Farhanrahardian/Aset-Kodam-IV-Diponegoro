import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [selectionSource, setSelectionSource] = useState("form"); // 'form' or 'map'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [koremRes, kodimGeoRes] = await Promise.all([
          axios.get(`${API_URL}/korem`),
          axios.get("/data/Kodim.geojson"),
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

  const prevIsLocationSelected = useRef(false);
  useEffect(() => {
    if (isLocationSelected && !prevIsLocationSelected.current) {
      if (selectedKodim || (selectedKorem && selectedKorem.kodim && selectedKorem.kodim.length === 0)) {
         toast.success("Lokasi dipilih! Silakan gambar area aset di peta.");
      }
    }
    prevIsLocationSelected.current = isLocationSelected;
  }, [isLocationSelected, selectedKorem, selectedKodim]);


  const handleLocationChange = useCallback(
    (koremId, kodimName) => {
      setSelectionSource("form");
      setSelectedKoremId(koremId);
      setSelectedKodimId(kodimName);

      const koremData = koremList.find((k) => k.id === koremId);
      setSelectedKorem(koremData ? { id: koremData.id, nama: koremData.nama } : null);

      if (kodimName && kodimBoundaries) {
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
        setSelectedKodim(kodimFeature ? { nama: kodimName, geometry: kodimFeature.geometry } : null);
        setIsLocationSelected(true);
      } else {
        setSelectedKodim(null);
        setIsLocationSelected(!!koremId);
      }
    },
    [kodimBoundaries, koremList]
  );

  const handleAreaSelect = (type, koremName, kodimName) => {
    setSelectionSource("map");
    if (type === "KOREM") {
      if (koremName === null) {
        setSelectedKoremId("");
        setSelectedKorem(null);
        setSelectedKodimId("");
        setSelectedKodim(null);
        setIsLocationSelected(false);
        return;
      }

      let matchingKorem;
      // DATA MISMATCH FIX: Map says "Berdiri Sendiri", DB says "Kodim 0733/Kota Semarang"
      if (koremName.trim() === "Berdiri Sendiri") {
        matchingKorem = koremList.find(
          (korem) => korem.nama === "Kodim 0733/Kota Semarang"
        );
      } else {
        matchingKorem = koremList.find(
          (korem) => korem.nama.trim() === koremName.trim()
        );
      }
      
      if (matchingKorem) {
        setSelectedKoremId(matchingKorem.id);
        setSelectedKorem({ id: matchingKorem.id, nama: matchingKorem.nama });
        setSelectedKodimId("");
        setSelectedKodim(null);
        setIsLocationSelected(true);
        // Use the matched name from DB for the toast
        toast.success(`KOREM ${matchingKorem.nama} dipilih. Silakan pilih KODIM.`);
      } else {
        toast.error(`Data KOREM "${koremName}" yang sesuai tidak ditemukan.`);
        console.error("Could not find Korem with name:", koremName);
      }
    } else if (type === "KODIM") {
      const matchingKorem = koremList.find(
        (korem) => korem.nama.trim() === koremName.trim()
      );
      
      if (matchingKorem) {
        setSelectedKoremId(matchingKorem.id);
        setSelectedKodimId(kodimName);
        handleLocationChange(matchingKorem.id, kodimName);
      } else {
        setSelectedKodimId(kodimName);
        toast.success(`KODIM ${kodimName} dipilih. Silakan gambar area aset.`);
      }
    }
  };

  const handleDrawingCreated = (data) => {
    if (!data || !data.geometry) {
      toast.error("Data gambar tidak valid.");
      return;
    }
    setDrawnAsset(data);
    setIsFormEnabled(true);
    setIsLocationSelected(true);
    toast.success(
      `Polygon berhasil digambar! Luas: ${data.area.toFixed(2)} m²`
    );
  };

  const handleSaveAsset = async (assetData, file) => {
    const toastId = toast.loading("Menyimpan data aset...");

    let fileUrl = "";
    let fileName = "";

    if (file) {
      try {
        const fileFormData = new FormData();
        fileFormData.append("bukti_pemilikan", file);

        const uploadRes = await axios.post(
          `${API_URL}/upload/bukti-pemilikan`,
          fileFormData
        );

        fileUrl = uploadRes.data.url;
        fileName = uploadRes.data.filename;

        toast.loading(`File berhasil diupload: ${fileName}`, { id: toastId });
      } catch (err) {
        toast.error("Gagal mengupload file.", { id: toastId });
        console.error("File upload error:", err.response?.data || err.message);
        return;
      }
    }

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
          "Content-Type": "application/json",
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
                      <li>
                        Pilih Wilayah Korem dan Kodim pada form di sebelah
                        kanan atau klik area KOREM/KODIM di peta.
                      </li>
                      <li>
                        Gunakan kontrol di pojok kanan atas peta untuk
                        menggambar batas area aset.
                      </li>
                      <li>Lengkapi sisa detail aset pada form.</li>
                    </ol>
                  </Alert>
                  <div style={{ height: "70vh", width: "100%" }}>
                    <PetaGambarAset
                      onPolygonCreated={handleDrawingCreated}
                      selectedKorem={selectedKorem}
                      selectedKodim={selectedKodim}
                      isLocationSelected={isLocationSelected}
                      onLocationSelect={handleAreaSelect}
                      selectionSource={selectionSource}
                      koremList={koremList}
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