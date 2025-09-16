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
      // Special case: display "Kodim 0733/Kota Semarang" instead of "Berdiri Sendiri"
      const displayNama = koremData?.nama === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : koremData?.nama;
      setSelectedKorem(koremData ? { id: koremData.id, nama: displayNama } : null);

      // Special handling for Kota Semarang
      if (kodimName === "Kodim 0733/Kota Semarang" || (koremData?.nama === "Berdiri Sendiri" && !kodimName)) {
        // Find the feature where listkodim_Korem is "Berdiri Sendiri"
        const kodimFeature = kodimBoundaries?.features.find(
          (f) => f.properties.listkodim_Korem === "Berdiri Sendiri"
        );
        setSelectedKodim(kodimFeature ? { nama: "Kodim 0733/Kota Semarang", geometry: kodimFeature.geometry } : null);
        setIsLocationSelected(true);
        return;
      }

      if (kodimName && kodimBoundaries) {
        const kodimFeature = kodimBoundaries.features.find((f) => {
          const featureName = normalizeKodimName(f.properties.listkodim_Kodim);
          // Special case handling for Grobogan
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

      // Special handling for Kota Semarang - directly process it without intermediate step
      if (koremName === "Berdiri Sendiri" || koremName === "Kodim 0733/Kota Semarang") {
        const matchingKorem = koremList.find(
          (korem) => korem.nama === "Kodim 0733/Kota Semarang" || korem.id === "5"
        );
        
        if (matchingKorem) {
          setSelectedKoremId(matchingKorem.id);
          setSelectedKorem({ id: matchingKorem.id, nama: matchingKorem.nama });
          // For Kota Semarang, directly set the Kodim as well
          setSelectedKodimId("Kodim 0733/Kota Semarang");
          handleLocationChange(matchingKorem.id, "Kodim 0733/Kota Semarang");
          return;
        }
      }

      let matchingKorem;
      // DATA MISMATCH FIX: Map says "Berdiri Sendiri", DB says "Berdiri Sendiri" but with empty kodim array
      // Special case for Kota Semarang which is "Berdiri Sendiri"
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
        // Use the matched name from DB for the toast
        toast.success(`KOREM ${matchingKorem.nama} dipilih. Silakan pilih KODIM.`);
      } else {
        toast.error(`Data KOREM "${koremName}" yang sesuai tidak ditemukan.`);
        console.error("Could not find Korem with name:", koremName);
      }
    } else if (type === "KODIM") {
      // Special handling for Kota Semarang which is "Berdiri Sendiri"
      if (koremName === "Berdiri Sendiri" || koremName === "Kodim 0733/Kota Semarang") {
        const matchingKorem = koremList.find(
          (korem) => korem.nama === "Kodim 0733/Kota Semarang" || korem.id === "5"
        );
        
        if (matchingKorem) {
          setSelectedKoremId(matchingKorem.id);
          setSelectedKorem({ id: matchingKorem.id, nama: matchingKorem.nama });
          // Special case: Kota Semarang
          if (kodimName.includes("Semarang") || kodimName === "Kodim 0733/Semarang (BS)") {
            setSelectedKodimId("Kodim 0733/Kota Semarang");
            handleLocationChange(matchingKorem.id, "Kodim 0733/Kota Semarang");
          } else {
            setSelectedKodimId(kodimName);
            handleLocationChange(matchingKorem.id, kodimName);
          }
        } else {
          setSelectedKodimId(kodimName);
          toast.success(`KODIM ${kodimName} dipilih. Silakan gambar area aset.`);
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
    setIsFormEnabled(true);
    setIsLocationSelected(true);
    toast.success(
      `Polygon berhasil digambar! Luas: ${data.area.toFixed(2)} m²`
    );
  };

  const handleSaveAsset = async (assetData, buktiPemilikanFile, assetPhotos) => {
    const toastId = toast.loading("Menyimpan data aset...");

    let buktiPemilikanUrl = assetData.bukti_pemilikan_url || "";
    let buktiPemilikanFilename = assetData.bukti_pemilikan_filename || "";
    let assetPhotoUrls = assetData.foto_aset || [];

    // 1. Upload Bukti Pemilikan (if new file is provided)
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
        console.log("DEBUG: URL Bukti Kepemilikan setelah upload:", buktiPemilikanUrl);
        toast.loading(`Bukti pemilikan berhasil diupload.`, { id: toastId });
      } catch (err) {
        toast.error("Gagal mengupload bukti pemilikan.", { id: toastId });
        console.error("File upload error:", err.response?.data || err.message);
        return;
      }
    }

    // 2. Upload Foto Aset (if new files are provided)
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
        console.log("DEBUG: URL Foto Aset setelah upload:", assetPhotoUrls);
        
        toast.loading("Foto aset berhasil diupload.", { id: toastId });
      } catch (err) {
        toast.error("Gagal mengupload foto aset.", { id: toastId });
        console.error("Asset photos upload error:", err.response?.data || err.message);
        return;
      }
    }

    // 3. Prepare final payload
    const assetPayload = {
      ...assetData,
      id: `T${Date.now()}`,
      korem_id: selectedKoremId,
      kodim: selectedKodimId === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : selectedKodimId,
      lokasi: drawnAsset ? JSON.stringify(drawnAsset.geometry) : null,
      luas: drawnAsset ? (drawnAsset.area || 0) : (assetData.luas || 0),
      bukti_pemilikan_url: buktiPemilikanUrl,
      bukti_pemilikan_filename: buktiPemilikanFilename,
      foto_aset: assetPhotoUrls,
    };

    // 4. Save asset data to db.json
    try {
      console.log("DEBUG: Final payload TEPAT SEBELUM disimpan:", assetPayload);
      toast.loading("Menyimpan data aset ke database...", { id: toastId });
      if (!assetPayload.lokasi) {
        toast.error("Data lokasi dari gambar tidak tersedia.", { id: toastId });
        return;
      }

      await axios.post(`${API_URL}/assets`, assetPayload);

      toast.success("Aset berhasil ditambahkan!", { id: toastId });
      navigate("/data-aset-tanah", { state: { refresh: true } });
    } catch (err) {
      toast.error("Gagal menyimpan aset ke database.", { id: toastId });
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