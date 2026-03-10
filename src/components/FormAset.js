import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Button,
  Form,
  Row,
  Col,
  Card,
  Alert,
  Image,
  ButtonGroup,
  ToggleButton,
} from "react-bootstrap";
import toast from "react-hot-toast";
import axios from "axios";
import Swal from "sweetalert2";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "xmldom";
import JSZip from "jszip";
import { normalizeKodimName } from "../utils/kodimUtils";
import * as turf from "@turf/turf";
import { isGeometryNearCoastalArea, findCoastalArea } from "../utils/coastalConfig";
import "./FormAset.css";

// Helper functions
const isImageFile = (filename) => {
  if (!filename) return false;
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const isPdfFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".pdf");
};

const isVideoFile = (filename) => {
  if (!filename) return false;
  const videoExtensions = [".mp4", ".mov", ".webm", ".avi"];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const isKmzFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".kmz");
};

// IMPROVED: Enhanced KML extraction from KMZ with better error handling
const extractKmlFromKmz = async (file) => {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    // Cari file .kml dalam zip (case insensitive)
    const kmlFile = Object.keys(zipContent.files).find(
      (filename) => filename.toLowerCase().endsWith('.kml')
    );

    if (!kmlFile) {
      throw new Error("Tidak ditemukan file KML dalam KMZ");
    }

    console.log("KML file found in KMZ:", kmlFile);

    // Extract konten KML
    const kmlContent = await zipContent.files[kmlFile].async("text");
    return kmlContent;
  } catch (error) {
    console.error("Error extracting KMZ:", error);
    throw new Error(`Gagal mengekstrak KMZ: ${error.message}`);
  }
};

// NEW: Function to validate and fix coordinates from Google Earth
const validateAndFixCoordinates = (coordinates) => {
  if (!coordinates || !Array.isArray(coordinates)) {
    console.error("Invalid coordinates:", coordinates);
    return null;
  }

  const fixCoordArray = (coordArray) => {
    return coordArray.map(coord => {
      if (Array.isArray(coord[0])) {
        // Nested array (polygon ring)
        return fixCoordArray(coord);
      }

      // Individual coordinate [lng, lat, elevation?]
      let [lng, lat, elev] = coord;

      // Validate longitude (-180 to 180)
      if (typeof lng !== 'number' || lng < -180 || lng > 180) {
        console.warn(`Invalid longitude: ${lng}, attempting to fix`);
        lng = ((lng + 180) % 360) - 180;
      }

      // Validate latitude (-90 to 90)
      if (typeof lat !== 'number' || lat < -90 || lat > 90) {
        console.warn(`Invalid latitude: ${lat}, attempting to fix`);
        lat = Math.max(-90, Math.min(90, lat));
      }

      // Return only [lng, lat] without elevation
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

// NEW: Enhanced function to process geometry from Google Earth KML
const processGoogleEarthGeometry = (feature) => {
  try {
    if (!feature || !feature.geometry) {
      throw new Error("Feature tidak memiliki geometri");
    }

    let geometry = feature.geometry;
    console.log("Original geometry type:", geometry.type);
    console.log("Original coordinates sample:", geometry.coordinates?.[0]?.[0]);

    // Handle MultiPolygon - combine all polygons into one if needed
    if (geometry.type === "MultiPolygon") {
      console.log("Processing MultiPolygon with", geometry.coordinates.length, "polygons");

      // Validate and fix all coordinates
      const fixedCoordinates = geometry.coordinates.map(polygon =>
        validateAndFixCoordinates(polygon)
      ).filter(Boolean);

      if (fixedCoordinates.length === 0) {
        throw new Error("Tidak ada koordinat valid dalam MultiPolygon");
      }

      // If multiple polygons, use the largest one
      if (fixedCoordinates.length > 1) {
        console.warn("MultiPolygon detected, using the largest polygon");
        const areas = fixedCoordinates.map(coords => {
          try {
            const poly = turf.polygon(coords);
            return turf.area(poly);
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
      // Validate and fix polygon coordinates
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

    // Ensure the polygon is closed (first and last coordinates are the same)
    const coords = geometry.coordinates[0];
    if (coords.length > 0) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        console.log("Closing polygon by adding first coordinate at the end");
        coords.push([...first]);
      }
    }

    // Validate the final geometry
    try {
      const testPolygon = turf.polygon(geometry.coordinates);
      const area = turf.area(testPolygon);
      console.log("Processed geometry area:", area, "m²");

      if (area === 0 || isNaN(area)) {
        throw new Error("Area polygon tidak valid (0 atau NaN)");
      }
    } catch (error) {
      throw new Error(`Validasi geometri gagal: ${error.message}`);
    }

    console.log("Final processed geometry:", geometry);
    return geometry;
  } catch (error) {
    console.error("Error processing Google Earth geometry:", error);
    throw error;
  }
};

const API_URL = "http://localhost:3001";

const FormAset = forwardRef((props, ref) => {
  const {
    onSave,
    onCancel,
    koremList,
    onLocationChange,
    onKmlImport,
    assetToEdit,
    initialGeometry,
    initialArea,
    isEnabled = false,
    viewMode = false,
    selectedKoremId,
    selectedKodimId,
    isEditMode = false,
    hideLocationFields = false,
    hideActionButtons = false,
  } = props;

  // States
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [kodimList, setKodimList] = useState([]);
  const [buktiPemilikanFile, setBuktiPemilikanFile] = useState(null);
  const [assetPhotos, setAssetPhotos] = useState([]);
  const [gambarTampakAtasFile, setGambarTampakAtasFile] = useState(null);
  const [kmlFileName, setKmlFileName] = useState("");
  const [inputMethod, setInputMethod] = useState("draw");
  const [filesToDelete, setFilesToDelete] = useState({
    buktiPemilikan: null,
    fotoTampakAtas: null,
    assetPhotos: []
  });
  const [coordsText, setCoordsText] = useState("");
  const [coordsError, setCoordsError] = useState("");

  const statusOptions = [
    { value: "Dimiliki/Dikuasai", label: "Dimiliki/Dikuasai" },
    { value: "TIdak Dimiliki/Dikuasai", label: "TIdak Dimiliki/Dikuasai" },
  ];

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      formData,
      buktiPemilikanFile,
      assetPhotos,
      gambarTampakAtasFile,
    }),
    resetFilesToDelete: () => {
      setFilesToDelete({
        buktiPemilikan: null,
        fotoTampakAtas: null,
        assetPhotos: []
      });
    }
  }));

  const extractFilename = (url) => {
    if (!url) return null;
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  // DELETE HANDLERS
  const handleDeleteBuktiPemilikan = () => {
    if (!formData.bukti_pemilikan_url) {
      toast.error("Tidak ada bukti pemilikan untuk dihapus.");
      return;
    }

    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Bukti pemilikan akan dihapus saat Anda menyimpan perubahan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus nanti!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        setFilesToDelete(prev => ({
          ...prev,
          buktiPemilikan: formData.bukti_pemilikan_url
        }));

        setFormData((prev) => ({
          ...prev,
          bukti_pemilikan_url: null,
          bukti_pemilikan_filename: null,
        }));

        toast.success("Bukti pemilikan ditandai untuk dihapus saat disimpan!");
      }
    });
  };

  const handleRemovePhoto = (mediaUrl) => {
    if (!mediaUrl) {
      toast.error("URL foto tidak valid");
      return;
    }

    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Foto akan dihapus saat Anda menyimpan perubahan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus nanti!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        setFilesToDelete(prev => ({
          ...prev,
          assetPhotos: [...prev.assetPhotos, mediaUrl]
        }));

        setFormData((prev) => ({
          ...prev,
          foto_aset: prev.foto_aset.filter((url) => url !== mediaUrl),
        }));

        toast.success("Foto ditandai untuk dihapus saat disimpan!");
      }
    });
  };

  const handleDeleteFotoTampakAtas = () => {
    if (!formData.gambar_tampak_atas_url) {
      toast.error("Tidak ada foto aset tampak atas untuk dihapus.");
      return;
    }

    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Foto tampak atas akan dihapus saat Anda menyimpan perubahan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus nanti!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        setFilesToDelete(prev => ({
          ...prev,
          fotoTampakAtas: formData.gambar_tampak_atas_url
        }));

        setFormData((prev) => ({
          ...prev,
          gambar_tampak_atas_url: null,
          gambar_tampak_atas_filename: null,
        }));

        toast.success("Foto tampak atas ditandai untuk dihapus saat disimpan!");
      }
    });
  };

  // FILE CHANGE HANDLERS
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(
          `File bukti pemilikan melebihi ukuran maksimal 10MB: ${file.name}`
        );
        return;
      }
      setBuktiPemilikanFile(file);
    }
  };

  const handleAssetPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const maxSize = 50 * 1024 * 1024;
      const oversizedFiles = files.filter((file) => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map((file) => file.name).join(", ");
        toast.error(`File berikut melebihi ukuran maksimal 50MB: ${fileNames}`);
        return;
      }

      if (isEditMode) {
        const existingPhotoCount = formData.foto_aset
          ? formData.foto_aset.length
          : 0;
        const newFileCount = files.length;
        const totalFileCount = existingPhotoCount + newFileCount;

        if (totalFileCount > 5) {
          toast.error(
            `Total file foto aset tidak boleh melebihi 5. Anda saat ini memiliki ${existingPhotoCount} file dan mencoba menambahkan ${newFileCount} file. Maksimal ${5 - existingPhotoCount} file dapat ditambahkan.`
          );
          return;
        }
      } else {
        if (files.length > 5) {
          toast.error(
            "Maksimal hanya 5 file foto aset yang dapat diupload sekaligus."
          );
          return;
        }
      }
      setAssetPhotos(files);
    }
  };

  const handleGambarTampakAtasChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(
          `File foto aset tampak atas melebihi ukuran maksimal 10MB: ${file.name}`
        );
        return;
      }
      setGambarTampakAtasFile(file);
    }
  };

  // OTHER HANDLERS
  const getCurrentAreaValue = () => {
    if (formData.pemilikan_sertifikat === "Ya") {
      return formData.sertifikat_luas;
    }
    return formData.belum_sertifikat_luas;
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.nama) newErrors.nama = "NUP tidak boleh kosong.";
    if (!formData.korem_id) newErrors.korem_id = "Korem tidak boleh kosong.";
    if (!formData.kodim) newErrors.kodim = "Kodim tidak boleh kosong.";
    if (!formData.kib_kode_barang) newErrors.kib_kode_barang = "Kode Barang KIB tidak boleh kosong.";
    if (!formData.nomor_registrasi) newErrors.nomor_registrasi = "No Registrasi tidak boleh kosong.";
    if (!formData.asal_milik) newErrors.asal_milik = "Asal Milik tidak boleh kosong.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Silakan lengkapi semua field yang wajib diisi.");
      return;
    }

    const dataToSave = {
      ...formData,
      luas:
        formData.pemilikan_sertifikat === "Ya"
          ? parseFloat(formData.sertifikat_luas) || 0
          : parseFloat(formData.belum_sertifikat_luas) || 0,
    };

    onSave(dataToSave, buktiPemilikanFile, assetPhotos, gambarTampakAtasFile, filesToDelete);
  };

  const handleChange = (e) => {
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
      setFormData({ ...formData, korem_id: value, kodim: kodimValue });
      onLocationChange?.(value, kodimValue);
    } else if (name === "pemilikan_sertifikat") {
      const currentArea =
        formData.sertifikat_luas ||
        formData.belum_sertifikat_luas ||
        formData.luas ||
        initialArea;
      setFormData((prev) => {
        const updatedData = { ...prev, [name]: value };
        if (value === "Ya") {
          updatedData.sertifikat_luas = currentArea || "";
          updatedData.belum_sertifikat_luas = "";
          updatedData.luas = currentArea || "";
        } else {
          updatedData.belum_sertifikat_luas = currentArea || "";
          updatedData.sertifikat_luas = "";
          updatedData.luas = currentArea || "";
        }
        return updatedData;
      });
    } else if (name === "sertifikat_luas" || name === "belum_sertifikat_luas") {
      setFormData({
        ...formData,
        [name]: value,
        luas: value,
      });
    } else {
      setFormData({ ...formData, [name]: value });
      if (name === "kodim") {
        onLocationChange?.(formData.korem_id, value);
      }
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Helper function to check if geometry is near coastline
  const isNearCoastline = async (geometry) => {
    try {
      // Use the centralized coastal configuration
      return isGeometryNearCoastalArea(geometry);
    } catch (error) {
      console.error("Error checking coastal proximity:", error);
      return null;
    }
  };

  // Function to expand boundary with buffer for coastal areas
  const expandBoundaryWithBuffer = (boundaryData, bufferDistanceKm) => {
    try {
      const expandedFeatures = boundaryData.features.map(feature => {
        try {
          // Add small buffer to each feature
          const buffered = turf.buffer(feature, bufferDistanceKm, { units: 'kilometers' });
          // Preserve original properties
          buffered.properties = { ...feature.properties };
          return buffered;
        } catch (e) {
          // If buffering fails, return original feature
          return feature;
        }
      });

      return {
        type: 'FeatureCollection',
        features: expandedFeatures
      };
    } catch (error) {
      console.error("Error expanding boundary:", error);
      return boundaryData; // Return original if expansion fails
    }
  };

  const analyzeAndSetGeometry = async (geometry, isFromKmlImport = false) => {
    const toastId = toast.loading("Menganalisis poligon...");
    try {
      toast.loading("Memuat data batas wilayah...", { id: toastId });
      const [koremBoundaryRes, kodimBoundaryRes] = await Promise.all([
        axios.get("/data/korem.geojson"),
        axios.get("/data/Kodim.geojson"),
      ]);
      const koremBoundaryData = koremBoundaryRes.data;
      const kodimBoundaryData = kodimBoundaryRes.data;

      toast.loading("Mencari wilayah...", { id: toastId });
      const centerPoint = turf.centroid(geometry);
      let foundKorem = null;
      let foundKodim = null;
      let usedCoastalBuffer = false;

      // Check if the geometry is near a coastline
      const coastalArea = await isNearCoastline(geometry);

      // Determine which boundary data to use
      let searchKoremData = koremBoundaryData;
      let searchKodimData = kodimBoundaryData;

      if (coastalArea) {
        toast.loading(`Mendeteksi area pesisir, menyesuaikan toleransi...`, { id: toastId });
        // Use expanded boundaries for coastal areas
        searchKoremData = expandBoundaryWithBuffer(koremBoundaryData, coastalArea.bufferDistance);
        searchKodimData = expandBoundaryWithBuffer(kodimBoundaryData, coastalArea.bufferDistance);
        usedCoastalBuffer = true;
      }

      // Search for Korem in the appropriate boundary data
      for (const koremFeature of searchKoremData.features) {
        if (turf.booleanPointInPolygon(centerPoint, koremFeature)) {
          foundKorem = koremFeature.properties;
          break;
        }
      }

      // If not found with centroid, try with intersection for coastal areas
      if (!foundKorem && coastalArea) {
        toast.loading("Mencari wilayah dengan pendekatan intersection...", { id: toastId });
        for (const koremFeature of searchKoremData.features) {
          try {
            if (turf.intersect(turf.featureCollection([geometry, koremFeature]))) {
              foundKorem = koremFeature.properties;
              break;
            }
          } catch (e) {
            // Continue to next feature if intersection fails
            continue;
          }
        }
      }

      if (foundKorem) {
        // Search for Kodim
        for (const kodimFeature of searchKodimData.features) {
          if (turf.booleanPointInPolygon(centerPoint, kodimFeature)) {
            foundKodim = kodimFeature.properties;
            break;
          }
        }

        // If not found with centroid for Kodim in coastal areas, try intersection
        if (!foundKodim && coastalArea) {
          for (const kodimFeature of searchKodimData.features) {
            try {
              if (turf.intersect(turf.featureCollection([geometry, kodimFeature]))) {
                foundKodim = kodimFeature.properties;
                break;
              }
            } catch (e) {
              // Continue to next feature if intersection fails
              continue;
            }
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
          setFormData((prev) => ({
            ...prev,
            korem_id: koremIdToSet,
            kodim: kodimNameInGeoJSON,
          }));
          onLocationChange?.(koremIdToSet, kodimNameInGeoJSON);
          onKmlImport?.(geometry, !isFromKmlImport);

          if (!isFromKmlImport) {
            const successMessage = usedCoastalBuffer
              ? "Poligon berhasil diproses (menggunakan toleransi area pesisir)."
              : "Poligon berhasil diproses.";
            toast.success(successMessage, { id: toastId });
          } else {
            toast.dismiss(toastId);
          }
        } else {
          toast.error(
            `Korem "${koremNameInGeoJSON}" ditemukan tapi tidak ada di daftar pilihan.`,
            { id: toastId }
          );
        }
      } else {
        // Show different message if coastal buffer was used but still failed
        const errorMessage = usedCoastalBuffer
          ? "Gagal menentukan wilayah Korem meskipun telah menggunakan toleransi area pesisir. Pastikan poligon berada di wilayah yang valid."
          : "Gagal menentukan wilayah Korem untuk poligon. Cek apakah poligon berada di wilayah yang valid.";

        toast.error(errorMessage, { id: toastId });
      }
    } catch (error) {
      console.error("Error during geometry analysis:", error);
      toast.error("Terjadi kesalahan saat memproses geometri.", {
        id: toastId,
      });
    }
  };

  // IMPROVED: Enhanced KML/KMZ import handler
  const handleKmlImport = async (event) => {
    if (initialGeometry) {
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
          if (props.onClearDrawing) {
            props.onClearDrawing();
          }
          if (props.onResetMapView) {
            props.onResetMapView();
          }
          continueKmlImport(event);
        } else {
          event.target.value = null;
        }
      });
    } else {
      setInputMethod('kml');
      if (props.onUpdateInputMode) {
        props.onUpdateInputMode('kml');
      }
      continueKmlImport(event);
    }
  };

  // Helper function to extract all polygons from KML
  const extractAllPolygonsFromKML = (geojsonData) => {
    if (!geojsonData?.features?.length) {
      return [];
    }

    const polygons = geojsonData.features
      .filter(f => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon")
      .map((feature, index) => ({
        name: feature.properties?.name || `Polygon ${index + 1}`,
        geometry: feature.geometry,
        properties: feature.properties,
        index: index
      }));

    return polygons;
  };

  // Helper function to show polygon selection dialog
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

  // IMPROVED: Enhanced KML/KMZ processing with multiple polygon support
  const continueKmlImport = async (event) => {
    setInputMethod('kml');
    if (props.onUpdateInputMode) {
      props.onUpdateInputMode('kml');
    }

    const file = event.target.files[0];
    if (!file) {
      setKmlFileName("");
      return;
    }

    setKmlFileName(file.name);
    const toastId = toast.loading("Memproses file...");

    try {
      let kmlString;

      // Extract KML content
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

      // Parse KML
      const kmlDom = new DOMParser().parseFromString(kmlString, "text/xml");

      // Check for parsing errors
      const parseError = kmlDom.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        throw new Error("File KML tidak valid atau rusak");
      }

      const geojsonData = kml(kmlDom);

      if (!geojsonData?.features?.length) {
        throw new Error("File tidak mengandung data geometri yang valid");
      }

      console.log("Parsed GeoJSON features:", geojsonData.features.length);

      // Extract all polygons
      const allPolygons = extractAllPolygonsFromKML(geojsonData);

      if (allPolygons.length === 0) {
        throw new Error("Tidak ditemukan geometri poligon dalam file");
      }

      console.log("Found polygons:", allPolygons.map(p => p.name));

      let selectedPolygon;

      // If multiple polygons, let user choose
      if (allPolygons.length > 1) {
        toast.dismiss(toastId);
        const selectedIndex = await showPolygonSelectionDialog(allPolygons);

        if (selectedIndex === null) {
          setKmlFileName("");
          event.target.value = null;
          return;
        }

        selectedPolygon = allPolygons[selectedIndex];
        const newToastId = toast.loading("Memproses polygon terpilih...");

        // Continue processing with new toast
        try {
          toast.loading("Memvalidasi koordinat...", { id: newToastId });
          const processedGeometry = processGoogleEarthGeometry({
            geometry: selectedPolygon.geometry,
            properties: selectedPolygon.properties
          });

          if (!processedGeometry) {
            throw new Error("Gagal memproses geometri dari file");
          }

          toast.success(`Polygon "${selectedPolygon.name}" berhasil diimpor!`, { id: newToastId });

          // Send to parent component
          analyzeAndSetGeometry(processedGeometry, true);
        } catch (error) {
          toast.error(`Gagal memproses: ${error.message}`, { id: newToastId });
          throw error;
        }
      } else {
        // Single polygon - process directly
        selectedPolygon = allPolygons[0];
        console.log("Selected polygon:", selectedPolygon.name);

        // Process the geometry with enhanced validation
        toast.loading("Memvalidasi koordinat...", { id: toastId });
        const processedGeometry = processGoogleEarthGeometry({
          geometry: selectedPolygon.geometry,
          properties: selectedPolygon.properties
        });

        if (!processedGeometry) {
          throw new Error("Gagal memproses geometri dari file");
        }

        toast.success(`Polygon "${selectedPolygon.name}" berhasil diimpor!`, { id: toastId });

        // Send to parent component
        analyzeAndSetGeometry(processedGeometry, true);
      }

    } catch (error) {
      console.error("Error processing KML/KMZ:", error);
      toast.error(`Gagal memproses file: ${error.message}`, { id: toastId });
      setKmlFileName("");
    }

    event.target.value = null;
  };

  const handleInputChangeMethod = (newMethod) => {
    if (newMethod !== inputMethod && initialGeometry) {
      Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Mengganti metode input lokasi akan menghapus area aset yang telah digambar dan kembali ke tampilan awal peta. Lanjutkan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Ya, ganti!",
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          if (props.onClearDrawing) {
            props.onClearDrawing();
          }
          if (props.onResetMapView) {
            props.onResetMapView();
          }
          if (inputMethod === 'kml') {
            setKmlFileName("");
          } else if (inputMethod === 'coords') {
            setCoordsText("");
            setCoordsError("");
          }
          setInputMethod(newMethod);
          if (props.onUpdateInputMode) {
            props.onUpdateInputMode(newMethod);
          }
        }
      });
    } else {
      if (inputMethod === 'kml') {
        setKmlFileName("");
      } else if (inputMethod === 'coords') {
        setCoordsText("");
        setCoordsError("");
      }
      setInputMethod(newMethod);
      if (props.onUpdateInputMode) {
        props.onUpdateInputMode(newMethod);
      }
    }
  };

  const handleProcessCoords = () => {
    if (initialGeometry) {
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
          if (props.onClearDrawing) {
            props.onClearDrawing();
          }
          if (props.onResetMapView) {
            props.onResetMapView();
          }
          continueProcessCoords();
        }
      });
    } else {
      setInputMethod('coords');
      if (props.onUpdateInputMode) {
        props.onUpdateInputMode('coords');
      }
      continueProcessCoords();
    }
  };

  const continueProcessCoords = () => {
    setInputMethod('coords');
    if (props.onUpdateInputMode) {
      props.onUpdateInputMode('coords');
    }

    setCoordsError("");
    const lines = coordsText.trim().split("\n");
    if (lines.length < 3) {
      setCoordsError(
        "Minimal dibutuhkan 3 titik koordinat untuk membuat poligon."
      );
      return;
    }

    const coordinates = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(",");
      if (parts.length !== 2) {
        setCoordsError(
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
        setCoordsError(`Koordinat tidak valid di baris ${i + 1}.`);
        return;
      }
      coordinates.push([lon, lat]);
    }

    if (
      coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]
    ) {
      coordinates.push(coordinates[0]);
    }

    const geojsonPolygon = { type: "Polygon", coordinates: [coordinates] };
    analyzeAndSetGeometry(geojsonPolygon, false);
  };

  // EFFECTS
  useEffect(() => {
    if (assetToEdit) {
      setFormData({
        ...assetToEdit,
        keterangan: assetToEdit.keterangan || ""
      });
    } else {
      const initialFormData = {
        nama: "",
        korem_id: "",
        kodim: "",
        luas: initialArea ? parseFloat(initialArea.toFixed(2)) : 0,
        kib_kode_barang: "",
        nomor_registrasi: "",
        alamat: "",
        peruntukan: "",
        status: "",
        asal_milik: "",
        pemilikan_sertifikat: "",
        keterangan_bukti_pemilikan: "",
        sertifikat_bidang: "",
        sertifikat_luas: "",
        belum_sertifikat_bidang: "",
        belum_sertifikat_luas: "",
        keterangan: "",
        atas_nama_pemilik_sertifikat: "",
        lokasi: initialGeometry || null,
      };
      setFormData(initialFormData);
    }
  }, [assetToEdit, initialGeometry, initialArea]);

  useEffect(() => {
    if (!assetToEdit) {
      if (selectedKoremId !== formData.korem_id) {
        setFormData((prev) => ({
          ...prev,
          korem_id: selectedKoremId,
          kodim: selectedKodimId || "",
        }));
      } else if (selectedKodimId !== formData.kodim) {
        setFormData((prev) => ({ ...prev, kodim: selectedKodimId }));
      }
    }
  }, [
    assetToEdit,
    selectedKoremId,
    selectedKodimId,
    formData.korem_id,
    formData.kodim,
  ]);

  useEffect(() => {
    if (formData.korem_id) {
      const selectedKoremData = koremList.find(
        (k) => k.id === formData.korem_id
      );
      if (selectedKoremData) {
        const distinctKodims = [...new Set(selectedKoremData.kodim || [])];
        const kodimObjects = distinctKodims.map((kName) => ({
          id: kName,
          nama: kName,
        }));
        setKodimList(kodimObjects);
        if (!assetToEdit) {
          if (
            formData.kodim &&
            kodimObjects.length > 0 &&
            !kodimObjects.some((k) => k.id === formData.kodim)
          ) {
            setFormData((prev) => ({ ...prev, kodim: "" }));
            onLocationChange?.(formData.korem_id, "");
          } else if (kodimObjects.length === 0) {
            const newKodim =
              selectedKoremData.nama === "Berdiri Sendiri" ||
                selectedKoremData.nama === "Kodim 0733/Kota Semarang"
                ? "Kodim 0733/Kota Semarang"
                : selectedKoremData.nama;
            setFormData((prev) => ({ ...prev, kodim: newKodim }));
            onLocationChange?.(formData.korem_id, newKodim);
          }
        }
      }
    } else {
      setKodimList([]);
      if (!assetToEdit) {
        setFormData((prev) => ({ ...prev, kodim: "" }));
      }
    }
  }, [
    assetToEdit,
    formData.korem_id,
    koremList,
    onLocationChange,
    formData.kodim,
  ]);

  useEffect(() => {
    if (initialArea > 0 && !assetToEdit) {
      const areaValue = parseFloat(initialArea.toFixed(2));
      setFormData((prev) => {
        const shouldUpdate =
          formData.pemilikan_sertifikat === "Ya"
            ? !prev.sertifikat_luas || prev.sertifikat_luas === 0
            : !prev.belum_sertifikat_luas || prev.belum_sertifikat_luas === 0;

        if (!shouldUpdate) {
          return prev;
        }

        const updatedData = { ...prev };
        if (prev.pemilikan_sertifikat === "Ya") {
          updatedData.sertifikat_luas = areaValue;
          updatedData.belum_sertifikat_luas = "";
        } else {
          updatedData.belum_sertifikat_luas = areaValue;
          updatedData.sertifikat_luas = "";
        }
        updatedData.luas = areaValue;
        return updatedData;
      });
    }
  }, [initialArea, assetToEdit]);

  return (
    <div className="form-aset-wrapper">
      {!isEnabled && !viewMode && hideLocationFields && (
        <Alert variant="warning" className="mb-4">
          <div className="d-flex align-items-center">
            <i className="fas fa-exclamation-triangle me-2 fs-4"></i>
            <div>
              <strong>Belum ada poligon!</strong>
              <p className="mb-0 mt-1">
                Silakan buat poligon lokasi aset di peta atau melalui panel Informasi Dasar di atas untuk mengaktifkan formulir ini.
              </p>
            </div>
          </div>
        </Alert>
      )}
      <Form>
          <fieldset disabled={viewMode || (hideLocationFields && !isEnabled)}>
            <div className="form-group-section-wrapper">
              {/* INFORMASI DASAR - Hanya tampil jika hideLocationFields = false */}
              {!hideLocationFields && (
              <div className="form-group-section">
                <h6 className="form-group-title">
                  <i className="fas fa-info-circle"></i>
                  Informasi Dasar Aset
                </h6>
                <Row className="gx-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Wilayah Korem *</Form.Label>
                      <Form.Select
                        name="korem_id"
                        value={formData.korem_id || ""}
                        onChange={handleChange}
                        required
                        disabled={viewMode || !!assetToEdit}
                      >
                        <option value="">-- Pilih Korem --</option>
                        {koremList.map((korem) => (
                          <option key={korem.id} value={korem.id}>
                            {korem.nama === "Berdiri Sendiri"
                              ? "Kodim 0733/Kota Semarang"
                              : korem.nama}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Kodim *</Form.Label>
                      <Form.Select
                        name="kodim"
                        value={formData.kodim || ""}
                        onChange={handleChange}
                        disabled={
                          viewMode ||
                          !!assetToEdit ||
                          !formData.korem_id ||
                          kodimList.length === 0
                        }
                        required
                      >
                        <option value="">-- Pilih Kodim --</option>
                        {kodimList.map((kodim, index) => (
                          <option key={`${kodim.id}-${index}`} value={kodim.id}>
                            {kodim.nama}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {!viewMode && !isEditMode && (
                  <Form.Group className="mb-3">
                    <Form.Label>Pilih Metode Input Lokasi</Form.Label>

                    <ButtonGroup className="d-flex flex-column flex-md-row gap-2 mt-2">
                      <ToggleButton
                        id="radio-draw"
                        type="radio"
                        variant="outline-primary"
                        name="inputMethod"
                        value="draw"
                        checked={inputMethod === "draw"}
                        onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
                        className="w-100 rounded rounded-md-0"
                      >
                        Gambar di Peta
                      </ToggleButton>

                      <ToggleButton
                        id="radio-kml"
                        type="radio"
                        variant="outline-primary"
                        name="inputMethod"
                        value="kml"
                        checked={inputMethod === "kml"}
                        onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
                        className="w-100 rounded rounded-md-0"
                      >
                        Impor File KML/KMZ
                      </ToggleButton>

                      <ToggleButton
                        id="radio-coords"
                        type="radio"
                        variant="outline-primary"
                        name="inputMethod"
                        value="coords"
                        checked={inputMethod === "coords"}
                        onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
                        className="w-100 rounded rounded-md-0"
                      >
                        Input Koordinat
                      </ToggleButton>
                    </ButtonGroup>
                  </Form.Group>
                )}

                {!viewMode && !isEditMode && inputMethod === "kml" && (
                  <Form.Group className="mb-3 border p-3 rounded">
                    <Form.Label>Impor Poligon dari KML/KMZ</Form.Label>
                    {!kmlFileName && (
                      <Form.Control
                        type="file"
                        accept=".kml,.kmz"
                        onChange={handleKmlImport}
                      />
                    )}
                    {kmlFileName && (
                      <>
                        <div className="alert alert-info p-2 mb-2">
                          File terpilih: <strong>{kmlFileName}</strong>
                        </div>
                        <Form.Control
                          type="file"
                          accept=".kml,.kmz"
                          onChange={handleKmlImport}
                          className="mb-2"
                        />
                        <Form.Text className="text-muted">
                          Pilih file baru untuk mengganti file yang saat ini dipilih
                        </Form.Text>
                      </>
                    )}
                    <Form.Text className="text-muted d-block mt-2">
                      Format yang didukung: KML dan KMZ. File dari Google Earth akan otomatis diproses dengan benar.
                    </Form.Text>
                  </Form.Group>
                )}

                {!viewMode && !isEditMode && inputMethod === "coords" && (
                  <Form.Group className="mb-3 border p-3 rounded">
                    <Form.Label>Input Koordinat Manual</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={coordsText}
                      onChange={(e) => setCoordsText(e.target.value)}
                      placeholder="Satu titik per baris. Format: longitude,latitude"
                    />
                    <Form.Text className="text-muted">
                      Minimal 3 titik untuk membentuk poligon.
                    </Form.Text>
                    {coordsError && (
                      <Alert variant="danger" className="mt-2 p-2">
                        {coordsError}
                      </Alert>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-2"
                      onClick={handleProcessCoords}
                    >
                      Proses Koordinat
                    </Button>
                  </Form.Group>
                )}

              </div>
              )}

              {/* DETAIL REGISTRASI UTAMA */}
              <div className="form-group-section">
                <Row className="gx-3">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">NUP *</Form.Label>
                      <Form.Control
                        type="text"
                        name="nama"
                        value={formData.nama || ""}
                        onChange={handleChange}
                        placeholder="Masukkan NUP"
                        required
                        disabled={viewMode}
                        isInvalid={!!errors.nama}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.nama}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Kode Barang KIB *</Form.Label>
                      <Form.Control
                        type="text"
                        name="kib_kode_barang"
                        value={formData.kib_kode_barang || ""}
                        onChange={handleChange}
                        placeholder="Contoh: 3.01.01.01.001"
                        required
                        disabled={viewMode}
                        isInvalid={!!errors.kib_kode_barang}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.kib_kode_barang}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">No Registrasi *</Form.Label>
                      <Form.Control
                        type="text"
                        name="nomor_registrasi"
                        value={formData.nomor_registrasi || ""}
                        onChange={handleChange}
                        placeholder="Masukkan no registrasi"
                        required
                        disabled={viewMode}
                        isInvalid={!!errors.nomor_registrasi}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.nomor_registrasi}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="gx-3">
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Alamat Registrasi Aset *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="alamat"
                        value={formData.alamat || ""}
                        onChange={handleChange}
                        placeholder="Masukkan alamat lengkap"
                        disabled={viewMode}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* LOKASI DAN STATUS */}
              <div className="form-group-section">
                <Row className="gx-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Peruntukan *</Form.Label>
                      <Form.Control
                        type="text"
                        name="peruntukan"
                        value={formData.peruntukan || ""}
                        onChange={handleChange}
                        placeholder="Contoh: Kantor, Gudang, Latihan"
                        disabled={viewMode}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Asal Milik *</Form.Label>
                      <Form.Control
                        type="text"
                        name="asal_milik"
                        value={formData.asal_milik || ""}
                        onChange={handleChange}
                        placeholder="Contoh: Pembelian Th. 1950, Peningkatan Status"
                        required
                        disabled={viewMode}
                        isInvalid={!!errors.asal_milik}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.asal_milik}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* LEGALITAS DAN SERTIFIKAT */}
              <div className="form-group-section">
                <Row className="gx-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Status Sertifikat *</Form.Label>
                      <div className="d-flex gap-4">
                        <Form.Check
                          type="radio"
                          id="sertifikat-bersertifikat"
                          name="pemilikan_sertifikat"
                          value="Ya"
                          label="Bersertifikat"
                          checked={formData.pemilikan_sertifikat === "Ya"}
                          onChange={handleChange}
                          disabled={viewMode}
                          inline
                          style={{ fontSize: '1.1rem' }}
                        />
                        <Form.Check
                          type="radio"
                          id="sertifikat-tidak-bersertifikat"
                          name="pemilikan_sertifikat"
                          value="Tidak"
                          label="Tidak Bersertifikat"
                          checked={formData.pemilikan_sertifikat === "Tidak"}
                          onChange={handleChange}
                          disabled={viewMode}
                          inline
                          style={{ fontSize: '1.1rem' }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold">Status *</Form.Label>
                      <Form.Select
                        name="status"
                        value={formData.status || ""}
                        onChange={handleChange}
                        required
                        disabled={viewMode}
                        isInvalid={!!errors.status}
                      >
                        <option value="">-- Pilih Status --</option>
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.status}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                {/* DATA SERTIFIKAT */}
                {formData.pemilikan_sertifikat === "Ya" && (
                  <Card className="mb-3 border-success">
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Atas Nama Pemilik Sertifikat</Form.Label>
                        <Form.Control
                          type="text"
                          name="atas_nama_pemilik_sertifikat"
                          value={formData.atas_nama_pemilik_sertifikat || ""}
                          onChange={handleChange}
                          placeholder="Masukkan atas nama pemilik sertifikat"
                        />
                      </Form.Group>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Jumlah Bidang Bersertifikat</Form.Label>
                            <Form.Control
                              type="number"
                              name="sertifikat_bidang"
                              value={formData.sertifikat_bidang || ""}
                              onChange={handleChange}
                              placeholder="Jumlah bidang"
                              min="0"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Luas Bersertifikat (m²) *</Form.Label>
                            <Form.Control
                              type="number"
                              name="sertifikat_luas"
                              value={formData.sertifikat_luas || ""}
                              onChange={handleChange}
                              placeholder="Otomatis dari peta atau isi manual"
                              title="Luas otomatis diisi dari area yang digambar di peta"
                              min="0"
                              step="0.01"
                            />
                            <Form.Text className="text-success">
                              Otomatis terisi dari area yang digambar di peta,
                              dapat diubah manual
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {/* Jika Sertifikat = Tidak */}
                {formData.pemilikan_sertifikat === "Tidak" && (
                  <Row className="gx-3 mt-2 p-3 border-start border-danger border-4 bg-light rounded-2">
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Jumlah Bidang Belum Bersertifikat</Form.Label>
                        <Form.Control
                          type="number"
                          name="belum_sertifikat_bidang"
                          value={formData.belum_sertifikat_bidang || ""}
                          onChange={handleChange}
                          placeholder="Jumlah bidang"
                          min="0"
                          disabled={viewMode}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Luas Belum Sertifikat (m²)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="belum_sertifikat_luas"
                          value={formData.belum_sertifikat_luas || ""}
                          onChange={handleChange}
                          placeholder="0.00"
                          disabled={viewMode}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </div>

              {/* LUAS & KETERANGAN TAMBAHAN */}
              <div className="form-group-section">
                <Row className="gx-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nama Bukti Kepemilikan</Form.Label>
                      <Form.Control
                        type="text"
                        name="keterangan_bukti_pemilikan"
                        value={formData.keterangan_bukti_pemilikan || ""}
                        onChange={handleChange}
                        placeholder="Contoh: Sertifikat Hak Milik No. 123"
                        disabled={viewMode}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sejarah</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={1}
                        name="keterangan"
                        value={formData.keterangan || ""}
                        onChange={handleChange}
                        placeholder="Masukkan keterangan tambahan jika ada"
                        disabled={viewMode}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* BUKTI PEMILIKAN */}
                <Row className="gx-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Upload Bukti Pemilikan</Form.Label>
                      {isEditMode && formData.bukti_pemilikan_url && (
                        <div className="mb-2">
                          <Card body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                {isImageFile(formData.bukti_pemilikan_filename) ? (
                                  <Image
                                    src={
                                      formData.bukti_pemilikan_url.startsWith(
                                        "http"
                                      )
                                        ? formData.bukti_pemilikan_url
                                        : `${API_URL}${formData.bukti_pemilikan_url}`
                                    }
                                    alt="Preview"
                                    style={{
                                      height: "50px",
                                      marginRight: "10px",
                                      cursor: "pointer",
                                    }}
                                    fluid
                                    onClick={() =>
                                      window.open(
                                        formData.bukti_pemilikan_url.startsWith(
                                          "http"
                                        )
                                          ? formData.bukti_pemilikan_url
                                          : `${API_URL}${formData.bukti_pemilikan_url}`,
                                        "_blank"
                                      )
                                    }
                                  />
                                ) : isPdfFile(formData.bukti_pemilikan_filename) ? (
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() =>
                                      window.open(
                                        formData.bukti_pemilikan_url.startsWith(
                                          "http"
                                        )
                                          ? formData.bukti_pemilikan_url
                                          : `${API_URL}${formData.bukti_pemilikan_url}`,
                                        "_blank"
                                      )
                                    }
                                  >
                                    Lihat PDF
                                  </Button>
                                ) : (
                                  <a
                                    href={
                                      formData.bukti_pemilikan_url.startsWith(
                                        "http"
                                      )
                                        ? formData.bukti_pemilikan_url
                                        : `${API_URL}${formData.bukti_pemilikan_url}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Lihat File
                                  </a>
                                )}
                                <span className="ms-2 fst-italic">
                                  {formData.bukti_pemilikan_filename}
                                </span>
                              </div>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={handleDeleteBuktiPemilikan}
                              >
                                Hapus
                              </Button>
                            </div>
                          </Card>
                        </div>
                      )}
                      <Form.Control
                        type="file"
                        name="bukti_pemilikan_file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={isEditMode && !!formData.bukti_pemilikan_url || viewMode}
                      />
                      <Form.Text className="text-muted">
                        {isEditMode
                          ? formData.bukti_pemilikan_url
                            ? "Hapus bukti yang ada jika ingin menggantinya."
                            : "Upload file baru untuk mengganti yang lama."
                          : "Format: PDF, JPG, JPEG, PNG (Maks. 10MB per file)"}
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  {/* FOTO ASET TAMPAK ATAS */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Foto Aset Tampak Atas</Form.Label>
                      {isEditMode && formData.gambar_tampak_atas_url && (
                        <div className="mb-2">
                          <Card body>
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <Image
                                  src={
                                    formData.gambar_tampak_atas_url.startsWith(
                                      "http"
                                    )
                                      ? formData.gambar_tampak_atas_url
                                      : `${API_URL}${formData.gambar_tampak_atas_url}`
                                  }
                                  alt="Preview Tampak Atas"
                                  style={{
                                    height: "50px",
                                    marginRight: "10px",
                                    cursor: "pointer",
                                  }}
                                  fluid
                                  onClick={() =>
                                    window.open(
                                      formData.gambar_tampak_atas_url.startsWith(
                                        "http"
                                      )
                                        ? formData.gambar_tampak_atas_url
                                        : `${API_URL}${formData.gambar_tampak_atas_url}`,
                                      "_blank"
                                    )
                                  }
                                />
                                <span className="ms-2 fst-italic">
                                  {formData.gambar_tampak_atas_filename}
                                </span>
                              </div>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={handleDeleteFotoTampakAtas}
                              >
                                Hapus
                              </Button>
                            </div>
                          </Card>
                        </div>
                      )}
                      <Form.Control
                        type="file"
                        name="gambar_tampak_atas_file"
                        onChange={handleGambarTampakAtasChange}
                        accept=".jpg,.jpeg,.png"
                        disabled={isEditMode && !!formData.gambar_tampak_atas_url}
                      />
                      <Form.Text className="text-muted">
                        {isEditMode
                          ? "Hapus gambar yang ada jika ingin menggantinya."
                          : "Maks. 5MB. Rasio disarankan 16:9"}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {/* MULTIPLE FOTO ASET */}
                <Row className="gx-3">
                  <Col md={12}>
                    <Form.Group className="mb-3 mt-3">
                      <Form.Label className="fw-bold">Foto Aset</Form.Label>
                      {isEditMode &&
                        formData.foto_aset &&
                        formData.foto_aset.length > 0 && (
                          <div className="mb-2 p-3 border border-secondary border-opacity-25 rounded-3 bg-light">
                            <p className="mb-2 fs-6">
                            </p>
                            <div className="d-flex flex-wrap gap-3">
                              {formData.foto_aset.map((mediaUrl, index) => {
                                const fullUrl = mediaUrl.startsWith("http")
                                  ? mediaUrl
                                  : `${API_URL}${mediaUrl}`;
                                const isVideo = isVideoFile(fullUrl);
                                return (
                                  <Card
                                    key={index}
                                    className="position-relative shadow-sm border-0 flow-hidden"
                                    style={{ width: "120px", height: "120px", borderRadius: "10px" }}
                                  >
                                    {isVideo ? (
                                      <video
                                        src={fullUrl}
                                        controls
                                        style={{
                                          objectFit: "cover",
                                          width: "100%",
                                          height: "100%",
                                          cursor: "pointer",
                                          borderRadius: "10px"
                                        }}
                                        onClick={() =>
                                          window.open(fullUrl, "_blank")
                                        }
                                        title="Klik untuk lihat video"
                                      />
                                    ) : (
                                      <Card.Img
                                        src={fullUrl}
                                        alt={`Media Aset ${index + 1}`}
                                        style={{
                                          objectFit: "cover",
                                          width: "100%",
                                          height: "100%",
                                          cursor: "pointer",
                                          borderRadius: "10px"
                                        }}
                                        onClick={() =>
                                          window.open(fullUrl, "_blank")
                                        }
                                        title="Klik untuk lihat gambar"
                                      />
                                    )}
                                    {!viewMode && (
                                      <button
                                        className="position-absolute top-0 end-0 m-1 border-0"
                                        onClick={() => handleRemovePhoto(mediaUrl)}
                                        type="button"
                                        title="Hapus foto"
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          minWidth: '24px',
                                          borderRadius: '50%',
                                          backgroundColor: '#dc3545',
                                          border: 'none',
                                          padding: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 10,
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: '#ffffff',
                                            fontSize: '16px',
                                            fontWeight: 900,
                                            lineHeight: 1,
                                            display: 'block',
                                          }}
                                        >
                                          ×
                                        </span>
                                      </button>
                                    )}
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      <Form.Control
                        type="file"
                        name="asset_photos"
                        onChange={handleAssetPhotosChange}
                        multiple
                        accept=".jpg,.jpeg,.png,.mp4,.mov,.webm"
                        disabled={viewMode}
                      />
                      <Form.Text className="text-muted">
                        {isEditMode
                          ? "Upload file baru untuk menambah media (maks. 50MB per file)."
                          : "Format: JPG, PNG, MP4, MOV, WEBM (Maks. 50MB per file, 5 file maksimal)"}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* INFO LUAS */}
              {(initialArea || getCurrentAreaValue()) && (
                <div className="alert alert-info">
                  <small>
                    <strong>Info Luas:</strong>
                    <br />• Area dari peta:{" "}
                    {initialArea
                      ? `${parseFloat(initialArea).toFixed(2)} m²`
                      : "Belum digambar"}
                    <br />• Luas{" "}
                    {formData.pemilikan_sertifikat === "Ya"
                      ? "bersertifikat"
                      : "tidak bersertifikat"}
                    : {getCurrentAreaValue() || "Belum diisi"} m²
                  </small>
                </div>
              )}
            </div>
          </fieldset>

          {/* TOMBOL AKSI */}
          {!hideActionButtons && !assetToEdit && (
            <div className="d-flex gap-2 justify-content-end mt-4 sticky-action-bar flex-wrap">
              <Button
                variant="secondary"
                className="btn-cancel-modern"
                onClick={() => {
                  setFilesToDelete({
                    buktiPemilikan: null,
                    fotoTampakAtas: null,
                    assetPhotos: []
                  });
                  onCancel();
                }}
              >
                <i className="fas fa-arrow-left me-2"></i> Batalkan
              </Button>
              <Button
                variant="primary"
                type="button"
                className="btn-save-modern"
                onClick={handleSave}
                disabled={!isEnabled}
              >
                <i className="fas fa-save me-2"></i> Simpan Aset Baru
              </Button>
            </div>
          )}
          {!hideActionButtons && assetToEdit && !viewMode && (
            <div className="d-flex gap-2 justify-content-end mt-4 sticky-action-bar flex-wrap">
              <Button
                variant="secondary"
                className="btn-cancel-modern"
                onClick={onCancel}
              >
                <i className="fas fa-times me-2"></i> Tutup
              </Button>
              <Button
                variant="primary"
                type="button"
                className="btn-save-modern"
                onClick={(e) => {
                  e.preventDefault();
                  if (handleSave) handleSave(e);
                }}
              >
                <i className="fas fa-save me-2"></i> Simpan Perubahan
              </Button>
            </div>
          )}
          {assetToEdit && viewMode && (
            <div className="d-flex gap-2 justify-content-end mt-4 sticky-action-bar">
              <Button
                variant="secondary"
                className="btn-cancel-modern"
                onClick={onCancel}
              >
                <i className="fas fa-arrow-left me-2"></i> Kembali
              </Button>
            </div>
          )}
        </Form>
    </div>
  );
});

export default FormAset;