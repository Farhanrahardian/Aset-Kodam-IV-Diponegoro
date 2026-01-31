import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  forwardRef, // Import forwardRef
  useImperativeHandle, // Import useImperativeHandle
} from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  DrawingManager,
  Autocomplete,
} from "@react-google-maps/api";
import * as turf from "@turf/turf";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { normalizeKodimName } from "../utils/kodimUtils";
import DrawingTools from "./DrawingTools";

const libraries = ["drawing", "places", "geometry"];

const stringToColor = (str) => {
  if (!str) return "#000000";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }
  return color;
};

const isConservationArea = (feature) => {
  const kabupatenName = feature?.properties?.Kabupaten;
  return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
};

const kodimStyle = {
  fillColor: "#fb923c",
  fillOpacity: 0.4,
  strokeColor: "#ea580c",
  strokeWeight: 3,
  strokeOpacity: 1,
};

const selectedStyle = {
  fillColor: "#3b82f6",
  fillOpacity: 0.5,
  strokeColor: "#1e40af",
  strokeWeight: 4,
  strokeOpacity: 1,
};

const geoJsonToGooglePaths = (coordinates, type) => {
  if (!coordinates || !coordinates.length) return [];
  const ringToPath = (ring) =>
    ring
      .filter(
        (coord) =>
          Array.isArray(coord) &&
          coord.length >= 2 &&
          !isNaN(coord[0]) &&
          !isNaN(coord[1])
      )
      .map((coord) => ({ lat: Number(coord[1]), lng: Number(coord[0]) }));

  return type === "MultiPolygon"
    ? coordinates.flatMap((polygon) => polygon.map(ringToPath))
    : coordinates.map(ringToPath);
};

const googlePathToGeoJson = (path) => {
  const coordinates = path.getArray().map((latLng) => [latLng.lng(), latLng.lat()]);
  if (
    coordinates.length > 0 &&
    (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1])
  ) {
    coordinates.push([...coordinates[0]]);
  }
  return [coordinates];
};

// Wrap PetaGambarAset with forwardRef to receive ref from parent
const PetaGambarAset = forwardRef(({
  onPolygonCreated,
  selectedKorem,
  selectedKodim,
  onLocationSelect,
  importedGeometry,
  koremBoundaries,
  kodimBoundaries,
  inputMode, // Mode input saat ini (draw, kml, coords)
}, ref) => { // Accept ref as a second argument
  const [map, setMap] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [koremPolygons, setKoremPolygons] = useState([]);
  const [kodimPolygons, setKodimPolygons] = useState([]);
  const [autocomplete, setAutocomplete] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Expose internal functions to parent component via ref
  useImperativeHandle(ref, () => ({
    clearInternalDrawing: () => {
      try {
        if (drawnPolygon) {
          drawnPolygon.setMap(null); // Remove from map
          setDrawnPolygon(null); // Clear internal state
        }
      } catch (error) {
        console.error("Error saat membersihkan polygon dari ref:", error);
      }
      try {
        onPolygonCreated(null); // Inform parent that drawing is cleared
      } catch (error) {
        console.error("Error saat memanggil onPolygonCreated dari ref:", error);
      }
    },
    // You can add other methods here if needed by the parent
  }));

  // State untuk riwayat perubahan polygon
  const [polygonHistory, setPolygonHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const drawingManagerRef = useRef(null);
  const mapCenter = useMemo(() => ({ lat: -7.5, lng: 110.0 }), []);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onLoadDrawingManager = useCallback((dm) => {
    drawingManagerRef.current = dm;
    setDrawingManager(dm);
  }, []);

  // Inject custom styles for the new layout
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .map-controls-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none; /* Allows clicks to pass through to the map */
      }
      .map-controls-wrapper > * {
        pointer-events: auto; /* Re-enable pointer events for controls */
      }
      .top-left-controls {
        position: absolute;
        top: 15px;
        left: 15px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .top-center-controls {
        position: absolute;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
      }
      .top-right-controls {
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .left-bottom-controls {
        position: absolute;
        bottom: 15px;
        left: 15px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .zoom-controls {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .bottom-center-controls {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
      }
      .control-button {
        background-color: white;
        border: 1px solid #d1d5db; /* gray-300 */
        border-radius: 8px;
        padding: 10px 15px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 40px;
      }
      .control-button:hover {
        background-color: #f9fafb; /* gray-50 */
        border-color: #9ca3af; /* gray-400 */
      }
      .icon-button {
        background-color: white;
        border: 1px solid #d1d5db; /* gray-300 */
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-width: 40px;
        min-height: 40px;
        width: 40px;
      }
      .icon-button:hover {
        background-color: #f9fafb; /* gray-50 */
        border-color: #9ca3af; /* gray-400 */
      }
      .search-input {
        width: 350px;
        max-width: 100%;
        padding: 10px 15px;
        border-radius: 8px;
        border: 1px solid #d1d5db; /* gray-300 */
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        font-size: 14px;
        box-sizing: border-box;
      }

      @media (max-width: 768px) {
        .search-input {
          width: 250px;
        }
      }

      @media (max-width: 576px) {
        .search-input {
          width: 200px;
        }
      }

      .map-type-controls select {
        background-color: white;
        border: 1px solid #d1d5db; /* gray-300 */
        border-radius: 8px;
        padding: 10px 15px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s;
        min-width: 100px;
        min-height: 40px;
        color: #374151;
        width: auto;
        max-width: 100%;
        box-sizing: border-box;
      }

      @media (max-width: 768px) {
        .map-type-controls select {
          min-width: 80px;
          padding: 8px 12px;
          font-size: 13px;
        }
      }

      @media (max-width: 576px) {
        .map-type-controls select {
          min-width: 70px;
          padding: 6px 10px;
          font-size: 12px;
        }
      }

      .map-type-controls select:hover {
        background-color: #f9fafb; /* gray-50 */
        border-color: #9ca3af; /* gray-400 */
      }
      .delete-button {
        background-color: #dc3545; /* red-600 */
        color: white;
        border-color: #dc3545; /* red-600 */
      }
      .delete-button:hover {
        background-color: #c82333; /* darker red */
        border-color: #bd2130; /* darker red */
      }
      .icon-button.delete-button {
        background-color: #dc3545; /* red-600 */
        color: white;
        border-color: #dc3545; /* red-600 */
      }
      .icon-button.delete-button:hover {
        background-color: #c82333; /* darker red */
        border-color: #bd2130; /* darker red */
      }


      .gm-style .gm-fullscreen-control,
      .gm-style .gm-zoom-control {
        border-radius: 8px !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid #d1d5db !important;
      }

      .gm-style .gm-fullscreen-control div,
      .gm-style .gm-zoom-control button {
        min-width: 40px !important;
        min-height: 40px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .gm-style .gm-fullscreen-control div:hover,
      .gm-style .gm-zoom-control button:hover {
        background-color: #f9fafb !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Fit bounds to selected area or imported geometry
  useEffect(() => {
    if (!map || !koremBoundaries) return;
    const timer = setTimeout(() => {
      if (drawnPolygon && !importedGeometry) return;
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidBounds = false;

      const extendBoundsWithCoords = (coords) => {
        if (!Array.isArray(coords)) return;
        if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          if (!isNaN(coords[0]) && !isNaN(coords[1])) {
            bounds.extend({ lat: coords[1], lng: coords[0] });
            hasValidBounds = true;
          }
          return;
        }
        coords.forEach(item => extendBoundsWithCoords(item));
      };

      if (importedGeometry?.coordinates) {
        extendBoundsWithCoords(importedGeometry.coordinates);
        if (hasValidBounds) map.fitBounds(bounds, { padding: 50 });
        return;
      }

      if (selectedKodim && kodimBoundaries) {
        const kodimFeature = kodimBoundaries.features.find((f) => {
          const featureName = normalizeKodimName(f.properties.listkodim_Kodim);
          const searchName = selectedKodim.nama;
          if (searchName === "Kodim 0733/Kota Semarang") {
            return f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)";
          }
          return featureName === searchName;
        });

        if (kodimFeature?.geometry?.coordinates) {
          extendBoundsWithCoords(kodimFeature.geometry.coordinates);
          if (hasValidBounds) map.fitBounds(bounds);
          return;
        }
      }

      if (selectedKorem && koremBoundaries) {
        const koremNameToSearch = selectedKorem.nama === "Kodim 0733/Kota Semarang" ? "Berdiri Sendiri" : selectedKorem.nama;
        const koremFeatures = koremBoundaries.features.filter(f => f.properties.listkodim_Korem === koremNameToSearch);
        if (koremFeatures.length > 0) {
          koremFeatures.forEach(feature => extendBoundsWithCoords(feature?.geometry?.coordinates));
          if (hasValidBounds) map.fitBounds(bounds);
          return;
        }
      }

      if (koremBoundaries.features.length > 0) {
        koremBoundaries.features.forEach(feature => {
          if (!isConservationArea(feature)) extendBoundsWithCoords(feature?.geometry?.coordinates);
        });
        if (hasValidBounds) map.fitBounds(bounds);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [map, selectedKorem, selectedKodim, importedGeometry, koremBoundaries, kodimBoundaries, drawnPolygon]);

  // Render Korem boundaries
  useEffect(() => {
    if (!map || !koremBoundaries || selectedKorem) {
      setKoremPolygons([]);
      return;
    }
    const polygons = koremBoundaries.features
      .filter(f => !isConservationArea(f))
      .map((feature, index) => ({
        id: `korem-${index}`,
        paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
        options: {
          fillColor: stringToColor(feature.properties.listkodim_Korem),
          fillOpacity: 0.35,
          strokeColor: "#000000",
          strokeWeight: 3,
          strokeOpacity: 1,
        },
        feature,
      }));
    setKoremPolygons(polygons);
  }, [map, koremBoundaries, selectedKorem]);

  // Render Kodim boundaries
  useEffect(() => {
    if (!map || !kodimBoundaries || !selectedKorem) {
      setKodimPolygons([]);
      return;
    }
    const filteredFeatures = kodimBoundaries.features.filter(feature => {
      if (isConservationArea(feature)) return false;
      const featureKoremName = feature.properties.listkodim_Korem;
      const isKoremMatch = selectedKorem.nama === "Kodim 0733/Kota Semarang"
        ? featureKoremName === "Berdiri Sendiri"
        : featureKoremName === selectedKorem.nama;
      if (!isKoremMatch) return false;
      if (selectedKodim?.nama) {
        const searchName = selectedKodim.nama.trim().toLowerCase();
        const featureKodimName = normalizeKodimName(feature.properties.listkodim_Kodim).trim().toLowerCase();

        const isMatch = searchName === "kodim 0733/kota semarang"
          ? featureKodimName.includes("semarang")
          : featureKodimName === searchName;

        if (!isMatch) {
          // console.log(`Mismatch: '${featureKodimName}' !== '${searchName}'`); // Optional debug
          return false;
        }
        return true;
      }
      return true;
    });

    const polygons = filteredFeatures.map((feature, index) => ({
      id: `kodim-${index}`,
      paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
      options: selectedKodim && normalizeKodimName(feature.properties.listkodim_Kodim) === selectedKodim.nama ? selectedStyle : kodimStyle,
      feature,
      isSelected: selectedKodim && normalizeKodimName(feature.properties.listkodim_Kodim) === selectedKodim.nama,
    }));

    console.log("Filtered Kodim Features:", filteredFeatures.map(f => f.properties.listkodim_Kodim));
    console.log("Generated Polygons:", polygons.length);

    setKodimPolygons(polygons);
  }, [map, kodimBoundaries, selectedKorem, selectedKodim]);

  // Fungsi untuk menyimpan riwayat perubahan polygon
  const savePolygonToHistory = useCallback((polygon, action = 'update') => {
    if (!polygon && action !== 'delete') {
      // Jika tidak ada polygon dan bukan aksi delete, simpan entri kosong
      setPolygonHistory(prevHistory => {
        const maxHistory = 20;
        const newHistoryEntry = {
          coordinates: null,
          action: 'delete',
          timestamp: Date.now(),
        };
        const newHistory = [...prevHistory.slice(-(maxHistory - 1)), newHistoryEntry];
        return newHistory;
      });

      setHistoryIndex(prevIndex => prevIndex + 1);
      return;
    }

    if (polygon) {
      const path = polygon.getPath();
      const coordinates = googlePathToGeoJson(path);
      const newHistoryEntry = {
        coordinates: JSON.parse(JSON.stringify(coordinates)), // Buat salinan
        action: action,
        timestamp: Date.now(),
      };

      // Batasi jumlah entri dalam riwayat (misalnya maksimal 20)
      setPolygonHistory(prevHistory => {
        const maxHistory = 20;
        const newHistory = [...prevHistory.slice(-(maxHistory - 1)), newHistoryEntry];
        return newHistory;
      });

      setHistoryIndex(prevIndex => prevIndex + 1);
    }
  }, []);

  const handlePolygonUpdate = useCallback((polygon, skipValidation = false) => {
    try {
      const path = polygon.getPath();
      const coordinates = googlePathToGeoJson(path);
      const polyFeature = turf.polygon(coordinates);

      // Lewati validasi jika ini panggilan dari undo/redo
      if (!skipValidation) {
        // Validasi apakah polygon berada dalam area Kodim yang dipilih
        if (selectedKodim && kodimBoundaries) {
          // Cari fitur GeoJSON yang sesuai dengan Kodim yang dipilih
          const kodimFeature = kodimBoundaries.features.find((f) => {
            const featureName = normalizeKodimName(f.properties.listkodim_Kodim);
            const searchName = selectedKodim.nama;
            if (searchName === "Kodim 0733/Kota Semarang") {
              return f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)";
            }
            return featureName === searchName;
          });

          if (kodimFeature) {
            // Periksa apakah polygon berada dalam batas Kodim yang dipilih
            const kodimPolyFeature = turf.feature(kodimFeature.geometry);

            // Gunakan turf.booleanWithin untuk memeriksa apakah polygon berada dalam batas Kodim
            if (!turf.booleanWithin(polyFeature, kodimPolyFeature)) {
              toast.error("Aset harus digambar dalam area Kodim yang dipilih.");
              return;
            }
          }
        }

        if (koremBoundaries) {
          const conservationFeatures = koremBoundaries.features.filter(isConservationArea);
          for (const c of conservationFeatures) {
            if (turf.intersect(turf.featureCollection([polyFeature, c]))) {
              toast.error("Aset tidak boleh tumpang tindih dengan area konservasi!");
              return;
            }
          }
        }
      }

      // Simpan ke riwayat sebelum memperbarui (hanya jika bukan dari undo/redo)
      if (!skipValidation) {
        savePolygonToHistory(polygon);
      }

      onPolygonCreated({ geometry: polyFeature.geometry, area: turf.area(polyFeature) });
    } catch (error) {
      console.error("Error saat memperbarui polygon:", error);
      toast.error("Terjadi kesalahan saat memperbarui polygon.");
    }
  }, [kodimBoundaries, selectedKodim, onPolygonCreated, normalizeKodimName, savePolygonToHistory]);

  // Fungsi undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || polygonHistory.length === 0) {
      toast.info("Tidak ada riwayat untuk di-undo.");
      return;
    }

    const previousIndex = historyIndex - 1;
    const previousState = polygonHistory[previousIndex];

    if (previousState) {
      if (previousState.action === 'delete' || previousState.coordinates === null) {
        // Jika sebelumnya polygon dihapus, sekarang kita kembalikan polygon
        if (drawnPolygon) {
          drawnPolygon.setMap(null); // Hapus polygon saat ini
          setDrawnPolygon(null);
        }
        setHistoryIndex(previousIndex);
        onPolygonCreated(null); // Kirim null untuk menghapus polygon
        toast.success("Polygon dihapus (undo).");
      } else if (drawnPolygon && previousState.coordinates) {
        // Update path polygon dengan koordinat sebelumnya
        const newPath = new window.google.maps.MVCArray();
        previousState.coordinates[0].forEach(coord => {
          newPath.push({ lat: coord[1], lng: coord[0] });
        });

        drawnPolygon.setPath(newPath);
        setHistoryIndex(previousIndex);

        // Panggil handlePolygonUpdate untuk memperbarui tampilan tanpa validasi
        setTimeout(() => {
          if (typeof handlePolygonUpdate === 'function') {
            handlePolygonUpdate(drawnPolygon, true); // Lewati validasi
          }
        }, 0);
      }
    }
  }, [historyIndex, polygonHistory, drawnPolygon, handlePolygonUpdate, onPolygonCreated]);

  // Fungsi redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= polygonHistory.length - 1) {
      toast.info("Tidak ada riwayat untuk di-redo.");
      return;
    }

    const nextIndex = historyIndex + 1;
    const nextState = polygonHistory[nextIndex];

    if (nextState) {
      if (nextState.action === 'delete' || nextState.coordinates === null) {
        // Jika langkah berikutnya adalah menghapus polygon
        if (drawnPolygon) {
          drawnPolygon.setMap(null);
          setDrawnPolygon(null);
        }
        setHistoryIndex(nextIndex);
        onPolygonCreated(null); // Kirim null untuk menghapus polygon
        toast.success("Polygon dihapus (redo).");
      } else if (drawnPolygon && nextState.coordinates) {
        // Update path polygon dengan koordinat berikutnya
        const newPath = new window.google.maps.MVCArray();
        nextState.coordinates[0].forEach(coord => {
          newPath.push({ lat: coord[1], lng: coord[0] });
        });

        drawnPolygon.setPath(newPath);
        setHistoryIndex(nextIndex);

        // Panggil handlePolygonUpdate untuk memperbarui tampilan tanpa validasi
        setTimeout(() => {
          if (typeof handlePolygonUpdate === 'function') {
            handlePolygonUpdate(drawnPolygon, true); // Lewati validasi
          }
        }, 0);
      }
    }
  }, [historyIndex, polygonHistory, drawnPolygon, handlePolygonUpdate, onPolygonCreated]);

  const handlePolygonComplete = useCallback((polygon) => {
    try {
      setIsDrawing(false);
      const path = polygon.getPath();
      const coordinates = googlePathToGeoJson(path);
      const polyFeature = turf.polygon(coordinates);

      // Validasi apakah polygon berada dalam area Kodim yang dipilih
      if (selectedKodim && kodimBoundaries) {
        // Cari fitur GeoJSON yang sesuai dengan Kodim yang dipilih
        const kodimFeature = kodimBoundaries.features.find((f) => {
          const featureName = normalizeKodimName(f.properties.listkodim_Kodim);
          const searchName = selectedKodim.nama;
          if (searchName === "Kodim 0733/Kota Semarang") {
            return f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)";
          }
          return featureName === searchName;
        });

        if (kodimFeature) {
          // Periksa apakah polygon berada dalam batas Kodim yang dipilih
          const kodimPolyFeature = turf.feature(kodimFeature.geometry);

          // Gunakan turf.booleanWithin untuk memeriksa apakah polygon berada dalam batas Kodim
          if (!turf.booleanWithin(polyFeature, kodimPolyFeature)) {
            toast.error("Aset harus digambar dalam area Kodim yang dipilih.");
            polygon.setMap(null);
            return;
          }
        }
      }

      if (koremBoundaries) {
        const conservationFeatures = koremBoundaries.features.filter(isConservationArea);
        for (const c of conservationFeatures) {
          if (turf.intersect(turf.featureCollection([polyFeature, c]))) {
            toast.error("Aset tumpang tindih dengan area konservasi.");
            polygon.setMap(null);
            return;
          }
        }
      }

      if (drawnPolygon) drawnPolygon.setMap(null);
      setDrawnPolygon(polygon);
      onPolygonCreated({ geometry: polyFeature.geometry, area: turf.area(polyFeature) });

      // Simpan polygon ke riwayat setelah selesai digambar
      savePolygonToHistory(polygon, 'create'); // Tandai sebagai aksi pembuatan

      polygon.setEditable(true);
      polygon.setDraggable(true);
      ['set_at', 'insert_at', 'remove_at'].forEach(evt => path.addListener(evt, () => handlePolygonUpdate(polygon, false)));
      polygon.addListener('dragend', () => handlePolygonUpdate(polygon, false));
    } catch (error) {
      console.error("Error saat menyelesaikan polygon:", error);
      toast.error("Terjadi kesalahan saat menyelesaikan polygon.");
      // Membersihkan polygon jika terjadi error
      try {
        if (polygon) {
          polygon.setMap(null);
        }
      } catch (cleanupError) {
        console.error("Error saat membersihkan polygon setelah error:", cleanupError);
      }
    }
  }, [drawnPolygon, koremBoundaries, kodimBoundaries, selectedKodim, onPolygonCreated, handlePolygonUpdate, normalizeKodimName, savePolygonToHistory]);

  const handleKoremClick = useCallback((feature) => onLocationSelect?.("KOREM", feature.properties.listkodim_Korem, null), [onLocationSelect]);
  const handleKodimClick = useCallback((feature) => onLocationSelect?.("KODIM", feature.properties.listkodim_Korem, normalizeKodimName(feature.properties.listkodim_Kodim)), [onLocationSelect]);

  const handleToggleDrawing = () => {
    if (!selectedKodim) {
      toast.error("Pilih wilayah KODIM sebelum menggambar.");
      return;
    }
    setIsDrawing(prev => !prev);
  };

  const handleDeleteClick = () => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          if (drawnPolygon) {
            // Simpan ke riwayat sebelum menghapus
            savePolygonToHistory(null, 'delete');

            drawnPolygon.setMap(null);
            setDrawnPolygon(null);
            onPolygonCreated(null);
            setIsDrawing(false);
          }
        } catch (error) {
          console.error("Error saat menghapus polygon:", error);
          toast.error("Terjadi kesalahan saat menghapus polygon.");
        }
      }
    });
  };

  const handleBackClick = () => {
    // Jika ada polygon yang digambar, tampilkan konfirmasi sebelum kembali
    if (drawnPolygon) {
      Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Anda akan kembali ke level sebelumnya dan area aset yang telah digambar akan hilang!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Ya, kembali!",
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          try {
            if (drawnPolygon && map) {
              // Hapus polygon dari peta jika masih ada referensinya
              drawnPolygon.setMap(null);
              setDrawnPolygon(null);
              // Kirim null ke parent untuk memberi tahu bahwa polygon telah dihapus
              onPolygonCreated(null);
            }
          } catch (error) {
            console.error("Error saat membersihkan polygon:", error);
            // Jika terjadi error saat membersihkan polygon, tetap lanjutkan ke navigasi
          }

          try {
            onLocationSelect?.(selectedKodim ? "KOREM" : "KOREM", selectedKodim ? (selectedKorem.nama === "Kodim 0733/Kota Semarang" ? "Berdiri Sendiri" : selectedKorem.nama) : null, null);
          } catch (error) {
            console.error("Error saat memanggil onLocationSelect:", error);
          }
        }
      });
    } else {
      // Jika tidak ada polygon yang digambar, langsung kembali tanpa konfirmasi
      try {
        onLocationSelect?.(selectedKodim ? "KOREM" : "KOREM", selectedKodim ? (selectedKorem.nama === "Kodim 0733/Kota Semarang" ? "Berdiri Sendiri" : selectedKorem.nama) : null, null);
      } catch (error) {
        console.error("Error saat memanggil onLocationSelect:", error);
      }
    }
  };

  const onPlaceChanged = () => {
    const place = autocomplete?.getPlace();
    if (place?.geometry?.location) {
      map.panTo(place.geometry.location);
      map.setZoom(15);
    }
  };

  useEffect(() => {
    if (drawingManager) drawingManager.setDrawingMode(isDrawing ? window.google.maps.drawing.OverlayType.POLYGON : null);
  }, [isDrawing, drawingManager]);

  // Cleanup function untuk membersihkan referensi polygon saat komponen dilepas
  useEffect(() => {
    return () => {
      if (drawnPolygon && map) {
        try {
          drawnPolygon.setMap(null);
        } catch (error) {
          console.error("Error saat membersihkan polygon di cleanup:", error);
        }
      }
    };
  }, [drawnPolygon, map]);

  if (loadError) return <div className="alert alert-danger">Error loading Google Maps.</div>;
  if (!isLoaded) return <div className="spinner-border text-primary" />;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <GoogleMap
        center={mapCenter}
        zoom={8}
        mapContainerStyle={{ height: "100%", width: "100%" }}
        options={{
          streetViewControl: false,
          fullscreenControl: false, // Nonaktifkan kontrol fullscreen
          mapTypeControl: false, // Nonaktifkan kontrol bawaan
          zoomControl: false, // Nonaktifkan kontrol zoom default
          panControl: false,
          scaleControl: false,
          rotateControl: false,
          clickableIcons: false, // Nonaktifkan ikon yang bisa diklik
          drawingControl: false,
          keyboardShortcuts: false, // Nonaktifkan shortcut keyboard
          scrollwheel: true, // Biarkan scroll wheel aktif
          disableDoubleClickZoom: false, // Biarkan double click zoom aktif
          gestureHandling: 'greedy', // Ubah cara penanganan gestur
          disableDefaultUI: true, // Nonaktifkan semua UI default
        }}
        onLoad={setMap}
      >
        <div className="map-controls-wrapper">
          <div className="top-left-controls">
            {selectedKorem && inputMode === 'draw' && (
              <button onClick={handleBackClick} className="control-button">
                ← Kembali
              </button>
            )}
            {selectedKodim && !importedGeometry && (
              <>
                {!drawnPolygon && (
                  <DrawingTools
                    isDrawing={isDrawing}
                    onToggleDrawing={handleToggleDrawing}
                  />
                )}
                {drawnPolygon && (
                  <div className="drawing-tools-container">
                    <button
                      onClick={handleDeleteClick}
                      className="icon-button delete-button"
                      title="Hapus Polygon"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="top-center-controls">
            {!importedGeometry && !drawnPolygon && !isDrawing && (
              <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
                <input type="text" placeholder="Cari lokasi..." className="search-input" />
              </Autocomplete>
            )}
          </div>

          <div className="top-right-controls">
            {/* Kontrol tipe peta buatan sendiri */}
            <div className="map-type-controls">
              <select
                className="control-button"
                onChange={(e) => {
                  if (map) {
                    map.setMapTypeId(e.target.value);
                  }
                }}
                defaultValue="roadmap"
              >
                <option value="roadmap">Peta</option>
                <option value="satellite">Satelit</option>
                <option value="hybrid">Hybrid</option>
                <option value="terrain">Terrain</option>
              </select>
            </div>
          </div>

          <div className="left-bottom-controls">
            <div className="zoom-controls">
              <button
                className="control-button"
                onClick={() => map && map.setZoom(map.getZoom() + 1)}
                title="Zoom In"
              >
                +
              </button>
              <button
                className="control-button"
                onClick={() => map && map.setZoom(map.getZoom() - 1)}
                title="Zoom Out"
              >
                -
              </button>
            </div>
          </div>
        </div>

        {importedGeometry?.coordinates && (
          <Polygon
            paths={geoJsonToGooglePaths(importedGeometry.coordinates)}
            options={{ fillColor: "#00FFFF", fillOpacity: 0.4, strokeColor: "#00FFFF", strokeWeight: 4 }}
          />
        )}

        {!importedGeometry && !selectedKorem && koremPolygons.map(p => (
          <Polygon key={p.id} paths={p.paths} options={p.options} onClick={() => handleKoremClick(p.feature)} />
        ))}

        {!importedGeometry && selectedKorem && kodimPolygons.map(p => (
          <Polygon key={p.id} paths={p.paths} options={p.options} onClick={() => !p.isSelected && handleKodimClick(p.feature)} />
        ))}

        {selectedKodim && !importedGeometry && (
          <DrawingManager
            onLoad={onLoadDrawingManager}
            onPolygonComplete={handlePolygonComplete}
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor: "#ff0000",
                fillOpacity: 0.5,
                strokeWeight: 2,
                strokeColor: "#ff0000",
                editable: true,
                draggable: true
              }
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
});

export default PetaGambarAset;