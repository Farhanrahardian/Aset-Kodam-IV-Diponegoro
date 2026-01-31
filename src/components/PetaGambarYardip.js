// PetaGambarYardip.js - Google Maps version (similar to PetaGambarAset.js but for Yardip assets)
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager, Autocomplete } from "@react-google-maps/api";
import * as turf from "@turf/turf";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import DrawingTools from "./DrawingTools";

const libraries = ["drawing", "places", "geometry"];

// Helper: Convert GeoJSON to Google Maps paths
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

// Helper: Convert Google Maps Path to GeoJSON
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

const PetaGambarYardip = ({
  onPolygonCreated,
  selectedProvinsi,
  selectedKabupaten,
  onLocationSelect,
  provinsiData,
  kabupatenData,
  importedGeometry,
  geoJsonKey,
}) => {
  const [map, setMap] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [drawnPolygon, setDrawnPolygon] = useState(null);

  useEffect(() => {
    console.log("drawnPolygon state changed to:", drawnPolygon);
  }, [drawnPolygon]);
  const [provinsiPolygons, setProvinsiPolygons] = useState([]);
  const [kabupatenPolygons, setKabupatenPolygons] = useState([]);
  const [autocomplete, setAutocomplete] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
@media (max-width: 480px) {
  .search-input {
    width: 150px;
    transform: translateX(-10px);
  }
}

@media (max-width: 400px) {
  .search-input {
    width: 120px;
    padding: 8px 10px;
    font-size: 12px;
    transform: translateX(-12px);
  }
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
      .drawing-tools-container {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        z-index: 9999;
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
      .icon-button.delete-button {
        background-color: #dc3545; /* red-600 */
        color: white;
        border-color: #dc3545; /* red-600 */
      }
      .icon-button.delete-button:hover {
        background-color: #c82333; /* darker red */
        border-color: #bd2130; /* darker red */
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Fit bounds to selected area or imported geometry
  useEffect(() => {
    if (!map || !provinsiData) return;
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

      if (selectedKabupaten && kabupatenData) {
        const kabupatenFeature = kabupatenData.features.find((f) =>
          f.properties.Kabupaten === selectedKabupaten
        );

        if (kabupatenFeature?.geometry?.coordinates) {
          extendBoundsWithCoords(kabupatenFeature.geometry.coordinates);
          if (hasValidBounds) map.fitBounds(bounds);
          return;
        }
      }

      if (selectedProvinsi && provinsiData) {
        const provinsiFeature = provinsiData.features.find((f) =>
          f.properties.PROVINCE === selectedProvinsi
        );

        if (provinsiFeature?.geometry?.coordinates) {
          extendBoundsWithCoords(provinsiFeature.geometry.coordinates);
          if (hasValidBounds) map.fitBounds(bounds);
          return;
        }
      }

      if (provinsiData.features.length > 0) {
        provinsiData.features.forEach(feature => {
          extendBoundsWithCoords(feature?.geometry?.coordinates);
        });
        if (hasValidBounds) map.fitBounds(bounds);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [map, selectedProvinsi, selectedKabupaten, importedGeometry, provinsiData, kabupatenData, drawnPolygon]);

  // Helper function to convert string to color
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

  // Check if area is conservation area
  const isConservationArea = (feature) => {
    const kabupatenName = feature?.properties?.Kabupaten;
    return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
  };

  // Define styles
  const provinsiStyle = {
    fillColor: "#3b82f6",
    fillOpacity: 0.35,
    strokeColor: "#000000",
    strokeWeight: 3,
    strokeOpacity: 1,
  };

  const kabupatenStyle = {
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

  // Render Provinsi boundaries
  useEffect(() => {
    if (!map || !provinsiData || selectedProvinsi) {
      setProvinsiPolygons([]);
      return;
    }
    const polygons = provinsiData.features
      .filter(f => !isConservationArea(f))
      .map((feature, index) => ({
        id: `provinsi-${index}`,
        paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
        options: {
          fillColor: stringToColor(feature.properties.PROVINCE),
          fillOpacity: 0.35,
          strokeColor: "#000000",
          strokeWeight: 3,
          strokeOpacity: 1,
        },
        feature,
      }));
    setProvinsiPolygons(polygons);
  }, [map, provinsiData, selectedProvinsi]);

  // Render Kabupaten boundaries
  useEffect(() => {
    console.log("Rendering Kabupaten boundaries");
    console.log("selectedProvinsi:", selectedProvinsi);
    console.log("selectedKabupaten:", selectedKabupaten);
    console.log("drawnPolygon:", drawnPolygon);

    if (!map || !kabupatenData || !selectedProvinsi) {
      console.log("Clearing kabupaten polygons");
      setKabupatenPolygons([]);
      return;
    }
    const filteredFeatures = kabupatenData.features.filter(feature => {
      if (isConservationArea(feature)) return false;
      const featureProvinsiName = feature.properties.PROVINCE;
      const isProvinsiMatch = selectedProvinsi === featureProvinsiName;
      if (!isProvinsiMatch) return false;
      if (selectedKabupaten) {
        return feature.properties.Kabupaten === selectedKabupaten;
      }
      return true;
    });
    console.log("Filtered features count:", filteredFeatures.length);
    const polygons = filteredFeatures.map((feature, index) => ({
      id: `kabupaten-${index}`,
      paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
      options: selectedKabupaten && feature.properties.Kabupaten === selectedKabupaten ? selectedStyle : kabupatenStyle,
      feature,
      isSelected: selectedKabupaten && feature.properties.Kabupaten === selectedKabupaten,
    }));
    setKabupatenPolygons(polygons);
    console.log("Kabupaten polygons set:", polygons.length);
  }, [map, kabupatenData, selectedProvinsi, selectedKabupaten]);

  const handlePolygonUpdate = useCallback((polygon) => {
    const path = polygon.getPath();
    const coordinates = googlePathToGeoJson(path);
    const polyFeature = turf.polygon(coordinates);

    // Check if polygon overlaps with conservation areas
    if (provinsiData) {
      const conservationFeatures = provinsiData.features.filter(isConservationArea);
      for (const c of conservationFeatures) {
        if (turf.intersect(turf.featureCollection([polyFeature, c]))) {
          toast.error("Aset tidak boleh tumpang tindih dengan area konservasi!");
          return;
        }
      }
    }

    onPolygonCreated({ geometry: polyFeature.geometry, area: turf.area(polyFeature) });
  }, [provinsiData, onPolygonCreated]);

  const handlePolygonComplete = useCallback((polygon) => {
    setIsDrawing(false);
    const path = polygon.getPath();
    const coordinates = googlePathToGeoJson(path);

    // Validasi jumlah titik sebelum membuat poligon
    if (!coordinates || coordinates.length === 0 || coordinates[0].length < 4) {
      toast.error("Poligon tidak valid: harus memiliki minimal 4 titik (3 titik unik ditambah 1 titik penutup).");
      polygon.setMap(null);
      return;
    }

    // Ambil hanya cincin pertama (eksterior) dari poligon
    const exteriorRing = coordinates[0];

    // Pastikan cincin memiliki minimal 4 titik (3 titik unik + 1 titik penutup)
    if (exteriorRing.length < 4) {
      toast.error("Poligon tidak valid: harus memiliki minimal 4 titik (3 titik unik ditambah 1 titik penutup).");
      polygon.setMap(null);
      return;
    }

    let polyFeature;
    try {
      polyFeature = turf.polygon(coordinates);
    } catch (error) {
      console.error("Error creating polygon:", error);
      toast.error("Gagal membuat poligon: bentuk tidak valid.");
      polygon.setMap(null);
      return;
    }

    // Check if polygon overlaps with conservation areas
    if (provinsiData) {
      const conservationFeatures = provinsiData.features.filter(isConservationArea);
      for (const c of conservationFeatures) {
        try {
          if (turf.intersect(turf.featureCollection([polyFeature, c]))) {
            toast.error("Aset tumpang tindih dengan area konservasi.");
            polygon.setMap(null);
            return;
          }
        } catch (error) {
          console.error("Error checking conservation overlap:", error);
          // Continue anyway if intersection check fails
        }
      }
    }

    if (drawnPolygon) drawnPolygon.setMap(null);
    setDrawnPolygon(polygon);
    onPolygonCreated({ geometry: polyFeature.geometry, area: turf.area(polyFeature) });

    polygon.setEditable(true);
    polygon.setDraggable(true);
    ['set_at', 'insert_at', 'remove_at'].forEach(evt => path.addListener(evt, () => handlePolygonUpdate(polygon)));
    polygon.addListener('dragend', () => handlePolygonUpdate(polygon));
  }, [drawnPolygon, onPolygonCreated, handlePolygonUpdate, provinsiData]);

  const handleProvinsiClick = useCallback((feature) => {
    if (isConservationArea(feature)) {
      toast.error("Area konservasi tidak dapat dipilih.");
      return;
    }
    // Hapus polygon saat memilih provinsi baru
    if (drawnPolygon) {
      drawnPolygon.setMap(null);
      setDrawnPolygon(null);
      onPolygonCreated(null);
    }
    setIsDrawing(false);
    onLocationSelect?.("provinsi", feature.properties.PROVINCE);
  }, [onLocationSelect, drawnPolygon]);

  const handleKabupatenClick = useCallback((feature) => {
    if (isConservationArea(feature)) {
      toast.error("Area konservasi tidak dapat dipilih.");
      return;
    }
    // Hapus polygon saat memilih kabupaten baru
    if (drawnPolygon) {
      drawnPolygon.setMap(null);
      setDrawnPolygon(null);
      onPolygonCreated(null);
    }
    setIsDrawing(false);
    onLocationSelect?.("kabupaten", feature.properties.Kabupaten);
  }, [onLocationSelect, drawnPolygon]);

  const handleToggleDrawing = () => {
    if (!selectedKabupaten) {
      toast.error("Pilih wilayah Kabupaten/Kota sebelum menggambar.");
      return;
    }
    if (drawnPolygon) {
      toast.error("Hapus polygon yang sudah ada terlebih dahulu.");
      return;
    }
    setIsDrawing(prev => !prev);
  };

  const handleDeleteClick = () => {
    console.log("handleDeleteClick called");
    console.log("Current drawnPolygon state:", drawnPolygon);
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
        if (drawnPolygon) {
          console.log("Removing polygon from map and resetting state");
          drawnPolygon.setMap(null);
          setDrawnPolygon(null);
          onPolygonCreated(null);
          setIsDrawing(false);
          console.log("Polygon deleted successfully");
        }
      }
    });
  };

  const onPlaceChanged = () => {
    const place = autocomplete?.getPlace();
    if (place?.geometry?.location) {
      map.panTo(place.geometry.location);
      map.setZoom(15);
    }
  };

  useEffect(() => {
    // Jangan aktifkan drawing mode jika sudah ada polygon yang dibuat atau jika tidak sedang menggambar
    if (drawingManager) {
      if (drawnPolygon || !isDrawing) {
        drawingManager.setDrawingMode(null); // Matikan drawing mode
      } else {
        drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON); // Aktifkan drawing mode
      }
    }
  }, [isDrawing, drawingManager, drawnPolygon]);

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
          gestureHandling: 'greedy', // Ubah cara penanganan gestur
          disableDefaultUI: true, // Nonaktifkan semua UI default
        }}
        onLoad={setMap}
      >
        <div className="map-controls-wrapper">
          <div className="top-left-controls">
            {(selectedKabupaten || selectedProvinsi) && (
              <button
                onClick={() => {
                  // Tentukan level saat ini dan level tujuan
                  const isAtKabupatenLevel = selectedKabupaten;

                  // Jika ada polygon yang digambar, tampilkan konfirmasi sebelum kembali
                  if (drawnPolygon) {
                    Swal.fire({
                      title: "Apakah Anda yakin?",
                      text: "Anda akan kembali ke level sebelumnya dan area aset yang telah digambar akan hilang. Apakah Anda yakin?",
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonColor: "#3085d6",
                      cancelButtonColor: "#d33",
                      confirmButtonText: "Ya, kembali!",
                      cancelButtonText: "Batal",
                    }).then((result) => {
                      if (result.isConfirmed) {
                        console.log("Back button clicked");
                        console.log("Current drawnPolygon state:", drawnPolygon);
                        // Hapus polygon saat kembali ke pemilihan provinsi
                        if (drawnPolygon) {
                          console.log("Removing polygon from map and resetting state");
                          drawnPolygon.setMap(null);
                          setDrawnPolygon(null);
                          onPolygonCreated(null);
                        }
                        setIsDrawing(false);

                        if (isAtKabupatenLevel) {
                          // Kembali ke pemilihan kabupaten/kota di provinsi yang sama
                          console.log("Navigating back to kabupaten selection");
                          onLocationSelect?.("provinsi", selectedProvinsi, true); // Tandai sebagai operasi kembali
                        } else {
                          // Kembali ke pemilihan provinsi (level nasional)
                          console.log("Navigating back to province selection (national level)");
                          onLocationSelect?.("provinsi", null, true); // Tandai sebagai operasi kembali
                        }
                      }
                    });
                  } else {
                    // Jika tidak ada polygon yang digambar, langsung kembali
                    console.log("Back button clicked");
                    console.log("Current drawnPolygon state:", drawnPolygon);
                    // Hapus polygon saat kembali ke pemilihan provinsi
                    if (drawnPolygon) {
                      console.log("Removing polygon from map and resetting state");
                      drawnPolygon.setMap(null);
                      setDrawnPolygon(null);
                      onPolygonCreated(null);
                    }
                    setIsDrawing(false);

                    if (isAtKabupatenLevel) {
                      // Kembali ke pemilihan kabupaten/kota di provinsi yang sama
                      console.log("Navigating back to kabupaten selection");
                      onLocationSelect?.("provinsi", selectedProvinsi, true); // Tandai sebagai operasi kembali
                    } else {
                      // Kembali ke pemilihan provinsi (level nasional)
                      console.log("Navigating back to province selection (national level)");
                      onLocationSelect?.("provinsi", null, true); // Tandai sebagai operasi kembali
                    }
                  }
                }}
                className="control-button"
              >
                ← Kembali
              </button>
            )}
            {selectedKabupaten && !importedGeometry && (
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

        {!importedGeometry && !selectedProvinsi && provinsiPolygons.map(p => (
          <Polygon key={p.id} paths={p.paths} options={p.options} onClick={() => handleProvinsiClick(p.feature)} />
        ))}

        {!importedGeometry && selectedProvinsi && kabupatenPolygons.map(p => (
          <Polygon
            key={p.id}
            paths={p.paths}
            options={p.options}
            onClick={() => !p.isSelected && handleKabupatenClick(p.feature)}
          />
        ))}

        {selectedKabupaten && !importedGeometry && !drawnPolygon && (
          <DrawingManager
            onLoad={onLoadDrawingManager}
            onPolygonComplete={handlePolygonComplete}
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor: "#ff0000",
                fillOpacity: 0.3, // Kurangi opacity untuk memastikan batas kabupaten tetap terlihat
                strokeWeight: 2,
                strokeColor: "#ff0000",
                editable: true,
                draggable: true,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default React.memo(PetaGambarYardip);
