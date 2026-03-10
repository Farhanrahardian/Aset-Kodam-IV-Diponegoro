import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Polygon, Marker, InfoWindow, OverlayView } from "@react-google-maps/api";
import * as turf from "@turf/turf";
import { parseLocation, getCentroid } from "../utils/locationUtils";
import { normalizeKodimName } from "../utils/kodimUtils";
import { FaExpand, FaCompress, FaArrowLeft } from "react-icons/fa";

const libraries = ["drawing", "places", "geometry"];

// Helper function to generate a color from a string
const stringToColor = (str) => {
  if (!str) return "#000000";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Helper: Check if conservation area
const isConservationArea = (feature) => {
  const kabupatenName = feature?.properties?.Kabupaten;
  const kodimName = feature?.properties?.listkodim_Kodim;
  const koremName = feature?.properties?.listkodim_Korem;
  const areaName = kabupatenName || kodimName || koremName;
  return areaName === "Hutan" || areaName === "Wadung Kedungombo";
};

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

  if (type === "MultiPolygon") {
    return coordinates.flatMap((polygon) => polygon.map(ringToPath));
  } else {
    // Polygon
    return coordinates.map(ringToPath);
  }
};

// Helper: Check if asset data is incomplete (same logic as DataAsetTanahPage.js)
const isIncompleteData = (asset) => {
  // Check 4 fields: Sertifikat (hanya dari Bukti Pemilikan URL), Foto Aset, Foto Tampak Atas, Sejarah (Keterangan)
  const hasSertifikat = asset.bukti_pemilikan_url;
  const hasFotoAset = asset.foto_aset && asset.foto_aset.length > 0;
  const hasFotoTampakAtas = asset.gambar_tampak_atas_url || asset.gambar_tampak_atas_filename;
  const hasSejarah = asset.keterangan && asset.keterangan.trim() !== "";

  // Return true if ANY of the 4 fields is missing
  return !hasSertifikat || !hasFotoAset || !hasFotoTampakAtas || !hasSejarah;
};


// Helper: Check if feature is large enough to show label at current zoom
const isFeatureVisibleAtZoom = (feature, zoom) => {
  try {
    const bbox = turf.bbox(feature);
    const widthDeg = bbox[2] - bbox[0];
    const heightDeg = bbox[3] - bbox[1];

    // Pixels per degree approximation: 256 * 2^zoom / 360
    const pixelsPerDeg = (256 * Math.pow(2, zoom)) / 360;

    const widthPx = widthDeg * pixelsPerDeg;
    const heightPx = heightDeg * pixelsPerDeg;

    // Label requires roughly 60x40px area to be worth showing without clutter
    return widthPx > 60 && heightPx > 40;
  } catch (e) {
    return true; // Default to visible on error
  }
};

// Main Component
const PetaAset = React.memo(({
  assets = [],
  onAssetClick,
  asetPilihan,
  koremData,
  kodimData,
  koremDataSimplified,
  kodimDataSimplified,
  koremFilter,
  kodimFilter,
  onMapKoremSelect,
  onMapKodimSelect,
  onMapBack,
  mode = "interactive",
}) => {
  const mapOptions = useMemo(() => {
    if (mode === 'detail' && assets && assets.length > 0) {
      const asset = assets[0];
      const geometry = parseLocation(asset.lokasi);
      if (geometry) {
        const centroid = getCentroid(geometry);
        if (centroid) {
          return {
            center: { lat: centroid[0], lng: centroid[1] },
            zoom: 17
          };
        }
      }
    }
    return {
      center: { lat: -7.5, lng: 110.0 }, // Default for interactive map
      zoom: 8
    };
  }, [assets, mode]);

  const [zoom, setZoom] = useState(mapOptions.zoom);
  const [map, setMap] = useState(null);
  const mapContainerRef = useRef(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [view, setView] = useState({
    type: "nasional",
    korem: null,
    kodim: null,
  });

  // ===== HANDLER FULLSCREEN PETA =====
  const toggleMapFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
      if (map) {
        // Trigger resize event to ensure map fills new container size
        window.google.maps.event.trigger(map, "resize");
        
        // Re-fit bounds to make sure the view is correct
        const bounds = map.getBounds();
        if (bounds) {
          map.fitBounds(bounds);
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [map]);

  // State for hovered marker info
  const [hoveredMarker, setHoveredMarker] = useState(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  // Handle map zoom change
  const handleZoomChanged = useCallback(() => {
    if (map) {
      setZoom(map.getZoom());
    }
  }, [map]);


  // Inject CSS for labels
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .region-label {
        background-color: rgba(255, 255, 255, 0.7);
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        white-space: nowrap;
        transform: translate(-50%, -50%);
        position: absolute;
        text-align: center;
        pointer-events: none; /* Make the label transparent to mouse events */
      }
     .custom-back-button {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  padding: 8px 12px;
  background-color: white;
  border: 2px solid rgba(0,0,0,0.2);
  border-radius: 4px;
  cursor: pointer;
  font-family: Roboto, Arial, sans-serif;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  gap: 6px;
}
.custom-back-button:hover {
  background-color: #f0f0f0;
}
@media (max-width: 480px) {
  .custom-back-button .btn-text {
    display: none;
  }
}
      .info-banner {
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        background-color: rgba(255, 229, 100, 0.9);
        padding: 5px 15px;
        border-radius: 15px;
        border: 1px solid #E6A23C;
        font-size: 12px;
        color: #4A4A4A;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      }
      `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Sync view with external filter
  useEffect(() => {
    if (!koremData || !kodimData) return;

    let targetKodimName = kodimFilter;
    let targetKoremName = koremFilter?.nama;

    if (targetKoremName === "Berdiri Sendiri") {
      targetKodimName = "Kodim 0733/Kota Semarang";
    }

    if (targetKodimName) {
      const normalizedTarget = normalizeKodimName(targetKodimName);
      if (normalizedTarget === "Kodim 0733/Kota Semarang") {
        const semarangKoremFeature = koremData.features.find(
          (f) => f.properties.listkodim_Korem === "Kodim 0733/Kota Semarang"
        );
        const semarangKodimFeature = kodimData.features.find(
          (f) => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)"
        );
        if (semarangKoremFeature && semarangKodimFeature) {
          setView({
            type: "kodim",
            korem: semarangKoremFeature.properties,
            kodim: {
              ...semarangKodimFeature.properties,
              listkodim_Kodim: "Kodim 0733/Kota Semarang",
            },
          });
        }
      } else {
        const kodimFeature = kodimData.features.find(
          (f) => normalizeKodimName(f.properties.listkodim_Kodim) === normalizedTarget
        );
        if (kodimFeature) {
          const parentKoremName = kodimFeature.properties.listkodim_Korem;
          const parentKoremFeature = koremData.features.find(
            (f) => f.properties.listkodim_Korem === parentKoremName
          );
          setView({
            type: "kodim",
            korem: parentKoremFeature?.properties,
            kodim: {
              ...kodimFeature.properties,
              listkodim_Kodim: normalizedTarget,
            },
          });
        }
      }
    } else if (targetKoremName) {
      const koremFeature = koremData.features.find(
        (f) => f.properties.listkodim_Korem === targetKoremName
      );
      if (koremFeature) {
        setView({
          type: "korem",
          korem: koremFeature.properties,
          kodim: null,
        });
      }
    } else {
      setView({ type: "nasional", korem: null, kodim: null });
    }
  }, [koremFilter, kodimFilter, koremData, kodimData]);

  // Fit bounds based on view
  useEffect(() => {
    if (!map) return;

    try {
      const bounds = new window.google.maps.LatLngBounds();
      let hasBounds = false;

      // Helper to recursively extract coordinates from any geometry array (Polygon or MultiPolygon)
      const extendBoundsWithCoords = (coords) => {
        if (!Array.isArray(coords)) return;

        // Check if it's a coordinate pair [lng, lat] or [lng, lat, ele]
        if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          if (!isNaN(coords[0]) && !isNaN(coords[1])) {
            bounds.extend({ lat: coords[1], lng: coords[0] });
            hasBounds = true;
          }
          return;
        }

        // Otherwise recurse
        coords.forEach(item => extendBoundsWithCoords(item));
      };

      if (mode === "detail" && assets && assets.length > 0) {
        const asset = assets[0];
        const geometry = parseLocation(asset.lokasi);
        if (geometry && geometry.coordinates) {
          extendBoundsWithCoords(geometry.coordinates);
        }
      } else {
        // This part needs koremData and kodimData
        if (!koremData || !kodimData) return;

        if (view.type === "kodim" && view.kodim) {
          const normalizedViewKodim = normalizeKodimName(view.kodim.listkodim_Kodim);
          let feature = null;

          if (normalizedViewKodim === "Kodim 0733/Kota Semarang") {
            feature = kodimData.features.find(
              (f) => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)"
            );
          } else {
            feature = kodimData.features.find(
              (f) => normalizeKodimName(f.properties.listkodim_Kodim) === normalizedViewKodim
            );
          }

          if (feature && feature.geometry && feature.geometry.coordinates) {
            extendBoundsWithCoords(feature.geometry.coordinates);
          }
        } else if (view.type === "korem" && view.korem) {
          const feature = koremData.features.find(
            (f) => f.properties.listkodim_Korem === view.korem.listkodim_Korem
          );
          if (feature && feature.geometry && feature.geometry.coordinates) {
            extendBoundsWithCoords(feature.geometry.coordinates);
          }
        } else {
          // Nasional view
          koremData.features.forEach(feature => {
            if (!isConservationArea(feature) && feature.geometry && feature.geometry.coordinates) {
              extendBoundsWithCoords(feature.geometry.coordinates);
            }
          });
        }
      }

      if (hasBounds) {
        map.setCenter(bounds.getCenter());
        map.fitBounds(bounds);
      }
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, [map, view, koremData, kodimData, assets, mode]);

  // Prepare Korem polygons
  const koremPolygons = useMemo(() => {
    // Only show Korem polygons at the national level
    if (!koremData || view.type !== "nasional") return [];

    const features = koremData.features.filter(f => !isConservationArea(f));


    console.log("Generating Korem Polygons:", features.length);
    return features.map((feature, index) => {
      const koremName = feature.properties.listkodim_Korem;
      const color = stringToColor(koremName);
      return {
        id: `korem-${index}`,
        paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
        options: {
          fillColor: color,
          fillOpacity: 0.35,
          strokeColor: "#000000",
          strokeWeight: 2,
          strokeOpacity: 1,
        },
        feature: feature,
      };
    });
  }, [koremData, view]);

  // Prepare Kodim polygons
  const kodimPolygons = useMemo(() => {
    if (!kodimData || !view.korem) return [];

    let koremName = view.korem.listkodim_Korem;
    let features = [];

    if (view.type === "korem") {
      if (koremName === "Kodim 0733/Kota Semarang") {
        features = kodimData.features.filter(
          (f) => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)"
        );
      } else {
        features = kodimData.features.filter(
          (f) => f.properties.listkodim_Korem === koremName && !isConservationArea(f)
        );
      }
    } else if (view.type === "kodim") {
      let selectedFeature = null;
      if (view.kodim.listkodim_Kodim === "Kodim 0733/Kota Semarang") {
        selectedFeature = kodimData.features.find(
          (f) => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)"
        );
      } else {
        selectedFeature = kodimData.features.find(
          (f) => normalizeKodimName(f.properties.listkodim_Kodim) === normalizeKodimName(view.kodim.listkodim_Kodim)
        );
      }
      features = selectedFeature ? [selectedFeature] : [];
    }

    return features.map((feature, index) => ({
      id: `kodim-${index}`,
      paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
      options: {
        fillColor: "#fb923c", // Match kodimStyle from PetaGambarAset
        fillOpacity: 0.4,
        strokeColor: "#ea580c",
        strokeWeight: 2,
        strokeOpacity: 1,
      },
      feature: feature,
    }));
  }, [kodimData, view]);

  // Prepare asset polygon for detail view
  const assetPolygon = useMemo(() => {
    if (mode !== 'detail' || !assets || assets.length === 0) {
      return null;
    }
    const asset = assets[0];
    const geometry = parseLocation(asset.lokasi);

    if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates) {
      return null;
    }

    // Determine color based on certificate status
    const isCertified = asset.pemilikan_sertifikat === "Ya";
    const fillColor = isCertified ? "#4CAF50" : "#F44336"; // Green for certified, Red for not certified
    const strokeColor = isCertified ? "#388E3C" : "#D32F2F"; // Darker shades

    const paths = geoJsonToGooglePaths(geometry.coordinates, geometry.type);

    return {
      paths: paths,
      options: {
        fillColor: fillColor,
        fillOpacity: 0.4,
        strokeColor: strokeColor,
        strokeWeight: 2,
        zIndex: 1,
      },
    };
  }, [assets, mode]);

  // Prepare asset markers
  const assetsToShow = (view.type === "kodim" || mode === "detail") ? assets : [];

  const assetMarkers = useMemo(() => {
    return assetsToShow
      .filter(asset => {
        const geometry = parseLocation(asset.lokasi);
        return geometry && getCentroid(geometry) !== null;
      })
      .map((asset, index) => {
        const geometry = parseLocation(asset.lokasi);
        const centroid = getCentroid(geometry);
        const isSelected = asetPilihan && asetPilihan.id === asset.id;

        // Check certificate status - warna berdasarkan Status Sertifikat
        const isCertified = asset.pemilikan_sertifikat === "Ya";
        const incomplete = isIncompleteData(asset);

        // Determine base color - hijau jika Status Sertifikat "Ya", merah jika "Tidak"
        const fillColor = isCertified ? 'green' : 'red';

        // Create marker with pattern for incomplete data
        // For incomplete data: use striped pattern (diagonal lines)
        // For complete data: use solid color
        let markerIcon;

        if (incomplete) {
          // Striped pattern icon for incomplete data
          // Using a SVG-like pattern with diagonal lines
          const stripeColor = 'rgba(255, 255, 255, 0.7)';
          markerIcon = {
            path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -8,-28 L -6,-28 M -4,-26 L -2,-26 M 0,-24 L 2,-24 M 4,-26 L 6,-26 M 8,-28 L 7,-28 M -7,-22 L -5,-22 M -3,-20 L -1,-20 M 1,-18 L 3,-18 M 5,-20 L 7,-20 M -6,-16 L -4,-16 M -2,-14 L 0,-14 M 2,-16 L 4,-16 M 5,-12 L 3,-12 M -5,-10 L -3,-10 M -1,-8 L 1,-8 M 3,-10 L 5,-10 M -4,-6 L -2,-6 M 0,-4 L 2,-4 M 4,-6 L 6,-6 M -3,-2 L -1,-2 M 1,0 L 3,0',
            fillColor: fillColor,
            fillOpacity: 1,
            strokeColor: stripeColor,
            strokeWeight: 1.5,
            scale: isSelected ? 1.2 : 1,
            anchor: new window.google.maps.Point(0, 0),
            labelOrigin: new window.google.maps.Point(0, -29),
          };
        } else {
          // Solid color icon for complete data
          markerIcon = {
            path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
            fillColor: fillColor,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 0.8,
            scale: isSelected ? 1.2 : 1,
            anchor: new window.google.maps.Point(0, 0),
            labelOrigin: new window.google.maps.Point(0, -29),
          };
        }

        const markerLabel = {
          text: "•",
          color: "white",
          fontSize: "30px",
          fontWeight: "bold",
        };

        return {
          id: `asset-${asset.id}`,
          position: { lat: centroid[0], lng: centroid[1] }, // Corrected: centroid is [lat, lng]
          asset: asset,
          icon: markerIcon,
          label: markerLabel,
          isSelected: isSelected,
          incomplete: incomplete,
        };
      });
  }, [assetsToShow, asetPilihan]);

  // Region labels
  const regionLabels = useMemo(() => {
    if (view.type === "kodim" || mode === "detail") return [];

    // Zoom thresholds to prevent clutter
    if (view.type === "nasional" && zoom < 8) return [];
    if (view.type === "korem" && zoom < 9) return [];

    if (view.type === "nasional" && koremData) {
      return koremData.features
        .filter(f => !isConservationArea(f))
        .filter(f => isFeatureVisibleAtZoom(f, zoom))
        .map((feature) => {
          const nama = feature.properties.listkodim_Korem;
          const assetCount = feature.properties.asset_count || 0;
          const centroid = turf.centroid(feature);
          const coords = centroid.geometry.coordinates;

          return {
            id: `label-korem-${nama}`,
            position: { lat: coords[1], lng: coords[0] },
            text: `${nama}\n${assetCount} Aset`,
            feature: feature,
          };
        });
    }

    if (view.type === "korem" && kodimData && view.korem) {
      // Special handling for Semarang (BS)
      if (view.korem.listkodim_Korem === "Kodim 0733/Kota Semarang") {
        const semarangFeature = kodimData.features.find(f => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)");
        if (semarangFeature && isFeatureVisibleAtZoom(semarangFeature, zoom)) {
          const centroid = turf.centroid(semarangFeature);
          const coords = centroid.geometry.coordinates;
          const assetCount = semarangFeature.properties.asset_count || 0;
          return [{
            id: `label-kodim-semarang`,
            position: { lat: coords[1], lng: coords[0] },
            text: `Kota Semarang\n${assetCount} Aset`,
            feature: semarangFeature,
          }];
        }
        return [];
      }

      const koremName = view.korem.listkodim_Korem;
      const kodimsInKorem = kodimData.features.filter(
        (f) => f.properties.listkodim_Korem === koremName
      );

      return kodimsInKorem
        .filter(f => isFeatureVisibleAtZoom(f, zoom))
        .map((feature) => {
          const nama = normalizeKodimName(feature.properties.listkodim_Kodim).replace(/^Kodim\s/i, "");
          const assetCount = feature.properties.asset_count || 0;
          const centroid = turf.centroid(feature);
          const coords = centroid.geometry.coordinates;

          return {
            id: `label-kodim-${nama}`,
            position: { lat: coords[1], lng: coords[0] },
            text: `${nama}\n${assetCount} Aset`,
            feature: feature,
          };
        });
    }

    return [];
  }, [view, koremData, kodimData, mode, zoom]);

  // Handle region click
  const handleKoremClick = useCallback((feature) => {
    if (feature.properties.listkodim_Korem === "Kodim 0733/Kota Semarang") {
      const kodimFeature = kodimData.features.find(
        (f) => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)"
      );
      if (kodimFeature) {
        const kodimProperties = {
          ...kodimFeature.properties,
          listkodim_Kodim: "Kodim 0733/Kota Semarang",
        };
        setView({
          type: "kodim",
          korem: feature.properties,
          kodim: kodimProperties,
        });
        if (onMapKodimSelect) onMapKodimSelect(kodimProperties);
      }
    } else {
      setView({ type: "korem", korem: feature.properties, kodim: null });
      if (onMapKoremSelect) onMapKoremSelect(feature.properties);
    }
  }, [kodimData, onMapKodimSelect, onMapKoremSelect]);

  const handleKodimClick = useCallback((feature) => {
    let normalizedKodimName = normalizeKodimName(feature.properties.listkodim_Kodim);
    if (feature.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)") {
      normalizedKodimName = "Kodim 0733/Kota Semarang";
    }
    const normalizedKodim = {
      ...feature.properties,
      listkodim_Kodim: normalizedKodimName,
    };
    setView({ type: "kodim", korem: view.korem, kodim: normalizedKodim });
    if (onMapKodimSelect) onMapKodimSelect(normalizedKodim);
  }, [view.korem, onMapKodimSelect]);

  const handleAssetClick = useCallback((asset, centroid) => {
    if (onAssetClick) onAssetClick(asset);
  }, [onAssetClick]);

  const handleBackClick = useCallback(() => {
    if (view.type === "kodim" && view.kodim?.listkodim_Kodim === "Kodim 0733/Kota Semarang") {
      setView({ type: "nasional", korem: null, kodim: null });
      if (onMapBack) onMapBack({ type: "nasional", korem: null, kodim: null });
    } else if (view.type === "kodim") {
      setView({ type: "korem", korem: view.korem, kodim: null });
      if (onMapBack) onMapBack({ type: "korem", korem: view.korem, kodim: null });
    } else if (view.type === "korem") {
      setView({ type: "nasional", korem: null, kodim: null });
      if (onMapBack) onMapBack({ type: "nasional", korem: null, kodim: null });
    }
  }, [view, onMapBack]);

  const assetsOnMapCount = assetMarkers.length;

  if (loadError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="alert alert-danger">Error loading Google Maps</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
        <span>Memuat data peta...</span>
      </div>
    );
  }

  if (mode === 'interactive' && (!koremData || !kodimData)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
        <span>Memuat data peta...</span>
      </div>
    );
  }

  return (
    <div ref={mapContainerRef} style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Top Left Controls Group */}
      <div style={{ position: "absolute", top: "15px", left: "15px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button 
          type="button"
          className="shadow border-0 d-flex align-items-center justify-content-center" 
          style={{ 
            width: "40px", 
            height: "40px", 
            backgroundColor: "#ffffff", 
            borderRadius: "4px",
            padding: 0,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
          }} 
          onClick={toggleMapFullscreen}
          title={isMapFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
        >
          {isMapFullscreen ? 
            <FaCompress size={22} style={{ color: "#000000", display: "block" }} /> : 
            <FaExpand size={22} style={{ color: "#000000", display: "block" }} />
          }
        </button>

        {view.type !== "nasional" && mode !== "detail" && (
          <button 
            type="button"
            className="shadow border-0 d-flex align-items-center px-3" 
            style={{ 
              height: "40px", 
              backgroundColor: "#ffffff", 
              borderRadius: "4px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              fontWeight: "bold",
              fontSize: "14px",
              color: "#000"
            }} 
            onClick={handleBackClick}
          >
            <FaArrowLeft className="me-2" /> Kembali
          </button>
        )}
      </div>

      {/* Info banner */}
      {view.type === "kodim" && assetsToShow.length > assetsOnMapCount && (
        <div className="info-banner">
          <strong>Info:</strong> Menampilkan {assetsOnMapCount} dari {assetsToShow.length} aset.
          {assetsToShow.length - assetsOnMapCount} aset tidak memiliki data lokasi valid.
        </div>
      )}

      {/* Map type selector - top right */}
      <div style={{
        position: "absolute",
        top: "15px",
        right: "15px",
        zIndex: 1
      }}>
        <div style={{
          backgroundColor: "white",
          border: "none",
          borderRadius: "4px",
          padding: "8px 12px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          transition: "all 0.2s",
          minWidth: "120px",
          minHeight: "40px",
          color: "#374151"
        }}>
          <select
            style={{
              backgroundColor: "transparent",
              border: "none",
              width: "100%",
              height: "100%",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "inherit",
              fontWeight: "inherit",
              color: "inherit",
            }}
            onChange={(e) => {
              if (map) {
                map.setMapTypeId(e.target.value);
              }
            }}
            defaultValue="roadmap"
          >
            <option value="roadmap">Tampilan Peta</option>
            <option value="satellite">Citra Satelit</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>
      </div>

      {/* Zoom controls - bottom right */}
      <div style={{
        position: "absolute",
        bottom: "15px",
        right: "15px",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        <button
          style={{
            backgroundColor: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1.2rem",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            transition: "all 0.2s",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000"
          }}
          onClick={() => map && map.setZoom(map.getZoom() + 1)}
          title="Zoom In"
        >
          +
        </button>
        <button
          style={{
            backgroundColor: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1.2rem",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            transition: "all 0.2s",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000"
          }}
          onClick={() => map && map.setZoom(map.getZoom() - 1)}
          title="Zoom Out"
        >
          -
        </button>
      </div>

      <GoogleMap
        center={mapOptions.center}
        zoom={mapOptions.zoom}
        mapContainerStyle={{ height: "100%", width: "100%" }}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          gestureHandling: mode === 'detail' ? 'none' : 'auto',
          draggable: mode !== 'detail',
          disableDefaultUI: true,
        }}
        onLoad={(mapInstance) => {
          setMap(mapInstance);
          setZoom(mapInstance.getZoom());
        }}
        onZoomChanged={handleZoomChanged}
      >

        {/* Render Korem polygons */}
        {mode !== "detail" && koremPolygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            paths={polygon.paths}
            options={polygon.options}
            onClick={() => handleKoremClick(polygon.feature)}
          />
        ))}

        {/* Render Kodim polygons */}
        {mode !== "detail" && kodimPolygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            paths={polygon.paths}
            options={polygon.options}
            onClick={() => handleKodimClick(polygon.feature)}
          />
        ))}

        {/* Render asset polygon in detail view */}
        {mode === 'detail' && assetPolygon && (
          <Polygon
            paths={assetPolygon.paths}
            options={assetPolygon.options}
          />
        )}

        {/* Render asset markers, but not in detail mode */}
        {isLoaded && mode !== 'detail' && (view.type === "kodim" || view.type === "korem") && assetMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={marker.icon}
            label={marker.label}
            onClick={() => handleAssetClick(marker.asset, [marker.position.lat, marker.position.lng])}
            onMouseOver={() => setHoveredMarker(marker)}
            onMouseOut={() => setHoveredMarker(null)}
          />
        ))}

        {/* Info window for hovered marker - shows data completeness info */}
        {hoveredMarker && (
          <InfoWindow
            position={hoveredMarker.position}
            onCloseClick={() => setHoveredMarker(null)}
            options={{
              pixelOffset: new window.google.maps.Size(0, -40),
              maxWidth: 250,
            }}
          >
            <div style={{ fontSize: '12px', padding: '5px' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                {hoveredMarker.asset.nama || 'Aset'}
              </strong>
              <div style={{ marginBottom: '6px' }}>
                <strong>Kelengkapan Data:</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: hoveredMarker.asset.bukti_pemilikan_url ? '#4CAF50' : '#F44336',
                    display: 'inline-block'
                  }}></span>
                  <span>Sertifikat</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px', 
                    background: (hoveredMarker.asset.foto_aset && hoveredMarker.asset.foto_aset.length > 0) ? '#4CAF50' : '#F44336',
                    display: 'inline-block'
                  }}></span>
                  <span>Foto Aset</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px', 
                    background: (hoveredMarker.asset.gambar_tampak_atas_url || hoveredMarker.asset.gambar_tampak_atas_filename) ? '#4CAF50' : '#F44336',
                    display: 'inline-block'
                  }}></span>
                  <span>Foto Tampak Atas</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px', 
                    background: (hoveredMarker.asset.keterangan && hoveredMarker.asset.keterangan.trim() !== "") ? '#4CAF50' : '#F44336',
                    display: 'inline-block'
                  }}></span>
                  <span>Sejarah</span>
                </div>
              </div>
              {hoveredMarker.incomplete && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '6px', 
                  backgroundColor: '#FEF3C7', 
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#92400E'
                }}>
                  ⚠️ Data tidak lengkap. Harap lengkapi data yang bertanda merah.
                </div>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Render region labels using OverlayView */}
        {mode !== 'detail' && regionLabels.map((label) => (
          <OverlayView
            key={label.id}
            position={label.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="region-label">
              {label.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </OverlayView>
        ))}

      </GoogleMap>
    </div>
  );
});

export default PetaAset;
