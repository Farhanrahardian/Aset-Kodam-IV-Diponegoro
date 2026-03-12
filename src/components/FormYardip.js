import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Form,
  Button,
  Row,
  Col,
  Card,
  Alert,
  ButtonGroup,
  ToggleButton,
  InputGroup,
  Image,
} from "react-bootstrap";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "xmldom";
import JSZip from "jszip";
import * as turf from "@turf/turf";
import { isGeometryNearCoastalArea } from "../utils/coastalConfig";

const API_URL = "http://localhost:3001";

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

// Helper function untuk check apakah file KMZ
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

const initialYardipState = {
  pengelola: "",
  bidang: "",
  kabkota: "",
  kecamatan: "",
  kelurahan: "",
  peruntukan: "",
  status: "",
  keterangan: "",
  provinsi: "",
  area: 0,
  id: null,
  bukti_pemilikan_url: "",
  bukti_pemilikan_filename: "",
  keterangan_bukti_pemilikan: "",
  gambar_tampak_atas_url: "",
  gambar_tampak_atas_filename: "",
  foto_aset: [],
};

const FormYardip = forwardRef(
  (
    {
      onSave,
      onCancel,
      isEnabled = false,
      selectedProvinceName,
      selectedKabupatenName,
      initialArea = 0,
      assetToEdit,
      isEditMode = false,
      onKmlImport,
      onCoordsImport,
      onClearPolygon,
      provinsiData,
      kabupatenData,
      onLocationChange,
      isPolygonCreated,
      onMapLocationSelect,
      onManualAreaChange,
      hideLocationFields = false,
    },
    ref
  ) => {
    const [formData, setFormData] = useState(initialYardipState);
    const [errors, setErrors] = useState({});
    const [inputMethod, setInputMethod] = useState("draw");
    const [coordsText, setCoordsText] = useState("");
    const [coordsError, setCoordsError] = useState("");
    const [kmlFileName, setKmlFileName] = useState("");
    const [buktiPemilikanFile, setBuktiPemilikanFile] = useState(null);
    const [assetPhotos, setAssetPhotos] = useState([]);
    const [gambarTampakAtasFile, setGambarTampakAtasFile] = useState(null);
    const [filesToDelete, setFilesToDelete] = useState({
      buktiPemilikan: null,
      fotoTampakAtas: null,
      assetPhotos: []
    });

    useImperativeHandle(ref, () => ({
      getFormData: () => ({ 
        formData, 
        buktiPemilikanFile, 
        filesToDelete,
        assetPhotos,
        gambarTampakAtasFile
      }),
      resetFilesToDelete: () => {
        setFilesToDelete({
          buktiPemilikan: null,
          fotoTampakAtas: null,
          assetPhotos: []
        });
      }
    }));

    useEffect(() => {
      if (isEditMode && assetToEdit) {
        setFormData({
          ...initialYardipState,
          ...assetToEdit,
          area: assetToEdit.area || initialArea || 0,
        });
      } else {
        setFormData((prev) => ({
          ...initialYardipState,
          provinsi: selectedProvinceName || "",
          kabkota: selectedKabupatenName || "",
          area: initialArea || 0,
        }));
      }
    }, [
      assetToEdit,
      isEditMode,
      selectedProvinceName,
      selectedKabupatenName,
      initialArea,
    ]);

    useEffect(() => {
      if (isPolygonCreated && initialArea > 0) {
        setFormData(prev => ({
          ...prev,
          area: initialArea
        }));
      }
    }, [isPolygonCreated, initialArea]);

    const bidangOptions = [
      "Tanah",
      "Tanah Bangunan",
      "Tanah Gudang Kantor",
      "Ruko",
    ];

    const statusOptions = [
      "Dimiliki/Dikuasai",
      "Tidak Dimiliki/Tidak Dikuasai",
      "Lain-lain",
    ];

    useEffect(() => {
      if (!isEnabled && !isEditMode) {
        handleReset();
      }
    }, [isEnabled, isEditMode]);

    const handleChange = useCallback(
      (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
          setErrors((prev) => ({ ...prev, [name]: "" }));
        }
      },
      [errors]
    );

    const handleAreaChange = useCallback(
      (e) => {
        const value = e.target.value;
        const numValue = parseFloat(value) || 0;

        setFormData((prev) => ({
          ...prev,
          area: numValue,
        }));

        if (onManualAreaChange) {
          onManualAreaChange(numValue);
        }
      },
      [onManualAreaChange]
    );

    const validateForm = useCallback(() => {
      const newErrors = {};
      if (!formData.pengelola?.trim())
        newErrors.pengelola = "Pengelola harus diisi";
      if (!formData.bidang?.trim()) newErrors.bidang = "Bidang harus dipilih";
      if (!formData.kabkota?.trim())
        newErrors.kabkota = "Alamat Kabupaten/Kota harus diisi";
      if (!formData.kecamatan?.trim())
        newErrors.kecamatan = "Kecamatan harus diisi";
      if (!formData.kelurahan?.trim())
        newErrors.kelurahan = "Kelurahan/Desa harus diisi";
      if (!formData.peruntukan?.trim())
        newErrors.peruntukan = "Peruntukan harus diisi";
      if (!formData.status?.trim()) newErrors.status = "Status harus dipilih";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = useCallback(
      (e) => {
        e.preventDefault();
        if (validateForm()) {
          onSave(formData, buktiPemilikanFile, filesToDelete, assetPhotos, gambarTampakAtasFile);
        }
      },
      [validateForm, formData, onSave, buktiPemilikanFile, filesToDelete, assetPhotos, gambarTampakAtasFile]
    );

    const handleReset = useCallback(() => {
      setFormData(initialYardipState);
      setErrors({});
      setBuktiPemilikanFile(null);
      setAssetPhotos([]);
      setGambarTampakAtasFile(null);
      setFilesToDelete({ buktiPemilikan: null, fotoTampakAtas: null, assetPhotos: [] });
    }, []);

    // ===== BUKTI PEMILIKAN HANDLERS =====
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

    // ===== FOTO ASET HANDLERS =====
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
          const existingPhotoCount = formData.foto_aset ? formData.foto_aset.length : 0;
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
            foto_aset: prev.foto_aset?.filter((url) => url !== mediaUrl) || []
          }));

          toast.success("Foto ditandai untuk dihapus saat disimpan!");
        }
      });
    };

    // ===== FOTO TAMPAK ATAS HANDLERS =====
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

    // IMPROVED: Enhanced KML/KMZ file import handler
    const handleKmlFileImport = async (event) => {
      const file = event.target.files[0];

      if (kmlFileName && file) {
        Swal.fire({
          title: "Apakah Anda yakin?",
          text: "Mengganti file KML/KMZ akan menghapus area aset yang telah digambar sebelumnya. Lanjutkan?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Ya, ganti!",
          cancelButtonText: "Batal",
        }).then((result) => {
          if (result.isConfirmed) {
            if (isPolygonCreated && onClearPolygon) {
              onClearPolygon();
            }
            continueKmlImport(file, event);
          } else {
            event.target.value = null;
          }
        });
      } else {
        continueKmlImport(file, event);
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
    const continueKmlImport = async (file, event) => {
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
            onKmlImport?.(processedGeometry, 'kml');
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
          onKmlImport?.(processedGeometry, 'kml');
        }

      } catch (error) {
        console.error("Error processing KML/KMZ:", error);
        toast.error(`Gagal memproses file: ${error.message}`, { id: toastId });
        setKmlFileName("");
      }

      event.target.value = null;
    };

    const handleProcessCoords = () => {
      if (coordsText.trim() && isPolygonCreated) {
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
            if (onClearPolygon) {
              onClearPolygon();
            }
            continueProcessCoords();
          }
        });
      } else {
        continueProcessCoords();
      }
    };

    const continueProcessCoords = () => {
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
        const parts = line.split(/[\s,;\t]+/);
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
        coordinates.length > 0 &&
        (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
          coordinates[0][1] !== coordinates[coordinates.length - 1][1])
      ) {
        coordinates.push(coordinates[0]);
      }

      const geojsonPolygon = { type: "Polygon", coordinates: [coordinates] };
      onCoordsImport?.(geojsonPolygon, 'coords');
    };

    const handleProvinceChange = (e) => {
      const selectedProvince = e.target.value;
      onLocationChange(selectedProvince, "");
      if (selectedProvince && onMapLocationSelect) {
        onMapLocationSelect("provinsi", selectedProvince);
      }
    };

    const isConservationArea = (kabupatenName) => {
      return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
    };

    const handleKabupatenChange = (e) => {
      const selectedKabupaten = e.target.value;
      onLocationChange(selectedProvinceName, selectedKabupaten);
      if (selectedKabupaten && onMapLocationSelect) {
        onMapLocationSelect("kabupaten", selectedKabupaten);
      }
    };

    const handleInputChangeMethod = (newMethod) => {
      if (newMethod !== inputMethod && isPolygonCreated) {
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
            if (onClearPolygon) {
              onClearPolygon();
            }

            if (inputMethod === 'kml') {
              setKmlFileName("");
            } else if (inputMethod === 'coords') {
              setCoordsText("");
              setCoordsError("");
            }

            setInputMethod(newMethod);
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
      }
    };

    return (
      <div className="form-yardip-wrapper">
        <Form onSubmit={handleSubmit}>
          {!isEnabled && !isEditMode && (
            <Alert variant="info">
              Pilih lokasi Provinsi dan Kabupaten/Kota di peta untuk memulai.
            </Alert>
          )}

          <fieldset disabled={!isEnabled && !isEditMode}>
              {/* LOKASI TERPILIH - Hanya tampil jika hideLocationFields = false */}
              <Card className="mb-3">
                {!hideLocationFields && (
                  <Card.Header>
                    <strong>Lokasi Terpilih (dari Peta)</strong>
                  </Card.Header>
                )}
                <Card.Body>
                  {!hideLocationFields && (
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Provinsi</Form.Label>
                          <Form.Select
                            name="provinsi"
                            value={selectedProvinceName || ""}
                            onChange={handleProvinceChange}
                            disabled={isEditMode}
                          >
                            <option value="">-- Pilih Provinsi --</option>
                            {provinsiData?.features.map((p) => (
                              <option
                                key={p.properties.PROVINCE}
                                value={p.properties.PROVINCE}
                              >
                                {p.properties.PROVINCE}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Kabupaten/Kota</Form.Label>
                          <Form.Select
                            name="kabupaten"
                            value={selectedKabupatenName || ""}
                            onChange={handleKabupatenChange}
                            disabled={isEditMode || !selectedProvinceName}
                          >
                            <option value="">-- Pilih Kabupaten/Kota --</option>
                            {selectedProvinceName &&
                              kabupatenData?.features
                                .filter(
                                  (f) =>
                                    f.properties.PROVINCE === selectedProvinceName && !isConservationArea(f.properties.Kabupaten)
                                )
                                .map((f) => (
                                  <option
                                    key={f.properties.Kabupaten}
                                    value={f.properties.Kabupaten}
                                  >
                                    {f.properties.Kabupaten}
                                  </option>
                                ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                  
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Luas Area (dari Peta) <span className="text-danger">*</span>
                    </Form.Label>
                    {isPolygonCreated ? (
                      <InputGroup>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="area"
                          value={formData.area || 0}
                          onChange={handleAreaChange}
                          placeholder="Area dari peta"
                        />
                        <InputGroup.Text>m²</InputGroup.Text>
                      </InputGroup>
                    ) : (
                      <InputGroup>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="area"
                          value={0}
                          onChange={handleAreaChange}
                          placeholder="Area dari peta"
                          disabled
                        />
                        <InputGroup.Text>m²</InputGroup.Text>
                      </InputGroup>
                    )}
                    <Form.Text className="text-muted">
                      {isPolygonCreated
                        ? "Nilai otomatis dari peta, dapat diedit manual jika diperlukan"
                        : "Silakan buat poligon di peta terlebih dahulu untuk melihat luas area"}
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              {!isPolygonCreated && !isEditMode && (
                <Alert variant="warning" className="text-center">
                  Silakan buat poligon di peta terlebih dahulu (gambar, impor
                  KML/KMZ dari Google Earth, atau input koordinat) untuk mengisi detail aset.
                </Alert>
              )}

              <fieldset disabled={!isPolygonCreated}>
                <div className="form-group-section form-yardip-wrapper mt-2">
                  <Row className="gx-3">
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pengelola *</Form.Label>
                        <Form.Control
                          type="text"
                          name="pengelola"
                          value={formData.pengelola}
                          onChange={handleChange}
                          isInvalid={!!errors.pengelola}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.pengelola}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Bidang *</Form.Label>
                        <Form.Select
                          name="bidang"
                          value={formData.bidang}
                          onChange={handleChange}
                          isInvalid={!!errors.bidang}
                          required
                        >
                          <option value="">-- Pilih Bidang --</option>
                          {bidangOptions.map((bidang) => (
                            <option key={bidang} value={bidang}>
                              {bidang}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.bidang}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Peruntukan *</Form.Label>
                        <Form.Control
                          type="text"
                          name="peruntukan"
                          value={formData.peruntukan}
                          onChange={handleChange}
                          isInvalid={!!errors.peruntukan}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.peruntukan}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <div className="form-group-section form-yardip-wrapper">
                  <Form.Group className="mb-3">
                    <Form.Label>Alamat Lengkap *</Form.Label>
                    <Row className="mb-3">
                      <Col>
                        <Form.Control
                          type="text"
                          placeholder="Kabupaten/Kota *"
                          name="kabkota"
                          value={formData.kabkota}
                          onChange={handleChange}
                          isInvalid={!!errors.kabkota}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.kabkota}
                        </Form.Control.Feedback>
                      </Col>
                      <Col>
                        <Form.Control
                          type="text"
                          placeholder="Kecamatan *"
                          name="kecamatan"
                          value={formData.kecamatan}
                          onChange={handleChange}
                          isInvalid={!!errors.kecamatan}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.kecamatan}
                        </Form.Control.Feedback>
                      </Col>
                      <Col>
                        <Form.Control
                          type="text"
                          placeholder="Kelurahan/Desa *"
                          name="kelurahan"
                          value={formData.kelurahan}
                          onChange={handleChange}
                          isInvalid={!!errors.kelurahan}
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.kelurahan}
                        </Form.Control.Feedback>
                      </Col>
                    </Row>
                  </Form.Group>
                </div>

                <div className="form-group-section form-yardip-wrapper">
                  <Row className="gx-3">
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Status *</Form.Label>
                        <Form.Select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          isInvalid={!!errors.status}
                          required
                        >
                          <option value="">-- Pilih Status --</option>
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.status}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Sejarah</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="keterangan"
                          value={formData.keterangan}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <div className="form-group-section form-yardip-wrapper mt-4 mb-3">
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
                        />
                      </Form.Group>
                    </Col>
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
                          disabled={isEditMode && !!formData.bukti_pemilikan_url}
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
                  </Row>

                  {/* FOTO TAMPAK ATAS & FOTO ASET SECTION */}
                  <Row className="gx-3 mt-1">
                    {/* FOTO TAMPAK ATAS */}
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
                                      formData.gambar_tampak_atas_url.startsWith("http")
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
                                        formData.gambar_tampak_atas_url.startsWith("http")
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
                            : "Maks. 10MB. Format: JPG, JPEG, PNG"}
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    {/* FOTO ASET (MULTIPLE) */}
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Foto Aset</Form.Label>
                        {isEditMode && formData.foto_aset && formData.foto_aset.length > 0 && (
                          <div className="mb-2 p-2 border border-secondary border-opacity-25 rounded-3 bg-light">
                            <div className="d-flex flex-wrap gap-2">
                              {formData.foto_aset.map((mediaUrl, index) => {
                                const fullUrl = mediaUrl.startsWith("http")
                                  ? mediaUrl
                                  : `${API_URL}${mediaUrl}`;
                                const isVideo = isVideoFile(fullUrl);
                                return (
                                  <Card
                                    key={index}
                                    className="position-relative shadow-sm border-0"
                                    style={{ width: "80px", height: "80px", borderRadius: "8px" }}
                                  >
                                    {isVideo ? (
                                      <video
                                        src={fullUrl}
                                        style={{
                                          objectFit: "cover",
                                          width: "100%",
                                          height: "100%",
                                          cursor: "pointer",
                                          borderRadius: "8px"
                                        }}
                                        onClick={() => window.open(fullUrl, "_blank")}
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
                                          borderRadius: "8px"
                                        }}
                                        onClick={() => window.open(fullUrl, "_blank")}
                                      />
                                    )}
                                    <button
                                      className="position-absolute top-0 end-0 m-1 border-0"
                                      onClick={() => handleRemovePhoto(mediaUrl)}
                                      type="button"
                                      title="Hapus foto"
                                      style={{
                                        width: '20px',
                                        height: '20px',
                                        minWidth: '20px',
                                        borderRadius: '50%',
                                        backgroundColor: '#dc3545',
                                        border: 'none',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 900, lineHeight: 1 }}>×</span>
                                    </button>
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
                        />
                        <Form.Text className="text-muted">
                          {isEditMode
                            ? "Upload file baru untuk menambah media (maks. 50MB per file, max 5 file)."
                            : "Format: JPG, PNG, MP4, MOV, WEBM (Maks. 50MB per file, 5 file maksimal)"}
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              </fieldset>

              {/* TOMBOL AKSI */}
              {!isEditMode && (
                <div className="d-flex gap-2 justify-content-end mt-4 sticky-action-bar flex-wrap">
                  <Button variant="secondary" className="btn-cancel-modern" onClick={onCancel}>
                    <i className="fas fa-arrow-left me-2"></i> Batalkan
                  </Button>
                  <Button type="submit" variant="primary" className="btn-save-modern">
                    <i className="fas fa-save me-2"></i> {isEditMode ? "Simpan Perubahan" : "Simpan Aset Baru"}
                  </Button>
                </div>
              )}
            </fieldset>
          </Form>
      </div>
    );
  }
);

export default FormYardip;