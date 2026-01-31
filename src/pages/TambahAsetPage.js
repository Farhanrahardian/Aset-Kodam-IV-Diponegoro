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
  const [koremBoundaries, setKoremBoundaries] = useState(null);

  const [selectedKoremId, setSelectedKoremId] = useState("");
  const [selectedKodimId, setSelectedKodimId] = useState("");

  const [selectedKorem, setSelectedKorem] = useState(null);
  const [selectedKodim, setSelectedKodim] = useState(null);

  const [inputMode, setInputMode] = useState("draw"); // Mode input saat ini (draw, kml, coords)

  const mapRef = useRef(null); // Declare mapRef here


  const [drawnAsset, setDrawnAsset] = useState(null);
  const [importedGeometry, setImportedGeometry] = useState(null);
  const [geoJsonKey, setGeoJsonKey] = useState(0); // State baru untuk key
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const [selectionSource, setSelectionSource] = useState("form"); // 'form' or 'map'
  const [activeLocationInputType, setActiveLocationInputType] = useState('none'); // 'none', 'kml', 'manual_draw', 'kodim_select'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New function to clear any existing asset location on the map
  const clearAssetLocation = useCallback(() => {
    setDrawnAsset(null);
    setImportedGeometry(null);
    setGeoJsonKey((prevKey) => prevKey + 1); // Increment key to force PetaGambarAset to re-render KML overlay
    setActiveLocationInputType('none'); // Reset active input type
    setIsFormEnabled(false); // Disable form if no location is selected
    setIsLocationSelected(false);
    // Explicitly call the map's internal clear function
    if (mapRef.current && mapRef.current.clearInternalDrawing) {
      mapRef.current.clearInternalDrawing();
    }
    return true; // Indicate that clearing was attempted/successful
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [koremRes, kodimGeoRes, koremGeoRes] = await Promise.all([
          axios.get(`${API_URL}/korem`),
          axios.get("/data/Kodim_simplified.geojson"),
          axios.get("/data/korem_simplified.geojson"),
        ]);
        setKoremList(koremRes.data);
        setKodimBoundaries(kodimGeoRes.data);
        setKoremBoundaries(koremGeoRes.data);
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
  const currentSelectionRef = useRef({ koremId: "", kodimName: "" }); // Add ref to track selection for toast suppression

  const handleLocationChange = useCallback(
    (koremId, kodimName) => {
      const isSameSelection =
        currentSelectionRef.current.koremId === koremId &&
        currentSelectionRef.current.kodimName === kodimName;

      if (drawnAsset && !isSameSelection) { // Only clear if there's an asset and selection actually changes
        clearAssetLocation();
      }

      currentSelectionRef.current = { koremId, kodimName };

      setSelectionSource("form");
      setSelectedKoremId(koremId);
      setSelectedKodimId(kodimName);
      // We set activeLocationInputType here to indicate that Korem/Kodim selection is the current focus
      // This doesn't mean a polygon is drawn, but it's the chosen *method* of determining location context.
      setActiveLocationInputType('kodim_select');

      const koremData = koremList.find((k) => k.id === koremId);
      const displayNama =
        koremData?.nama === "Berdiri Sendiri"
          ? "Kodim 0733/Kota Semarang"
          : koremData?.nama;
      setSelectedKorem(
        koremData ? { id: koremData.id, nama: displayNama } : null
      );

      const isSemarangCase =
        kodimName === "Kodim 0733/Kota Semarang" ||
        koremData?.nama === "Berdiri Sendiri";

      if (isSemarangCase) {
        setSelectedKodimId("Kodim 0733/Kota Semarang");
        const kodimFeature = kodimBoundaries?.features.find(
          (f) => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)"
        );
        setSelectedKodim(
          kodimFeature
            ? {
              nama: "Kodim 0733/Kota Semarang",
              geometry: kodimFeature.geometry,
            }
            : null
        );
        setIsLocationSelected(true);
        if (!isSameSelection) {
        }
      } else if (kodimName && kodimBoundaries) {
        const kodimFeature = kodimBoundaries.features.find((f) => {
          const featureName = normalizeKodimName(f.properties.listkodim_Kodim);
          if (kodimName === "Kodim 0717/Grobogan") {
            return featureName === "Kodim 0717/Grobogan";
          }
          return featureName === kodimName;
        });
        setSelectedKodim(
          kodimFeature
            ? { nama: kodimName, geometry: kodimFeature.geometry }
            : null
        );
        setIsLocationSelected(true);
        if (!isSameSelection) {
        }
      } else {
        setSelectedKodim(null);
        setIsLocationSelected(!!koremId);
      }
    },
    [kodimBoundaries, koremList]
  );

  const handleAreaSelect = useCallback((type, koremName, kodimName) => {
    // Only clear if there's an asset and the selection is changing
    if (drawnAsset) {
      clearAssetLocation();
    }

    setSelectionSource("map");
    setActiveLocationInputType('kodim_select'); // Indicate Korem/Kodim selection as active

    if (type === "KOREM") {
      if (koremName === null) {
        setSelectedKoremId("");
        setSelectedKorem(null);
        setSelectedKodimId("");
        setSelectedKodim(null);
        setIsLocationSelected(false);
        return;
      }

      if (
        koremName === "Berdiri Sendiri" ||
        koremName === "Kodim 0733/Kota Semarang"
      ) {
        const matchingKorem = koremList.find(
          (korem) =>
            korem.nama === "Kodim 0733/Kota Semarang" || korem.id === "5"
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
        // Jangan tampilkan notifikasi saat kembali dari level yang lebih rendah
      } else {
        toast.error(`Data KOREM "${koremName}" yang sesuai tidak ditemukan.`);
        console.error("Could not find Korem with name:", koremName);
      }
    } else if (type === "KODIM") {
      if (
        koremName === "Berdiri Sendiri" ||
        koremName === "Kodim 0733/Kota Semarang"
      ) {
        const matchingKorem = koremList.find(
          (korem) =>
            korem.nama === "Kodim 0733/Kota Semarang" || korem.id === "5"
        );

        if (matchingKorem) {
          setSelectedKoremId(matchingKorem.id);
          setSelectedKorem({ id: matchingKorem.id, nama: matchingKorem.nama });
          if (
            kodimName.includes("Semarang") ||
            kodimName === "Kodim 0733/Semarang (BS)"
          ) {
            setSelectedKodimId("Kodim 0733/Kota Semarang");
            handleLocationChange(matchingKorem.id, "Kodim 0733/Kota Semarang");
          } else {
            setSelectedKodimId(kodimName);
            handleLocationChange(matchingKorem.id, kodimName);
          }
        }
      }
       else {
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
          // Jangan tampilkan notifikasi saat kembali dari level yang lebih rendah
        }
      }
    }
  }, [drawnAsset, clearAssetLocation, koremList, kodimBoundaries, handleLocationChange]);

  const handleDrawingCreated = useCallback((data) => {
    if (data === null) {
      // This is a deletion triggered by the map component itself
      if (drawnAsset) { // Only clear if there's actually something to clear
        clearAssetLocation();
      }
      return;
    }

    // If there's an existing KML or manual draw, and the source is changing
    // (i.e., we are about to draw manually, but there's already an imported KML)
    if (drawnAsset && activeLocationInputType !== 'manual_draw') {
        clearAssetLocation();
    }

    if (!data || !data.geometry) {
      toast.error("Data gambar tidak valid.");
      return;
    }
    setDrawnAsset({ ...data, source: 'manual' });
    setImportedGeometry(null);
    setIsFormEnabled(true);
    setIsLocationSelected(true);
    setActiveLocationInputType('manual_draw'); // Indicate manual drawing as active
    toast.success(
      `Polygon berhasil digambar! Luas: ${data.area.toFixed(2)} m²`
    );
  }, [drawnAsset, activeLocationInputType, clearAssetLocation]);

  const handleKmlImport = (geometry, isFromCoords = false) => {
    if (!geometry) return;

    // If there's an existing manual draw or KML, clear it
    if (drawnAsset && activeLocationInputType !== 'kml') {
      clearAssetLocation();
    }

    const feature = turf.feature(geometry);
    const area = turf.area(feature);

    setImportedGeometry(geometry);
    setDrawnAsset({ geometry, area, source: isFromCoords ? 'coords' : 'import' });
    setIsFormEnabled(true);
    setIsLocationSelected(true);
    setGeoJsonKey((prevKey) => prevKey + 1); // Increment key to force re-render in map component
    setActiveLocationInputType(isFromCoords ? 'coords' : 'kml'); // Indicate source as active
    if (!isFromCoords) {
      toast.success("KML berhasil diimpor.");
    }
  };
  const handleSaveAsset = async (
    assetData,
    buktiPemilikanFile,
    assetPhotos,
    gambarTampakAtasFile
  ) => {
    const toastId = toast.loading("Menyimpan data aset...");

    // ✅ DEBUG: Cek data yang diterima dari form
    console.log("🔍 Data dari FormAset:", assetData);
    console.log("🔍 Luas dari form:", assetData.luas);
    console.log("🔍 Luas dari polygon:", drawnAsset?.area);

    let buktiPemilikanUrl = assetData.bukti_pemilikan_url || "";
    let buktiPemilikanFilename = assetData.bukti_pemilikan_filename || "";
    let assetPhotoUrls = assetData.foto_aset || [];

    // Upload bukti pemilikan (tetap sama)
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

    // Upload foto aset (tetap sama)
    if (assetPhotos && assetPhotos.length > 0) {
      try {
        toast.loading(`Mengupload ${assetPhotos.length} foto aset...`, {
          id: toastId,
        });
        const photosFormData = new FormData();
        assetPhotos.forEach((photo) => {
          photosFormData.append("asset_photos", photo);
        });

        const photosUploadRes = await axios.post(
          `${API_URL}/upload/asset-photos`,
          photosFormData
        );

        const newPhotoUrls = photosUploadRes.data.files.map((file) => file.url);
        assetPhotoUrls = [...new Set([...assetPhotoUrls, ...newPhotoUrls])];

        toast.loading("Foto aset berhasil diupload.", { id: toastId });
      } catch (err) {
        const errorMessage =
          err.response?.data?.error || "Gagal mengupload foto aset.";
        toast.error(errorMessage, { id: toastId });
        console.error(
          "Asset photos upload error:",
          err.response?.data || err.message
        );
        return;
      }
    }

    let gambarTampakAtasUrl = assetData.gambar_tampak_atas_url || "";
    let gambarTampakAtasFilename = assetData.gambar_tampak_atas_filename || "";

    if (gambarTampakAtasFile) {
      try {
        toast.loading("Mengupload foto aset tampak atas...", { id: toastId });
        const tampakAtasFormData = new FormData();
        tampakAtasFormData.append("foto_tampak_atas", gambarTampakAtasFile);

        const uploadRes = await axios.post(
          `${API_URL}/upload/foto-tampak-atas`,
          tampakAtasFormData
        );

        gambarTampakAtasUrl = uploadRes.data.url;
        gambarTampakAtasFilename = uploadRes.data.filename;
        toast.loading("Foto aset tampak atas berhasil diupload.", { id: toastId });
      } catch (err) {
        toast.error("Gagal mengupload foto aset tampak atas.", { id: toastId });
        console.error(
          "Foto aset tampak atas upload error:",
          err.response?.data || err.message
        );
        return;
      }
    }

    // ✅ PERBAIKAN: Gunakan luas dari assetData (yang sudah diisi/diubah user di form)
    // Hanya gunakan drawnAsset.area sebagai fallback jika assetData.luas tidak ada
    const finalLuas =
      assetData.luas && assetData.luas > 0
        ? assetData.luas
        : drawnAsset
          ? drawnAsset.area || 0
          : 0;

    console.log("🔍 Luas final yang akan disimpan:", finalLuas);

    const assetPayload = {
      ...assetData,
      id: `T${Date.now()}`,
      korem_id: selectedKoremId,
      kodim: selectedKodimId,
      lokasi: drawnAsset ? JSON.stringify(drawnAsset.geometry) : null,
      luas: finalLuas, // ✅ Gunakan luas yang sudah diperbaiki
      bukti_pemilikan_url: buktiPemilikanUrl,
      bukti_pemilikan_filename: buktiPemilikanFilename,
      foto_aset: assetPhotoUrls,
      gambar_tampak_atas_url: gambarTampakAtasUrl,
      gambar_tampak_atas_filename: gambarTampakAtasFilename,
    };

    console.log("🔍 Payload final yang akan dikirim ke API:", assetPayload);

    try {
      toast.loading("Menyimpan data aset ke database...", { id: toastId });
      if (!assetPayload.lokasi) {
        toast.error("Data lokasi dari gambar tidak tersedia.", { id: toastId });
        return;
      }

      const response = await axios.post(`${API_URL}/assets`, assetPayload);
      console.log("✅ Response dari server:", response.data);

      toast.success("Aset berhasil ditambahkan!", { id: toastId });
      setTimeout(() => {
        navigate("/data-aset-tanah", { state: { refresh: true } });
      }, 1000);
    } catch (err) {
      toast.error("Gagal menambahkan aset.", { id: toastId });
      console.error("Save error:", err.response?.data || err.message);
    }
  };

  const handleResetMapView = () => {
    // Reset pilihan Korem dan Kodim ke null untuk kembali ke tampilan default
    setSelectedKoremId("");
    setSelectedKodimId("");
    setSelectedKorem(null);
    setSelectedKodim(null);

    // Reset juga state terkait
    setIsLocationSelected(false);
    setSelectionSource("form");
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
              <h4 className="mb-0">Tambah Aset BMN Baru</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={7}>
                  <Alert variant="info">
                    <b>Alur Pengisian:</b>
                    <ol className="mb-0 ps-3">
                      <li>
                        Pilih Wilayah Korem dan Kodim pada form di sebelah kanan
                        atau klik area KOREM/KODIM di peta.
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
                      ref={mapRef}
                      onPolygonCreated={handleDrawingCreated}
                      selectedKorem={selectedKorem}
                      selectedKodim={selectedKodim}
                      isLocationSelected={isLocationSelected}
                      onLocationSelect={handleAreaSelect}
                      selectionSource={selectionSource}
                      koremList={koremList}
                      koremBoundaries={koremBoundaries}
                      kodimBoundaries={kodimBoundaries}
                      importedGeometry={drawnAsset && drawnAsset.source === 'import' ? drawnAsset.geometry : importedGeometry} // Conditional imported geometry
                      geoJsonKey={geoJsonKey} // Pass key ke peta
                      inputMode={inputMode} // Mode input saat ini
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
                    onClearDrawing={clearAssetLocation} // Pass handler untuk membersihkan gambar
                    onResetMapView={handleResetMapView} // Pass handler untuk mereset tampilan peta
                    onUpdateInputMode={setInputMode} // Pass handler untuk mengupdate mode input
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
