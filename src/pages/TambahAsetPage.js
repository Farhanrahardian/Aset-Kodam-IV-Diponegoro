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
import axiosAuth from "../utils/axiosAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "xmldom";
import JSZip from "jszip";
import PetaGambarAset from "../components/PetaGambarAset";
import FormAset from "../components/FormAset";
import InformasiDasarAset from "../components/InformasiDasarAset";
import { normalizeKodimName } from "../utils/kodimUtils";
import * as turf from "@turf/turf";
import "./TambahAsetPage.css";

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
  const formRef = useRef(null); // Ref for the form component

  // State untuk Lokasi & Wilayah (panel kanan)
  const [infoDasarFormData, setInfoDasarFormData] = useState({
    korem_id: "",
    kodim: "",
    nama: "",
    assetToEdit: null,
  });
  const [infoDasarKodimList, setInfoDasarKodimList] = useState([]);
  const [infoDasarInputMethod, setInfoDasarInputMethod] = useState("draw");
  const [infoDasarKmlFileName, setInfoDasarKmlFileName] = useState("");
  const [infoDasarCoordsText, setInfoDasarCoordsText] = useState("");
  const [infoDasarCoordsError, setInfoDasarCoordsError] = useState("");

  // Ref untuk menyimpan file KML yang akan diproses
  const kmlFileRef = useRef(null);


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
    // Reset info dasar states
    setInfoDasarKmlFileName("");
    setInfoDasarCoordsText("");
    setInfoDasarCoordsError("");
    kmlFileRef.current = null;
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
          axiosAuth.get(`${API_URL}/korem`),
          axiosAuth.get("/data/Kodim_simplified.geojson"),
          axiosAuth.get("/data/korem_simplified.geojson"),
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

  // Sync selectedKoremId dan selectedKodimId ke infoDasarFormData (saat pilih dari peta)
  useEffect(() => {
    if (selectedKoremId && selectedKoremId !== infoDasarFormData.korem_id) {
      setInfoDasarFormData(prev => ({
        ...prev,
        korem_id: selectedKoremId,
        kodim: selectedKodimId || "",
      }));
    }
    // Reset kodim saat selectedKodimId berubah (termasuk saat reset ke "")
    if (selectedKodimId !== infoDasarFormData.kodim) {
      setInfoDasarFormData(prev => ({ ...prev, kodim: selectedKodimId || "" }));
    }
  }, [selectedKoremId, selectedKodimId]);

  // Sync kodim list saat selectedKoremId berubah (dari form bawah atau peta)
  useEffect(() => {
    if (selectedKoremId) {
      const selectedKoremData = koremList.find((k) => k.id === selectedKoremId);
      if (selectedKoremData) {
        const distinctKodims = [...new Set(selectedKoremData.kodim || [])];
        const kodimObjects = distinctKodims.map((kName) => ({
          id: kName,
          nama: kName,
        }));
        setInfoDasarKodimList(kodimObjects);
      }
    } else {
      setInfoDasarKodimList([]);
    }
  }, [selectedKoremId, koremList]);

  // Sync input mode dari form bawah ke panel kanan
  useEffect(() => {
    if (inputMode !== infoDasarInputMethod) {
      setInfoDasarInputMethod(inputMode);
    }
  }, [inputMode]);

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
        // Reset infoDasarFormData
        setInfoDasarFormData(prev => ({
          ...prev,
          korem_id: "",
          kodim: "",
        }));
        setInfoDasarKodimList([]);
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
          // Reset infoDasarFormData jika tidak ada matching Korem
          setInfoDasarFormData(prev => ({
            ...prev,
            korem_id: "",
            kodim: kodimName,
          }));
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

        const uploadRes = await axiosAuth.post(
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

        const photosUploadRes = await axiosAuth.post(
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

        const uploadRes = await axiosAuth.post(
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

      const response = await axiosAuth.post(`${API_URL}/assets`, assetPayload);
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

  // Handler functions untuk Lokasi & Wilayah (panel kanan)
  const handleInfoDasarChange = (e) => {
    const { name, value } = e.target;

    if (name === "korem_id") {
      const selectedKoremData = koremList.find((k) => k.id === value);
      let kodimValue = "";
      if (
        selectedKoremData &&
        (selectedKoremData.nama === "Berdiri Sendiri" ||
          selectedKoremData.nama === "Kodim 0733/Kota Semarang")
      ) {
        kodimValue = "Kodim 0733/Kota Semarang";
      }
      setInfoDasarFormData({ ...infoDasarFormData, korem_id: value, kodim: kodimValue });

      // Update kodim list
      if (selectedKoremData) {
        const distinctKodims = [...new Set(selectedKoremData.kodim || [])];
        const kodimObjects = distinctKodims.map((kName) => ({
          id: kName,
          nama: kName,
        }));
        setInfoDasarKodimList(kodimObjects);
      } else {
        setInfoDasarKodimList([]);
      }

      // Sync dengan state utama untuk peta dan form bawah
      setSelectedKoremId(value);
      setSelectedKodimId(kodimValue);
      handleLocationChange(value, kodimValue);
    } else if (name === "kodim") {
      // Saat pilih Kodim dari dropdown, sync ke peta
      setInfoDasarFormData(prev => ({ ...prev, [name]: value }));
      setSelectedKodimId(value);
      handleLocationChange(selectedKoremId, value);
    }
  };

  const handleInfoDasarInputChangeMethod = (newMethod) => {
    // Reset KML file and coords when switching method
    if (infoDasarInputMethod === 'kml') {
      setInfoDasarKmlFileName("");
      kmlFileRef.current = null;
    } else if (infoDasarInputMethod === 'coords') {
      setInfoDasarCoordsText("");
      setInfoDasarCoordsError("");
    }
    setInfoDasarInputMethod(newMethod);
    setInputMode(newMethod);
  };

  // Helper: Check if file is KMZ
  const isKmzFile = (filename) => {
    if (!filename) return false;
    return filename.toLowerCase().endsWith(".kmz");
  };

  // Helper: Extract KML from KMZ
  const extractKmlFromKmz = async (file) => {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const kmlFile = Object.keys(zipContent.files).find(
        (filename) => filename.toLowerCase().endsWith('.kml')
      );
      if (!kmlFile) {
        throw new Error("Tidak ditemukan file KML dalam KMZ");
      }
      return await zipContent.files[kmlFile].async("text");
    } catch (error) {
      console.error("Error extracting KMZ:", error);
      throw new Error(`Gagal mengekstrak KMZ: ${error.message}`);
    }
  };

  // Helper: Validate and fix coordinates
  const validateAndFixCoordinates = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) {
      return null;
    }
    const fixCoordArray = (coordArray) => {
      return coordArray.map(coord => {
        if (Array.isArray(coord[0])) {
          return fixCoordArray(coord);
        }
        let [lng, lat] = coord;
        if (typeof lng !== 'number' || lng < -180 || lng > 180) {
          lng = ((lng + 180) % 360) - 180;
        }
        if (typeof lat !== 'number' || lat < -90 || lat > 90) {
          lat = Math.max(-90, Math.min(90, lat));
        }
        return [parseFloat(lng.toFixed(8)), parseFloat(lat.toFixed(8))];
      });
    };
    try {
      return fixCoordArray(coordinates);
    } catch (error) {
      console.error("Error fixing coordinates:", error);
      return null;
    }
  };

  // Helper: Process Google Earth geometry
  const processGoogleEarthGeometry = (feature) => {
    try {
      if (!feature || !feature.geometry) {
        throw new Error("Feature tidak memiliki geometri");
      }
      let geometry = feature.geometry;

      if (geometry.type === "MultiPolygon") {
        const fixedCoordinates = geometry.coordinates.map(polygon =>
          validateAndFixCoordinates(polygon)
        ).filter(Boolean);
        if (fixedCoordinates.length === 0) {
          throw new Error("Tidak ada koordinat valid dalam MultiPolygon");
        }
        if (fixedCoordinates.length > 1) {
          const areas = fixedCoordinates.map(coords => {
            try {
              return turf.area(turf.polygon(coords));
            } catch (e) {
              return 0;
            }
          });
          const maxIndex = areas.indexOf(Math.max(...areas));
          geometry = {
            type: "Polygon",
            coordinates: fixedCoordinates[maxIndex]
          };
        } else {
          geometry = {
            type: "Polygon",
            coordinates: fixedCoordinates[0]
          };
        }
      } else if (geometry.type === "Polygon") {
        const fixedCoordinates = validateAndFixCoordinates(geometry.coordinates);
        if (!fixedCoordinates) {
          throw new Error("Gagal memperbaiki koordinat polygon");
        }
        geometry = {
          type: "Polygon",
          coordinates: fixedCoordinates
        };
      } else {
        throw new Error(`Tipe geometri tidak didukung: ${geometry.type}`);
      }

      // Ensure polygon is closed
      const coords = geometry.coordinates[0];
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([...first]);
        }
      }

      // Validate final geometry
      const testPolygon = turf.polygon(geometry.coordinates);
      const area = turf.area(testPolygon);
      if (area === 0 || isNaN(area)) {
        throw new Error("Area polygon tidak valid (0 atau NaN)");
      }

      return geometry;
    } catch (error) {
      console.error("Error processing Google Earth geometry:", error);
      throw error;
    }
  };

  // Helper: Extract all polygons from KML
  const extractAllPolygonsFromKML = (geojsonData) => {
    if (!geojsonData?.features?.length) {
      return [];
    }
    return geojsonData.features
      .filter(f => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon")
      .map((feature, index) => ({
        name: feature.properties?.name || `Polygon ${index + 1}`,
        geometry: feature.geometry,
        properties: feature.properties,
        index: index
      }));
  };

  // Helper: Show polygon selection dialog
  const showPolygonSelectionDialog = async (polygons) => {
    const options = {};
    polygons.forEach((poly, idx) => {
      options[idx] = poly.name;
    });

    const { value: selectedIndex } = await Swal.fire({
      title: 'Pilih Polygon',
      html: `
        <p class="mb-2">File KML/KMZ mengandung <strong>${polygons.length} polygon</strong>.</p>
        <p class="mb-3">Silakan pilih polygon yang ingin digunakan:</p>
      `,
      input: 'select',
      inputOptions: options,
      inputPlaceholder: 'Pilih polygon',
      showCancelButton: true,
      confirmButtonText: 'Gunakan Polygon Ini',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value && value !== 0) {
          return 'Anda harus memilih salah satu polygon!';
        }
      }
    });

    if (selectedIndex !== undefined) {
      return parseInt(selectedIndex);
    }
    return null;
  };

  // Process KML import for Informasi Dasar
  const processInfoDasarKmlImport = async () => {
    const file = kmlFileRef.current;
    if (!file) return;

    const toastId = toast.loading("Memproses file...");

    try {
      let kmlString;
      if (isKmzFile(file.name)) {
        toast.loading("Mengekstrak file KMZ...", { id: toastId });
        kmlString = await extractKmlFromKmz(file);
      } else {
        toast.loading("Membaca file KML...", { id: toastId });
        kmlString = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error("Gagal membaca file"));
          reader.readAsText(file);
        });
      }

      toast.loading("Memproses geometri...", { id: toastId });
      const kmlDom = new DOMParser().parseFromString(kmlString, "text/xml");
      const parseError = kmlDom.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        throw new Error("File KML tidak valid atau rusak");
      }

      const geojsonData = kml(kmlDom);
      if (!geojsonData?.features?.length) {
        throw new Error("File tidak mengandung data geometri yang valid");
      }

      const allPolygons = extractAllPolygonsFromKML(geojsonData);
      if (allPolygons.length === 0) {
        throw new Error("Tidak ditemukan geometri poligon dalam file");
      }

      let selectedPolygon;
      if (allPolygons.length > 1) {
        toast.dismiss(toastId);
        const selectedIndex = await showPolygonSelectionDialog(allPolygons);
        if (selectedIndex === null) {
          setInfoDasarKmlFileName("");
          kmlFileRef.current = null;
          return;
        }
        selectedPolygon = allPolygons[selectedIndex];
        const newToastId = toast.loading("Memproses polygon terpilih...");
        try {
          const processedGeometry = processGoogleEarthGeometry({
            geometry: selectedPolygon.geometry,
            properties: selectedPolygon.properties
          });
          if (!processedGeometry) {
            throw new Error("Gagal memproses geometri dari file");
          }
          toast.success(`Polygon "${selectedPolygon.name}" berhasil diimpor!`, { id: newToastId });
          analyzeAndSetGeometryForKml(processedGeometry);
        } catch (error) {
          toast.error(`Gagal memproses: ${error.message}`, { id: newToastId });
          throw error;
        }
      } else {
        selectedPolygon = allPolygons[0];
        toast.loading("Memvalidasi koordinat...", { id: toastId });
        const processedGeometry = processGoogleEarthGeometry({
          geometry: selectedPolygon.geometry,
          properties: selectedPolygon.properties
        });
        if (!processedGeometry) {
          throw new Error("Gagal memproses geometri dari file");
        }
        toast.success(`Polygon "${selectedPolygon.name}" berhasil diimpor!`, { id: toastId });
        analyzeAndSetGeometryForKml(processedGeometry);
      }
    } catch (error) {
      console.error("Error processing KML/KMZ:", error);
      toast.error(`Gagal memproses file: ${error.message}`, { id: toastId });
      setInfoDasarKmlFileName("");
      kmlFileRef.current = null;
    }
  };

  // Analyze and set geometry from KML import
  const analyzeAndSetGeometryForKml = async (geometry) => {
    const toastId = toast.loading("Menganalisis poligon...");
    try {
      toast.loading("Memuat data batas wilayah...", { id: toastId });
      const [koremBoundaryRes, kodimBoundaryRes] = await Promise.all([
        axiosAuth.get("/data/korem.geojson"),
        axiosAuth.get("/data/Kodim.geojson"),
      ]);
      const koremBoundaryData = koremBoundaryRes.data;
      const kodimBoundaryData = kodimBoundaryRes.data;

      toast.loading("Mencari wilayah...", { id: toastId });
      const centerPoint = turf.centroid(geometry);
      let foundKorem = null;
      let foundKodim = null;

      for (const koremFeature of koremBoundaryData.features) {
        if (turf.booleanPointInPolygon(centerPoint, koremFeature)) {
          foundKorem = koremFeature.properties;
          break;
        }
      }

      if (foundKorem) {
        for (const kodimFeature of kodimBoundaryData.features) {
          if (turf.booleanPointInPolygon(centerPoint, kodimFeature)) {
            foundKodim = kodimFeature.properties;
            break;
          }
        }

        const koremNameInGeoJSON = foundKorem.listkodim_Korem;
        const koremIdToSet = koremList.find(
          (k) => k.nama === koremNameInGeoJSON
        )?.id;
        const kodimNameInGeoJSON = foundKodim
          ? normalizeKodimName(foundKodim.listkodim_Kodim)
          : koremNameInGeoJSON === "Berdiri Sendiri" ||
            koremNameInGeoJSON === "Kodim 0733/Kota Semarang"
            ? "Kodim 0733/Kota Semarang"
            : koremNameInGeoJSON;

        if (koremIdToSet) {
          setInfoDasarFormData((prev) => ({
            ...prev,
            korem_id: koremIdToSet,
            kodim: kodimNameInGeoJSON,
          }));
          setSelectedKoremId(koremIdToSet);
          setSelectedKodimId(kodimNameInGeoJSON);
          
          // Call handleKmlImport with geometry
          handleKmlImport(geometry, false);
          
          toast.success("Poligon berhasil diproses.", { id: toastId });
        } else {
          toast.error(
            `Korem "${koremNameInGeoJSON}" ditemukan tapi tidak ada di daftar pilihan.`,
            { id: toastId }
          );
        }
      } else {
        toast.error(
          "Gagal menentukan wilayah Korem untuk poligon. Cek apakah poligon berada di wilayah yang valid.",
          { id: toastId }
        );
      }
    } catch (error) {
      console.error("Error during geometry analysis:", error);
      toast.error("Terjadi kesalahan saat memproses geometri.", { id: toastId });
    }
  };

  const handleInfoDasarKmlImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      setInfoDasarKmlFileName(file.name);
      kmlFileRef.current = file;
      // Check if there's existing geometry
      if (drawnAsset) {
        Swal.fire({
          title: "Apakah Anda yakin?",
          text: "Mengimpor file KML/KMZ baru akan menghapus area aset yang telah digambar sebelumnya. Lanjutkan?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Ya, impor!",
          cancelButtonText: "Batal",
        }).then((result) => {
          if (result.isConfirmed) {
            clearAssetLocation();
            processInfoDasarKmlImport();
          } else {
            event.target.value = null;
            setInfoDasarKmlFileName("");
            kmlFileRef.current = null;
          }
        });
      } else {
        processInfoDasarKmlImport();
      }
    } else {
      setInfoDasarKmlFileName("");
      kmlFileRef.current = null;
    }
  };

  const handleInfoDasarProcessCoords = () => {
    if (!infoDasarCoordsText.trim()) {
      setInfoDasarCoordsError("Masukkan koordinat terlebih dahulu.");
      return;
    }

    const lines = infoDasarCoordsText.trim().split("\n");
    if (lines.length < 3) {
      setInfoDasarCoordsError(
        "Minimal dibutuhkan 3 titik koordinat untuk membuat poligon."
      );
      return;
    }

    const coordinates = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(",");
      if (parts.length !== 2) {
        setInfoDasarCoordsError(
          `Format salah di baris ${i + 1}. Gunakan format: longitude,latitude`
        );
        return;
      }
      const lon = parseFloat(parts[0].trim());
      const lat = parseFloat(parts[1].trim());
      if (
        isNaN(lon) ||
        isNaN(lat) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        setInfoDasarCoordsError(`Koordinat tidak valid di baris ${i + 1}.`);
        return;
      }
      coordinates.push([lon, lat]);
    }

    // Close polygon if not already closed
    if (
      coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]
    ) {
      coordinates.push(coordinates[0]);
    }

    const geojsonPolygon = { type: "Polygon", coordinates: [coordinates] };

    // Check if there's existing geometry
    if (drawnAsset) {
      Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Memproses koordinat baru akan menghapus area aset yang telah digambar sebelumnya. Lanjutkan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Ya, proses!",
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          clearAssetLocation();
          analyzeAndSetGeometryForCoords(geojsonPolygon);
        }
      });
    } else {
      analyzeAndSetGeometryForCoords(geojsonPolygon);
    }
  };

  const analyzeAndSetGeometryForCoords = async (geometry) => {
    const toastId = toast.loading("Menganalisis poligon...");
    try {
      toast.loading("Memuat data batas wilayah...", { id: toastId });
      const [koremBoundaryRes, kodimBoundaryRes] = await Promise.all([
        axiosAuth.get("/data/korem.geojson"),
        axiosAuth.get("/data/Kodim.geojson"),
      ]);
      const koremBoundaryData = koremBoundaryRes.data;
      const kodimBoundaryData = kodimBoundaryRes.data;

      toast.loading("Mencari wilayah...", { id: toastId });
      const centerPoint = turf.centroid(geometry);
      let foundKorem = null;
      let foundKodim = null;

      for (const koremFeature of koremBoundaryData.features) {
        if (turf.booleanPointInPolygon(centerPoint, koremFeature)) {
          foundKorem = koremFeature.properties;
          break;
        }
      }

      if (foundKorem) {
        for (const kodimFeature of kodimBoundaryData.features) {
          if (turf.booleanPointInPolygon(centerPoint, kodimFeature)) {
            foundKodim = kodimFeature.properties;
            break;
          }
        }

        const koremNameInGeoJSON = foundKorem.listkodim_Korem;
        const koremIdToSet = koremList.find(
          (k) => k.nama === koremNameInGeoJSON
        )?.id;
        const kodimNameInGeoJSON = foundKodim
          ? normalizeKodimName(foundKodim.listkodim_Kodim)
          : koremNameInGeoJSON === "Berdiri Sendiri" ||
            koremNameInGeoJSON === "Kodim 0733/Kota Semarang"
            ? "Kodim 0733/Kota Semarang"
            : koremNameInGeoJSON;

        if (koremIdToSet) {
          setInfoDasarFormData((prev) => ({
            ...prev,
            korem_id: koremIdToSet,
            kodim: kodimNameInGeoJSON,
          }));
          setSelectedKoremId(koremIdToSet);
          setSelectedKodimId(kodimNameInGeoJSON);
          
          // Call handleKmlImport with geometry (isFromCoords = true)
          handleKmlImport(geometry, true);
          
          toast.success("Poligon berhasil diproses.", { id: toastId });
        } else {
          toast.error(
            `Korem "${koremNameInGeoJSON}" ditemukan tapi tidak ada di daftar pilihan.`,
            { id: toastId }
          );
        }
      } else {
        toast.error(
          "Gagal menentukan wilayah Korem untuk poligon. Cek apakah poligon berada di wilayah yang valid.",
          { id: toastId }
        );
      }
    } catch (error) {
      console.error("Error during geometry analysis:", error);
      toast.error("Terjadi kesalahan saat memproses geometri.", { id: toastId });
    }
  };

  const handleCancel = () => {
    navigate("/data-aset-tanah", { replace: true });
  };

  if (loading) return (
    <div className="loading-spinner-wrapper">
      <Spinner animation="border" variant="primary" />
    </div>
  );
  if (error) return <Alert variant="danger" className="error-alert">{error}</Alert>;

  return (
    <Container fluid className="tambah-aset-page mt-4">
      {/* BARIS 1: PETA DI KIRI, INFORMASI DASAR DI KANAN */}
      <Row className="g-4">
        {/* PETA - 8 Kolom */}
        <Col lg={8} xs={12}>
          <div className="map-frame-modern" style={{ height: "60vh", width: "100%", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
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
              importedGeometry={drawnAsset && drawnAsset.source === 'import' ? drawnAsset.geometry : importedGeometry}
              geoJsonKey={geoJsonKey}
              inputMode={inputMode}
            />
          </div>
        </Col>

        {/* LOKASI & WILAYAH - 4 Kolom */}
        <Col lg={4} xs={12}>
          <div className="info-panel" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", padding: "1.5rem", height: "100%" }}>
            <InformasiDasarAset
              koremList={koremList}
              formData={infoDasarFormData}
              handleChange={handleInfoDasarChange}
              inputMethod={infoDasarInputMethod}
              handleInputChangeMethod={handleInfoDasarInputChangeMethod}
              handleKmlImport={handleInfoDasarKmlImport}
              kmlFileName={infoDasarKmlFileName}
              coordsText={infoDasarCoordsText}
              setCoordsText={setInfoDasarCoordsText}
              coordsError={infoDasarCoordsError}
              handleProcessCoords={handleInfoDasarProcessCoords}
              isEnabled={isFormEnabled}
              kodimList={infoDasarKodimList}
              onSave={handleSaveAsset}
              onCancel={handleCancel}
            />
          </div>
        </Col>
      </Row>

      {/* BARIS 2: FORMULIR LENGKAP (tanpa Lokasi & Metode Input) */}
      <Row className="g-4 mt-2">
        <Col xs={12}>
          <div className="form-section" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", padding: "1.5rem" }}>
            <h5 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1a1a2e", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fas fa-file-alt" style={{ color: "#6c757d" }}></i>
              Formulir Aset BMN
            </h5>
            <FormAset
              ref={formRef}
              onSave={handleSaveAsset}
              onCancel={handleCancel}
              koremList={koremList}
              onLocationChange={handleLocationChange}
              onKmlImport={handleKmlImport}
              onClearDrawing={clearAssetLocation}
              onResetMapView={handleResetMapView}
              onUpdateInputMode={setInputMode}
              initialGeometry={drawnAsset ? drawnAsset.geometry : null}
              initialArea={drawnAsset ? drawnAsset.area : null}
              isEnabled={isFormEnabled}
              selectedKoremId={selectedKoremId}
              selectedKodimId={selectedKodimId}
              hideLocationFields={true}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetPage;
