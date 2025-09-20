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
import { normalizeKodimName } from "../utils/kodimUtils";
import * as turf from "@turf/turf";

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
  const [importedGeometry, setImportedGeometry] = useState(null);
  const [geoJsonKey, setGeoJsonKey] = useState(0); // State baru untuk key
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
      const displayNama = koremData?.nama === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : koremData?.nama;
      setSelectedKorem(koremData ? { id: koremData.id, nama: displayNama } : null);

      const isSemarangCase = kodimName === "Kodim 0733/Kota Semarang" || koremData?.nama === "Berdiri Sendiri";

      if (isSemarangCase) {
        setSelectedKodimId("Kodim 0733/Kota Semarang");
        const kodimFeature = kodimBoundaries?.features.find(
          (f) => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)"
        );
        setSelectedKodim(kodimFeature ? { nama: "Kodim 0733/Kota Semarang", geometry: kodimFeature.geometry } : null);
        setIsLocationSelected(true);
      } else if (kodimName && kodimBoundaries) {
        const kodimFeature = kodimBoundaries.features.find((f) => {
          const featureName = normalizeKodimName(f.properties.listkodim_Kodim);
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

      if (koremName === "Berdiri Sendiri" || koremName === "Kodim 0733/Kota Semarang") {
        const matchingKorem = koremList.find(
          (korem) => korem.nama === "Kodim 0733/Kota Semarang" || korem.id === "5"
        );
        
        if (matchingKorem) {
          setSelectedKoremId(matchingKorem.id);
          setSelectedKorem({ id: matchingKorem.id, nama: matchingKorem.nama });
          setSelectedKodimId("Kodim 0733/Kota Semarang");
          handleLocationChange(matchingKorem.id, "Kodim 0733/Kota Semarang");
          return;
        }
      }

      let matchingKorem;
      if (koremName.trim() === "Berdiri Sendiri") {
        matchingKorem = koremList.find(
          (korem) => korem.nama === "Berdiri Sendiri"
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
        toast.success(`KOREM ${matchingKorem.nama} dipilih. Silakan pilih KODIM.`);
      } else {
        toast.error(`Data KOREM "${koremName}" yang sesuai tidak ditemukan.`);
        console.error("Could not find Korem with name:", koremName);
      }
    } else if (type === "KODIM") {
      if (koremName === "Berdiri Sendiri" || koremName === "Kodim 0733/Kota Semarang") {
        const matchingKorem = koremList.find(
          (korem) => korem.nama === "Kodim 0733/Kota Semarang" || korem.id === "5"
        );
        
        if (matchingKorem) {
          setSelectedKoremId(matchingKorem.id);
          setSelectedKorem({ id: matchingKorem.id, nama: matchingKorem.nama });
          if (kodimName.includes("Semarang") || kodimName === "Kodim 0733/Semarang (BS)") {
            setSelectedKodimId("Kodim 0733/Kota Semarang");
            handleLocationChange(matchingKorem.id, "Kodim 0733/Kota Semarang");
          } else {
            setSelectedKodimId(kodimName);
            handleLocationChange(matchingKorem.id, kodimName);
          }
        }
      } else {
        const matchingKorem = koremList.find(
          (korem) => korem.nama.trim() === koremName.trim()
        );
        
        if (matchingKorem) {
          setSelectedKoremId(matchingKorem.id);
          setSelectedKorem({ id: matchingKorem.id, nama: matchingKorem.nama });
          setSelectedKodimId(kodimName);
          handleLocationChange(matchingKorem.id, kodimName);
        } else {
          setSelectedKodimId(kodimName);
          toast.success(`KODIM ${kodimName} dipilih. Silakan gambar area aset.`);
        }
      }
    }
  };;

  const handleDrawingCreated = (data) => {
    if (!data || !data.geometry) {
      toast.error("Data gambar tidak valid.");
      return;
    }
    setDrawnAsset(data);
    setImportedGeometry(null);
    setIsFormEnabled(true);
    setIsLocationSelected(true);
    toast.success(
      `Polygon berhasil digambar! Luas: ${data.area.toFixed(2)} m²`
    );
  };

  const handleKmlImport = (geometry) => {
    if (!geometry) return;
    const feature = turf.feature(geometry);
    const area = turf.area(feature);

    setImportedGeometry(geometry);
    setDrawnAsset({ geometry, area });
    setIsFormEnabled(true);
    setIsLocationSelected(true);
    setGeoJsonKey(prevKey => prevKey + 1); // Inkrementasi key
  };

  const handleSaveAsset = async (assetData, buktiPemilikanFile, assetPhotos) => {
    const toastId = toast.loading("Menyimpan data aset...");

    let buktiPemilikanUrl = assetData.bukti_pemilikan_url || "";
    let buktiPemilikanFilename = assetData.bukti_pemilikan_filename || "";
    let assetPhotoUrls = assetData.foto_aset || [];

    if (buktiPemilikanFile) {
      try {
        toast.loading("Mengupload bukti pemilikan...", { id: toastId });
        const fileFormData = new FormData();
        fileFormData.append("bukti_pemilikan", buktiPemilikanFile);

        const uploadRes = await axios.post(
          `${API_URL}/upload/bukti-pemilikan`,
          fileFormData
        );

        buktiPemilikanUrl = uploadRes.data.url;
        buktiPemilikanFilename = uploadRes.data.filename;
        toast.loading(`Bukti pemilikan berhasil diupload.`, { id: toastId });
      } catch (err) {
        toast.error("Gagal mengupload bukti pemilikan.", { id: toastId });
        console.error("File upload error:", err.response?.data || err.message);
        return;
      }
    }

    if (assetPhotos && assetPhotos.length > 0) {
      try {
        toast.loading(`Mengupload ${assetPhotos.length} foto aset...`, { id: toastId });
        const photosFormData = new FormData();
        assetPhotos.forEach(photo => {
          photosFormData.append("asset_photos", photo);
        });

        const photosUploadRes = await axios.post(
          `${API_URL}/upload/asset-photos`,
          photosFormData
        );
        
        const newPhotoUrls = photosUploadRes.data.files.map(file => file.url);
        assetPhotoUrls = [...new Set([...assetPhotoUrls, ...newPhotoUrls])];
        
        toast.loading("Foto aset berhasil diupload.", { id: toastId });
      } catch (err) {
        toast.error("Gagal mengupload foto aset.", { id: toastId });
        console.error("Asset photos upload error:", err.response?.data || err.message);
        return;
      }
    }

    const assetPayload = {
      ...assetData,
      id: `T${Date.now()}`,
      korem_id: selectedKoremId,
      kodim: selectedKodimId,
      lokasi: drawnAsset ? JSON.stringify(drawnAsset.geometry) : null,
      luas: drawnAsset ? (drawnAsset.area || 0) : (assetData.luas || 0),
      bukti_pemilikan_url: buktiPemilikanUrl,
      bukti_pemilikan_filename: buktiPemilikanFilename,
      foto_aset: assetPhotoUrls,
    };

    try {
      toast.loading("Menyimpan data aset ke database...", { id: toastId });
      if (!assetPayload.lokasi) {
        toast.error("Data lokasi dari gambar tidak tersedia.", { id: toastId });
        return;
      }

      await axios.post(`${API_URL}/assets`, assetPayload);

      toast.success("Aset berhasil ditambahkan!", { id: toastId });
      setTimeout(() => {
        navigate("/data-aset-tanah", { state: { refresh: true } });
      }, 1000);
    } catch (err) {
      toast.error("Gagal menambahkan aset.", { id: toastId });
      console.error("Save error:", err.response?.data || err.message);
    }
  };

  const handleCancel = () => {
    navigate("/data-aset-tanah", { replace: true });
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
                      importedGeometry={importedGeometry} // Pass prop ke peta
                      geoJsonKey={geoJsonKey} // Pass key ke peta
                    />
                  </div>
                </Col>
                <Col md={5}>
                  <FormAset
                    onSave={handleSaveAsset}
                    onCancel={handleCancel}
                    koremList={koremList}
                    onLocationChange={handleLocationChange}
                    onKmlImport={handleKmlImport} // Pass handler ke form
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