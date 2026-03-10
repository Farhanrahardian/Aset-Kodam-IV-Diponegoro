import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Spinner,
} from "react-bootstrap";
import axiosAuth from "../utils/axiosAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "xmldom";
import JSZip from "jszip";
import * as turf from "@turf/turf";
import { isGeometryNearCoastalArea } from "../utils/coastalConfig";
import PetaGambarYardip from "../components/PetaGambarYardip";
import FormYardip from "../components/FormYardip";
import LokasiYardipPanel from "../components/LokasiYardipPanel";
import MapErrorBoundary from "../components/MapErrorBoundary";
import { useQueryClient } from "@tanstack/react-query";

const API_URL = "http://localhost:3001";

const TambahAsetYardipPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLocation, setSelectedLocation] = useState({
    provinsi: null,
    kabupaten: null,
  });
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [drawnAsset, setDrawnAsset] = useState(null);

  // NEW: Separate state for manual area editing
  const [manualArea, setManualArea] = useState(null);

  // State untuk Lokasi & Wilayah (panel kanan)
  const [lokasiFormData, setLokasiFormData] = useState({
    provinsi: "",
    kabkota: "",
  });
  const [lokasiInputMethod, setLokasiInputMethod] = useState("draw");
  const [lokasiKmlFileName, setLokasiKmlFileName] = useState("");
  const [lokasiCoordsText, setLokasiCoordsText] = useState("");
  const [lokasiCoordsError, setLokasiCoordsError] = useState("");
  const kmlFileRef = useRef(null);

  const [error, setError] = useState(null);
  const [yardipAssets, setYardipAssets] = useState([]);
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapNavigationTrigger, setMapNavigationTrigger] = useState(null);

  // Load boundary data on mount
  useEffect(() => {
    const loadBoundaryData = async () => {
      try {
        const [provRes, kabRes] = await Promise.all([
          axiosAuth.get("/data/provinsi.geojson"),
          axiosAuth.get("/data/kabupaten_kota.geojson"),
        ]);
        setProvinsiData(provRes.data);
        setKabupatenData(kabRes.data);
      } catch (err) {
        console.error("Error loading boundary data:", err);
        toast.error("Gagal memuat data batas wilayah.");
      } finally {
        setLoading(false);
      }
    };

    loadBoundaryData();
  }, []);

  const handleLocationSelect = useCallback((type, name, isBackOperation = false) => {
    if (type === "provinsi") {
      if (name) {
        setSelectedLocation({ provinsi: name, kabupaten: null });
        setIsDrawingEnabled(false);
        setDrawnAsset(null);
        setManualArea(null);
        // Tampilkan notifikasi hanya jika bukan operasi kembali
        if (!isBackOperation) {
          toast.success(`Provinsi ${name} dipilih. Silakan pilih kabupaten/kota.`);
        }
      } else {
        // Jika name null, kembali ke level nasional (semua pilihan direset)
        setSelectedLocation({ provinsi: null, kabupaten: null });
        setIsDrawingEnabled(false);
        setDrawnAsset(null);
        setManualArea(null);
        // Tampilkan notifikasi hanya jika bukan operasi kembali
        if (!isBackOperation) {
          toast.success("Kembali ke level nasional. Silakan pilih provinsi.");
        }
      }
    } else if (type === "kabupaten") {
      setSelectedLocation((prev) => ({ ...prev, kabupaten: name }));
      setIsDrawingEnabled(true);
      setDrawnAsset(null);
      setManualArea(null);
      toast.success(
        `Kabupaten/Kota ${name} dipilih. Silakan gambar area aset.`
      );
    } else {
      setSelectedLocation({ provinsi: null, kabupaten: null });
      setIsDrawingEnabled(false);
      setDrawnAsset(null);
      setManualArea(null);
    }
  }, []);

  const handleLocationChangeFromForm = useCallback((provinsi, kabupaten) => {
    setSelectedLocation({ provinsi, kabupaten });
    if (kabupaten) {
      setIsDrawingEnabled(true);
    } else {
      setIsDrawingEnabled(false);
    }
    setDrawnAsset(null);
    setManualArea(null);
  }, []);

  const isConservationArea = (kabupatenName) => {
    return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
  };

  const handleMapLocationSelect = useCallback((type, name) => {
    setMapNavigationTrigger({ type, name, timestamp: Date.now() });

    if (type === "provinsi") {
      if (name) {
        setSelectedLocation({ provinsi: name, kabupaten: null });
        setIsDrawingEnabled(false);
        setDrawnAsset(null);
        setManualArea(null);
        toast.success(`Peta dipindahkan ke Provinsi ${name}`);
      } else {
        // Jika name null, kembali ke level nasional (semua pilihan direset)
        setSelectedLocation({ provinsi: null, kabupaten: null });
        setIsDrawingEnabled(false);
        setDrawnAsset(null);
        setManualArea(null);
        toast.success("Kembali ke level nasional.");
      }
    } else if (type === "kabupaten") {
      setSelectedLocation((prev) => ({ ...prev, kabupaten: name }));
      setIsDrawingEnabled(true);
      setDrawnAsset(null);
      setManualArea(null);
      toast.success(`Peta dipindahkan ke Kabupaten/Kota ${name}`);
    }
  }, []);

  const handleDrawingCreated = useCallback((data) => {
    // Handle deletion (data is null)
    if (data === null) {
      setDrawnAsset(null);
      toast.success("Gambar berhasil dihapus.");
      return;
    }

    if (!data || !data.geometry) {
      toast.error("Data gambar tidak valid.");
      return;
    }
    setDrawnAsset({ ...data, source: 'manual' });
    setManualArea(data.area); // Set initial manual area from calculated area
    toast.success(`Area seluas ${data.area.toFixed(2)} m² berhasil digambar.`);
  }, []);

  const handleImportedGeometry = useCallback(
    (geometry, source = 'kml') => {
      // Jika geometry null, ini berarti ingin menghapus polygon, bukan error
      if (geometry === null) {
        setDrawnAsset(null);
        setManualArea(null);
        return;
      }

      if (!geometry || !kabupatenData || !provinsiData) {
        toast.error("Gagal memproses geometri, data batas wilayah belum siap.");
        return;
      }

      const area = turf.area(geometry);
      let containingKab = null;
      let containingProv = null;

      try {
        const centroid = turf.centroid(geometry);

        // Check if the geometry is in a coastal area
        const isCoastal = isGeometryNearCoastalArea(geometry);

        // Find which kabupaten polygon the asset is in
        for (const kabFeature of kabupatenData.features) {
          let isInside = false;

          if (isCoastal) {
            // For coastal areas, use intersection as fallback if centroid check fails
            if (turf.booleanPointInPolygon(centroid, kabFeature)) {
              isInside = true;
            } else {
              // Try intersection approach for coastal areas
              try {
                const intersection = turf.intersect(
                  turf.featureCollection([turf.polygon(geometry.coordinates), kabFeature])
                );
                if (intersection) {
                  isInside = true;
                }
              } catch (e) {
                // If intersection fails, stick with point in polygon
                isInside = turf.booleanPointInPolygon(centroid, kabFeature);
              }
            }
          } else {
            // For non-coastal areas, use standard point in polygon check
            isInside = turf.booleanPointInPolygon(centroid, kabFeature);
          }

          if (isInside) {
            containingKab = kabFeature.properties.Kabupaten;
            containingProv = kabFeature.properties.PROVINCE;
            break;
          }
        }

        // If no kabupaten was found and it's a coastal area, try broader search
        if (!containingKab && isCoastal) {
          for (const kabFeature of kabupatenData.features) {
            try {
              // Create a small buffer around the kabupaten boundary for coastal areas
              const bufferedKab = turf.buffer(kabFeature, 0.05, { units: 'kilometers' });

              const intersection = turf.intersect(
                turf.featureCollection([turf.polygon(geometry.coordinates), bufferedKab])
              );

              if (intersection) {
                containingKab = kabFeature.properties.Kabupaten;
                containingProv = kabFeature.properties.PROVINCE;
                break;
              }
            } catch (e) {
              // If buffering fails, skip this approach
              continue;
            }
          }
        }

        if (containingProv && containingKab) {
          setSelectedLocation({
            provinsi: containingProv,
            kabupaten: containingKab,
          });
          setDrawnAsset({ geometry, area, source: 'import' });
          setManualArea(area);

          if (source === 'kml') {
            toast.success("Poligon dari KML berhasil diimpor!");
          } else if (source === 'coords') {
            toast.success("Koordinat berhasil diproses!");
          }
        } else {
          toast.error(
            "Tidak dapat menentukan lokasi poligon. Pastikan poligon berada di dalam wilayah yang didukung."
          );
          setDrawnAsset({ geometry, area, source: 'import' });
          setManualArea(area);
        }
      } catch (e) {
        toast.error("Terjadi kesalahan saat menganalisis poligon.");
        console.error("Polygon analysis error:", e);
        setDrawnAsset({ geometry, area, source: 'import' });
        setManualArea(area);
      }
    },
    [kabupatenData, provinsiData]
  );

  // Handler khusus untuk menghapus polygon dan mereset tampilan peta
  const handleClearPolygon = useCallback(() => {
    setDrawnAsset(null);
    setManualArea(null);
    // Reset pilihan wilayah ke null untuk kembali ke tampilan default
    setSelectedLocation({ provinsi: null, kabupaten: null });
    setIsDrawingEnabled(false);
  }, [setSelectedLocation, setIsDrawingEnabled]);

  // NEW: Handler for manual area changes
  const handleManualAreaChange = useCallback((newArea) => {
    setManualArea(newArea);
  }, []);

  // Handler functions untuk Lokasi & Wilayah (panel kanan)
  const handleLokasiChange = (e) => {
    // Provinsi dan Kabupaten hanya bisa dipilih dari peta
    console.log("Location change from panel:", e.target.name, e.target.value);
  };

  const handleLokasiInputChangeMethod = (newMethod) => {
    setLokasiInputMethod(newMethod);
  };

  const isKmzFile = (filename) => {
    if (!filename) return false;
    return filename.toLowerCase().endsWith(".kmz");
  };

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
      const coords = geometry.coordinates[0];
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([...first]);
        }
      }
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

  const handleLokasiKmlImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setLokasiKmlFileName(file.name);
      kmlFileRef.current = file;
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
            handleClearPolygon();
            processLokasiKmlImport();
          } else {
            event.target.value = null;
            setLokasiKmlFileName("");
            kmlFileRef.current = null;
          }
        });
      } else {
        processLokasiKmlImport();
      }
    } else {
      setLokasiKmlFileName("");
      kmlFileRef.current = null;
    }
  };

  const processLokasiKmlImport = async () => {
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
      const allPolygons = geojsonData.features
        .filter(f => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon")
        .map((feature, index) => ({
          name: feature.properties?.name || `Polygon ${index + 1}`,
          geometry: feature.geometry,
        }));
      if (allPolygons.length === 0) {
        throw new Error("Tidak ditemukan geometri poligon dalam file");
      }
      let selectedPolygon;
      if (allPolygons.length > 1) {
        toast.dismiss(toastId);
        const options = {};
        allPolygons.forEach((poly, idx) => {
          options[idx] = poly.name;
        });
        const { value: selectedIndex } = await Swal.fire({
          title: 'Pilih Polygon',
          html: `<p class="mb-2">File KML/KMZ mengandung <strong>${allPolygons.length} polygon</strong>.</p><p class="mb-3">Silakan pilih polygon yang ingin digunakan:</p>`,
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
        if (selectedIndex === undefined) {
          setLokasiKmlFileName("");
          kmlFileRef.current = null;
          return;
        }
        selectedPolygon = allPolygons[selectedIndex];
        const newToastId = toast.loading("Memproses polygon terpilih...");
        const processedGeometry = processGoogleEarthGeometry({
          geometry: selectedPolygon.geometry,
        });
        if (!processedGeometry) {
          throw new Error("Gagal memproses geometri dari file");
        }
        toast.success(`Polygon "${selectedPolygon.name}" berhasil diimpor!`, { id: newToastId });
        handleImportedGeometry(processedGeometry, 'kml');
      } else {
        selectedPolygon = allPolygons[0];
        toast.loading("Memvalidasi koordinat...", { id: toastId });
        const processedGeometry = processGoogleEarthGeometry({
          geometry: selectedPolygon.geometry,
        });
        if (!processedGeometry) {
          throw new Error("Gagal memproses geometri dari file");
        }
        toast.success(`Polygon "${selectedPolygon.name}" berhasil diimpor!`, { id: toastId });
        handleImportedGeometry(processedGeometry, 'kml');
      }
    } catch (error) {
      console.error("Error processing KML/KMZ:", error);
      toast.error(`Gagal memproses file: ${error.message}`, { id: toastId });
      setLokasiKmlFileName("");
      kmlFileRef.current = null;
    }
  };

  const handleLokasiProcessCoords = () => {
    if (!lokasiCoordsText.trim()) {
      setLokasiCoordsError("Masukkan koordinat terlebih dahulu.");
      return;
    }
    const lines = lokasiCoordsText.trim().split("\n");
    if (lines.length < 3) {
      setLokasiCoordsError("Minimal dibutuhkan 3 titik koordinat untuk membuat poligon.");
      return;
    }
    const coordinates = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(",");
      if (parts.length !== 2) {
        setLokasiCoordsError(`Format salah di baris ${i + 1}. Gunakan format: longitude,latitude`);
        return;
      }
      const lon = parseFloat(parts[0].trim());
      const lat = parseFloat(parts[1].trim());
      if (isNaN(lon) || isNaN(lat) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        setLokasiCoordsError(`Koordinat tidak valid di baris ${i + 1}.`);
        return;
      }
      coordinates.push([lon, lat]);
    }
    if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
      coordinates.push(coordinates[0]);
    }
    const geojsonPolygon = { type: "Polygon", coordinates: [coordinates] };
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
          handleClearPolygon();
          handleImportedGeometry(geojsonPolygon, 'coords');
        }
      });
    } else {
      handleImportedGeometry(geojsonPolygon, 'coords');
    }
  };

  // Sync selectedLocation ke lokasiFormData
  useEffect(() => {
    setLokasiFormData({
      provinsi: selectedLocation.provinsi || "",
      kabkota: selectedLocation.kabupaten || "",
    });
  }, [selectedLocation]);

  const handleSaveAsset = useCallback(
    async (assetData, buktiPemilikanFile, filesToDelete, assetPhotos = [], gambarTampakAtasFile = null) => {
      if (!drawnAsset) {
        toast.error("Silakan gambar lokasi di peta terlebih dahulu!");
        return;
      }
      if (!selectedLocation.provinsi || !selectedLocation.kabupaten) {
        toast.error(
          "Lokasi provinsi dan kabupaten/kota belum dipilih di peta."
        );
        return;
      }

      // Use manual area if set, otherwise use calculated area from polygon
      const finalArea = manualArea !== null ? manualArea : drawnAsset.area;

      const toastId = toast.loading("Menyimpan data aset yardip...");

      let buktiPemilikanUrl = assetData.bukti_pemilikan_url || "";
      let buktiPemilikanFilename = assetData.bukti_pemilikan_filename || "";
      let gambarTampakAtasUrl = "";
      let gambarTampakAtasFilename = "";
      let fotoAsetUrls = [];

      // Upload bukti pemilikan jika ada
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

      // Upload foto tampak atas jika ada
      if (gambarTampakAtasFile) {
        try {
          toast.loading("Mengupload foto tampak atas...", { id: toastId });
          const fileFormData = new FormData();
          fileFormData.append("foto_tampak_atas", gambarTampakAtasFile);

          const uploadRes = await axiosAuth.post(
            `${API_URL}/upload/foto-tampak-atas`,
            fileFormData
          );

          gambarTampakAtasUrl = uploadRes.data.url;
          gambarTampakAtasFilename = uploadRes.data.filename;
        } catch (err) {
          toast.error("Gagal mengupload foto tampak atas.", { id: toastId });
          console.error("File upload error:", err.response?.data || err.message);
          return;
        }
      }

      // Upload foto aset jika ada
      if (assetPhotos && assetPhotos.length > 0) {
        try {
          toast.loading("Mengupload foto aset...", { id: toastId });
          const uploadPromises = assetPhotos.map(async (photoFile) => {
            const fileFormData = new FormData();
            fileFormData.append("foto_aset", photoFile);
            const uploadRes = await axiosAuth.post(
              `${API_URL}/upload/foto-aset`,
              fileFormData
            );
            return uploadRes.data.files[0].url;
          });

          fotoAsetUrls = await Promise.all(uploadPromises);
        } catch (err) {
          toast.error("Gagal mengupload foto aset.", { id: toastId });
          console.error("File upload error:", err.response?.data || err.message);
          return;
        }
      }

      try {
        const payload = {
          ...assetData,
          id: `Y${Date.now()}`,
          lokasi: JSON.stringify(drawnAsset.geometry),
          area: finalArea,
          type: "yardip",
          provinsi: selectedLocation.provinsi,
          kabkota: selectedLocation.kabupaten,
          bukti_pemilikan_url: buktiPemilikanUrl,
          bukti_pemilikan_filename: buktiPemilikanFilename,
          gambar_tampak_atas_url: gambarTampakAtasUrl,
          gambar_tampak_atas_filename: gambarTampakAtasFilename,
          foto_aset: fotoAsetUrls,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await axiosAuth.post(`${API_URL}/yardip_assets`, payload);
        toast.success("Aset Yardip berhasil ditambahkan!", { id: toastId });

        // Invalidate query agar data terbaru muncul tanpa refresh manual
        queryClient.invalidateQueries(["yardip_assets"]);

        setTimeout(() => navigate("/data-aset-yardip"), 1500);
      } catch (err) {
        toast.error("Gagal menyimpan aset yardip.", { id: toastId });
        console.error("Error saving yardip asset:", err);
        setError(
          `Gagal menyimpan: ${err.response?.data?.message || err.message}`
        );
      }
    },
    [drawnAsset, selectedLocation, manualArea, navigate, queryClient]
  );

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const alertMessage = useMemo(() => {
    if (!selectedLocation.provinsi) {
      return "Pilih Provinsi di Peta atau melalui dropdown untuk memulai.";
    }
    if (!selectedLocation.kabupaten) {
      return `Provinsi ${selectedLocation.provinsi} dipilih. Selanjutnya, pilih Kabupaten/Kota di peta atau melalui dropdown.`;
    }
    if (!drawnAsset) {
      return `Kabupaten/Kota ${selectedLocation.kabupaten} dipilih. Gunakan tool di pojok kiri atas peta untuk menggambar area aset.`;
    }
    return `Area aset telah digambar di ${selectedLocation.kabupaten}. Silakan lengkapi form di sebelah kanan.`;
  }, [selectedLocation, drawnAsset]);

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="tambah-aset-yardip-page mt-4">
      {/* BARIS 1: PETA DI KIRI, LOKASI & WILAYAH DI KANAN */}
      <Row className="g-4">
        {/* PETA - 8 Kolom */}
        <Col lg={8} xs={12}>
          <div className="map-frame-modern" style={{ height: "60vh", width: "100%", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <MapErrorBoundary height="60vh">
              <PetaGambarYardip
                provinsiData={provinsiData}
                kabupatenData={kabupatenData}
                onLocationSelect={handleLocationSelect}
                onPolygonCreated={handleDrawingCreated}
                selectedProvinsi={selectedLocation.provinsi}
                selectedKabupaten={selectedLocation.kabupaten}
                importedGeometry={drawnAsset && drawnAsset.source === 'import' ? drawnAsset.geometry : null}
                geoJsonKey={0}
              />
            </MapErrorBoundary>
          </div>
        </Col>

        {/* LOKASI & WILAYAH - 4 Kolom */}
        <Col lg={4} xs={12}>
          <div className="lokasi-panel" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", padding: "1.5rem", height: "100%" }}>
            <LokasiYardipPanel
              provinsiList={provinsiData?.features?.map(f => ({ id: f.properties.PROVINCE, nama: f.properties.PROVINCE })) || []}
              kabupatenList={kabupatenData?.features
                .filter(f => 
                  !isConservationArea(f.properties.Kabupaten) &&
                  (!lokasiFormData.provinsi || f.properties.PROVINCE === lokasiFormData.provinsi)
                )
                .map(f => ({ id: f.properties.Kabupaten, nama: f.properties.Kabupaten })) || []}
              formData={lokasiFormData}
              handleChange={handleLokasiChange}
              inputMethod={lokasiInputMethod}
              handleInputChangeMethod={handleLokasiInputChangeMethod}
              handleKmlImport={handleLokasiKmlImport}
              kmlFileName={lokasiKmlFileName}
              coordsText={lokasiCoordsText}
              setCoordsText={setLokasiCoordsText}
              coordsError={lokasiCoordsError}
              handleProcessCoords={handleLokasiProcessCoords}
              onMapLocationSelect={handleMapLocationSelect}
            />
          </div>
        </Col>
      </Row>

      {/* BARIS 2: FORMULIR (tanpa Lokasi & Metode Input) */}
      <Row className="g-4 mt-2">
        <Col xs={12}>
          <div className="form-section" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", padding: "1.5rem" }}>
            <h5 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1a1a2e", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fas fa-file-alt" style={{ color: "#6c757d" }}></i>
              Formulir Aset Yardip
            </h5>
            <FormYardip
              onSave={handleSaveAsset}
              onCancel={handleCancel}
              isEnabled={true}
              selectedProvinceName={selectedLocation.provinsi}
              selectedKabupatenName={selectedLocation.kabupaten}
              initialArea={manualArea !== null ? manualArea : (drawnAsset ? drawnAsset.area : 0)}
              onKmlImport={handleImportedGeometry}
              onCoordsImport={handleImportedGeometry}
              onClearPolygon={handleClearPolygon}
              provinsiData={provinsiData}
              kabupatenData={kabupatenData}
              onLocationChange={handleLocationChangeFromForm}
              isPolygonCreated={!!drawnAsset}
              onMapLocationSelect={handleMapLocationSelect}
              onManualAreaChange={handleManualAreaChange}
              hideLocationFields={true}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetYardipPage;