import React, { useEffect, useState, useMemo, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Polygon, Marker, InfoWindow, OverlayView } from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import * as turf from "@turf/turf";
import { parseLocation } from "../utils/locationUtils";
import { isGeometryNearCoastalArea } from "../utils/coastalConfig";

const libraries = ["drawing", "places", "geometry"];

// Province styles
const provinceStyles = {
  "Jawa Tengah": {
    fillColor: "#2E7D32",
    fillOpacity: 0.5,
    strokeColor: "black",
    strokeWeight: 1,
    strokeOpacity: 1,
  },
  "Daerah Istimewa Yogyakarta": {
    fillColor: "#FFC107",
    fillOpacity: 0.5,
    strokeColor: "black",
    strokeWeight: 1,
    strokeOpacity: 1,
  },
};

const kabupatenStyle = {
  fillColor: "#0d6efd",
  fillOpacity: 0.5,
  strokeColor: "black",
  strokeWeight: 1,
  strokeOpacity: 1,
};

const selectedStyle = {
  fillColor: "#ffc107",
  fillOpacity: 0.3,
  strokeColor: "#ffc107",
  strokeWeight: 4,
  strokeOpacity: 1,
};

// Helper: Check conservation area
const isConservationArea = (feature) => {
  const kabupatenName = feature?.properties?.Kabupaten;
  return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
};

// Helper: Convert GeoJSON to Google LatLng paths
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

// Helper: Get robust center for label (Center of Bounding Box)
const getLabelPosition = (feature) => {
  try {
    // User requested to use the layer boundary (batas layer) as reference.
    // turf.center calculates the absolute center of the bounding box.
    const center = turf.center(feature);
    return center.geometry.coordinates;
  } catch (e) {
    return null;
  }
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

    // Label requires roughly 40x40px area to be worth showing without clutter
    return widthPx > 40 && heightPx > 40;
  } catch (e) {
    return true; // Default to visible on error
  }
};

// Helper: Get asset centroid
const getAssetCenter = (asset) => {
  try {
    let lokasi = typeof asset.lokasi === "string" ? JSON.parse(asset.lokasi) : asset.lokasi;
    if (!lokasi) return null;
    const polygon = turf.polygon(lokasi.type === "Polygon" ? lokasi.coordinates : lokasi);
    const centroid = turf.centroid(polygon);
    return {
      lat: centroid.geometry.coordinates[1],
      lng: centroid.geometry.coordinates[0]
    };
  } catch (e) {
    return null;
  }
};

// Custom marker icons using elegant pin-style markers similar to PetaAset
const getMarkerIcon = (status) => {
  // Determine color based on status
  const isOwned = status === "Dimiliki/Dikuasai";
  const fillColor = isOwned ? 'green' : 'red'; // Green for owned/controlled, red for not owned/not controlled

  return {
    path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
    fillColor: fillColor,
    fillOpacity: 1,
    strokeColor: 'white',
    strokeWeight: 0.8,
    scale: 1,
    anchor: new window.google.maps.Point(0, 0),
    labelOrigin: new window.google.maps.Point(0, -29),
  };
};

const PetaAsetYardip = ({
  assets = [],
  onAssetClick,
  filter,
  onViewChange,
  provinsiData,
  kabupatenData,
  mode = "interactive", // Add mode prop
}) => {
  const mapOptions = useMemo(() => {
    if (mode === 'detail' && assets && assets.length > 0) {
      const asset = assets[0];
      const geometry = parseLocation(asset.lokasi);
      if (geometry && geometry.coordinates) {
        // Calculate bounds from the polygon coordinates to properly fit the view
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        // Handle both Polygon and MultiPolygon geometries
        const coordinates = geometry.type === 'MultiPolygon' ?
          geometry.coordinates.flat() :
          geometry.coordinates;

        coordinates.forEach(ring => {
          ring.forEach(coord => {
            if (coord.length >= 2) {
              const [lng, lat] = coord;
              if (!isNaN(lat) && !isNaN(lng)) {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
              }
            }
          });
        });

        if (isFinite(minLat) && isFinite(maxLat) && isFinite(minLng) && isFinite(maxLng)) {
          // Calculate center from bounds
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;

          return {
            center: { lat: centerLat, lng: centerLng },
            zoom: 15 // Will be overridden by fitBounds anyway
          };
        }
      }
    }
    return {
      center: { lat: -7.5, lng: 110.0 }, // Default for interactive map
      zoom: 8
    };
  }, [assets, mode]);

  const [map, setMap] = useState(null);
  const [view, setView] = useState({
    type: mode === 'detail' ? "kabupaten" : "nasional", // Set initial view based on mode
    provinsi: null,
    kabupaten: null,
    kabupatenFeature: null,
  });
  const [zoom, setZoom] = useState(mapOptions.zoom);
  const [markerClusterer, setMarkerClusterer] = useState(null);



  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  // Inject CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .region-label {
        background-color: rgba(255, 255, 255, 0.8);
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -50%);
        position: absolute;
        text-align: center;
      }
      .region-label:hover {
        background-color: rgba(255, 255, 255, 0.95);
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
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Calculate asset counts for regions
  const provinsiDataWithCount = useMemo(() => {
    if (!provinsiData || !assets) return null;
    const features = provinsiData.features.map((feature) => {
      const asset_count = assets.filter((asset) => {
        const center = getAssetCenter(asset);
        if (!center) return false;
        const point = turf.point([center.lng, center.lat]);
        
        // Check if the asset is in a coastal area
        let isInside = false;
        try {
          const geometry = parseLocation(asset.lokasi);
          const isCoastal = geometry && isGeometryNearCoastalArea(geometry);
          
          if (isCoastal) {
            // For coastal areas, use intersection as fallback if centroid check fails
            if (turf.booleanPointInPolygon(point, feature)) {
              isInside = true;
            } else {
              // Try intersection approach for coastal areas
              try {
                const intersection = turf.intersect(
                  turf.featureCollection([turf.polygon(geometry.coordinates), feature])
                );
                if (intersection) {
                  isInside = true;
                }
              } catch (e) {
                // If intersection fails, stick with point in polygon
                isInside = turf.booleanPointInPolygon(point, feature);
              }
            }
          } else {
            // For non-coastal areas, use standard point in polygon check
            isInside = turf.booleanPointInPolygon(point, feature);
          }
        } catch (e) {
          // If anything fails, fall back to original method
          isInside = turf.booleanPointInPolygon(point, feature);
        }
        
        return isInside;
      }).length;
      return { ...feature, properties: { ...feature.properties, asset_count } };
    });
    return { ...provinsiData, features };
  }, [provinsiData, assets]);

  const kabupatenDataWithCount = useMemo(() => {
    if (!kabupatenData || !assets) return null;
    const features = kabupatenData.features.map((feature) => {
      const asset_count = assets.filter((asset) => {
        const center = getAssetCenter(asset);
        if (!center) return false;
        const point = turf.point([center.lng, center.lat]);
        
        // Check if the asset is in a coastal area
        let isInside = false;
        try {
          const geometry = parseLocation(asset.lokasi);
          const isCoastal = geometry && isGeometryNearCoastalArea(geometry);
          
          if (isCoastal) {
            // For coastal areas, use intersection as fallback if centroid check fails
            if (turf.booleanPointInPolygon(point, feature)) {
              isInside = true;
            } else {
              // Try intersection approach for coastal areas
              try {
                const intersection = turf.intersect(
                  turf.featureCollection([turf.polygon(geometry.coordinates), feature])
                );
                if (intersection) {
                  isInside = true;
                }
              } catch (e) {
                // If intersection fails, stick with point in polygon
                isInside = turf.booleanPointInPolygon(point, feature);
              }
            }
          } else {
            // For non-coastal areas, use standard point in polygon check
            isInside = turf.booleanPointInPolygon(point, feature);
          }
        } catch (e) {
          // If anything fails, fall back to original method
          isInside = turf.booleanPointInPolygon(point, feature);
        }
        
        return isInside;
      }).length;
      return { ...feature, properties: { ...feature.properties, asset_count } };
    });
    return { ...kabupatenData, features };
  }, [kabupatenData, assets]);

  // Sync with external filter
  useEffect(() => {
    if (!kabupatenData) return;
    const { provinsi, kabupaten } = filter || {};
    if (provinsi && kabupaten) {
      const kabFeature = kabupatenData.features.find(
        (f) => f.properties.PROVINCE === provinsi && f.properties.Kabupaten === kabupaten
      );
      if (kabFeature) {
        setView({ type: "kabupaten", provinsi, kabupaten, kabupatenFeature: kabFeature });
      }
    } else if (provinsi) {
      setView({ type: "provinsi", provinsi, kabupaten: null, kabupatenFeature: null });
    } else {
      setView({ type: "nasional", provinsi: null, kabupaten: null, kabupatenFeature: null });
    }
  }, [filter, kabupatenData]);

  // Fit bounds based on view
  useEffect(() => {
    if (!map || mode === 'detail') return; // Skip fitBounds in detail mode

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

      if (view.type === "kabupaten" && view.kabupatenFeature) {
        if (view.kabupatenFeature.geometry && view.kabupatenFeature.geometry.coordinates) {
          extendBoundsWithCoords(view.kabupatenFeature.geometry.coordinates);
        }

        // Also include asset markers in the bounds calculation
        assets.forEach(asset => {
          const center = getAssetCenter(asset);
          if (center) {
            bounds.extend(center);
            hasBounds = true;
          }
        });
      } else if (view.type === "provinsi" && kabupatenDataWithCount) {
        const featuresInView = kabupatenDataWithCount.features.filter(
          (f) => f.properties.PROVINCE === view.provinsi && !isConservationArea(f)
        );
        featuresInView.forEach(feature => {
          if (feature.geometry && feature.geometry.coordinates) {
            extendBoundsWithCoords(feature.geometry.coordinates);
          }
        });
      } else if (provinsiDataWithCount) {
        provinsiDataWithCount.features.forEach(feature => {
          if (feature.geometry && feature.geometry.coordinates) {
            extendBoundsWithCoords(feature.geometry.coordinates);
          }
        });
      }

      if (hasBounds) {
        map.setCenter(bounds.getCenter());
        map.fitBounds(bounds);
      }
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, [map, view, provinsiDataWithCount, kabupatenDataWithCount, assets, mode]);

  // Prepare polygons
  const provinsiPolygons = useMemo(() => {
    if (!provinsiDataWithCount || view.type !== "nasional") return [];
    return provinsiDataWithCount.features.map((feature, index) => ({
      id: `provinsi-${index}`,
      paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
      options: provinceStyles[feature.properties.PROVINCE] || provinceStyles["Jawa Tengah"],
      feature: feature,
    }));
  }, [provinsiDataWithCount, view]);

  const kabupatenPolygons = useMemo(() => {
    if (!kabupatenDataWithCount) return [];

    if (view.type === "provinsi") {
      const featuresInView = kabupatenDataWithCount.features.filter(
        (f) => f.properties.PROVINCE === view.provinsi && !isConservationArea(f)
      );
      return featuresInView.map((feature, index) => ({
        id: `kabupaten-${index}`,
        paths: geoJsonToGooglePaths(feature.geometry.coordinates, feature.geometry.type),
        options: kabupatenStyle,
        feature: feature,
      }));
    }

    if (view.type === "kabupaten" && view.kabupatenFeature) {
      return [{
        id: `kabupaten-selected`,
        paths: geoJsonToGooglePaths(view.kabupatenFeature.geometry.coordinates, view.kabupatenFeature.geometry.type),
        options: selectedStyle,
        feature: view.kabupatenFeature,
      }];
    }

    return [];
  }, [kabupatenDataWithCount, view]);

  // Region labels
  const regionLabels = useMemo(() => {
    if (view.type === "kabupaten") return [];

    // Zoom thresholds to prevent clutter
    if (view.type === "nasional" && zoom < 8) return [];
    if (view.type === "provinsi" && zoom < 9) return [];

    if (view.type === "nasional" && provinsiDataWithCount) {
      return provinsiDataWithCount.features.map((feature) => {
        const { PROVINCE, asset_count } = feature.properties;
        const point = turf.pointOnFeature(feature);
        let coords = point.geometry.coordinates;

        // Manual adjustments
        if (PROVINCE === "Jawa Tengah") coords[1] = coords[1] - 0.1;
        if (PROVINCE === "Daerah Istimewa Yogyakarta") coords[1] = coords[1] + 0.05;

        return {
          id: `label-prov-${PROVINCE}`,
          position: { lat: coords[1], lng: coords[0] },
          text: `${PROVINCE}\n${asset_count} Aset`,
          feature: feature,
        };
      });
    }

    if (view.type === "provinsi" && kabupatenDataWithCount) {
      const featuresInView = kabupatenDataWithCount.features.filter(
        (f) => f.properties.PROVINCE === view.provinsi && !isConservationArea(f)
      );
      return featuresInView.map((feature) => {
        const { Kabupaten, asset_count } = feature.properties;
        const point = turf.pointOnFeature(feature);
        const coords = point.geometry.coordinates;

        return {
          id: `label-kab-${Kabupaten}`,
          position: { lat: coords[1], lng: coords[0] },
          text: `${Kabupaten.replace("KABUPATEN ", "")}\n${asset_count} Aset`,
          feature: feature,
        };
      });
    }

    return [];
  }, [view, provinsiDataWithCount, kabupatenDataWithCount, zoom]);

  // Asset markers with clustering
  const assetMarkers = useMemo(() => {
    if (view.type !== "kabupaten" || mode === "detail") return [];
    return assets
      .map(asset => {
        const center = getAssetCenter(asset);
        if (!center) return null;
        return {
          position: center,
          asset: asset,
          icon: getMarkerIcon(asset.status),
        };
      })
      .filter(Boolean);
  }, [assets, view, mode]);

  // Setup marker clusterer
  useEffect(() => {
    if (!map || !window.google || view.type !== "kabupaten" || mode === "detail") {
      if (markerClusterer) {
        markerClusterer.clearMarkers();
        setMarkerClusterer(null);
      }
      return;
    }

    // Cleanup existing clusterer
    if (markerClusterer) {
      markerClusterer.clearMarkers();
    }

    // Create new clusterer
    const clusterer = new MarkerClusterer({ map, markers: [] });
    setMarkerClusterer(clusterer);

    return () => {
      if (clusterer) {
        clusterer.clearMarkers();
      }
    };
  }, [map, view.type, mode]);

  // Handle clicks
  const handleProvinsiClick = useCallback((feature) => {
    const provinceName = feature.properties.PROVINCE;
    const newView = { type: "provinsi", provinsi: provinceName, kabupaten: null };
    setView({ ...newView, kabupatenFeature: null });
    if (onViewChange) onViewChange(newView);
  }, [onViewChange]);

  const handleKabupatenClick = useCallback((feature) => {
    const { PROVINCE, Kabupaten } = feature.properties;
    if (isConservationArea(feature)) return;
    const newView = { type: "kabupaten", provinsi: PROVINCE, kabupaten: Kabupaten };
    setView({ ...newView, kabupatenFeature: feature });
    if (onViewChange) onViewChange(newView);
  }, [onViewChange]);

  const handleBackClick = () => {
    let newView;
    if (view.type === "kabupaten") {
      newView = { type: "provinsi", provinsi: view.provinsi, kabupaten: null };
    } else if (view.type === "provinsi") {
      newView = { type: "nasional", provinsi: null, kabupaten: null };
    }
    if (newView) {
      setView({ ...newView, kabupatenFeature: null });
      if (onViewChange) onViewChange(newView);
    }
  };

  const handleAssetClick = useCallback((asset) => {
    if (onAssetClick) onAssetClick(asset);
  }, [onAssetClick]);

  if (loadError) {
    return <div className="alert alert-danger">Error loading Google Maps</div>;
  }

  if (!isLoaded || !provinsiDataWithCount || !kabupatenDataWithCount) {
    return <div>Memuat data peta...</div>;
  }

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {view.type !== "nasional" && mode !== "detail" && (
        <button onClick={handleBackClick} className="custom-back-button">
          Kembali
        </button>
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
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          transition: "all 0.2s",
          minWidth: "100px",
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
            <option value="roadmap">Peta</option>
            <option value="satellite">Satelit</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>
      </div>

      {/* Zoom controls - bottom right */}
      {mode !== 'detail' && (
        <div style={{
          position: "absolute",
          bottom: "15px",
          right: "15px",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "5px"
        }}>
          <button
            style={{
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              transition: "all 0.2s",
              minWidth: "40px",
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={() => map && map.setZoom(map.getZoom() + 1)}
            title="Zoom In"
          >
            +
          </button>
          <button
            style={{
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              transition: "all 0.2s",
              minWidth: "40px",
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={() => map && map.setZoom(map.getZoom() - 1)}
            title="Zoom Out"
          >
            -
          </button>
        </div>
      )}

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

          // In detail mode, fit the map to the asset polygon
          if (mode === 'detail' && assets && assets.length > 0) {
            const asset = assets[0];
            const geometry = parseLocation(asset.lokasi);

            if (geometry && geometry.coordinates) {
              const bounds = new window.google.maps.LatLngBounds();

              // Handle both Polygon and MultiPolygon geometries
              const coordinates = geometry.type === 'MultiPolygon' ?
                geometry.coordinates.flat() :
                geometry.coordinates;

              let hasCoordinates = false;

              coordinates.forEach(ring => {
                ring.forEach(coord => {
                  if (coord.length >= 2) {
                    const [lng, lat] = coord;
                    if (!isNaN(lat) && !isNaN(lng)) {
                      bounds.extend({ lat: lat, lng: lng });
                      hasCoordinates = true;
                    }
                  }
                });
              });

              if (hasCoordinates) {
                mapInstance.fitBounds(bounds);
              }
            }
          }
        }}
        onZoomChanged={() => {
          if (map) setZoom(map.getZoom());
        }}
      >
        {/* Render Provinsi polygons */}
        {mode !== "detail" && provinsiPolygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            paths={polygon.paths}
            options={polygon.options}
            onClick={() => handleProvinsiClick(polygon.feature)}
          />
        ))}

        {/* Render Kabupaten polygons */}
        {mode !== "detail" && kabupatenPolygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            paths={polygon.paths}
            options={polygon.options}
            onClick={() => view.type === "provinsi" && handleKabupatenClick(polygon.feature)}
          />
        ))}

        {/* Render asset polygon in detail view */}
        {mode === 'detail' && assets.length > 0 && (() => {
          const asset = assets[0];
          const geometry = parseLocation(asset.lokasi);

          if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates) {
            return null;
          }

          // Determine color based on status
          const isOwned = asset.status === "Dimiliki/Dikuasai";
          const fillColor = isOwned ? '#4CAF50' : '#F44336'; // Green for owned, Red for not owned
          const strokeColor = isOwned ? '#388E3C' : '#D32F2F'; // Darker shades

          const paths = geoJsonToGooglePaths(geometry.coordinates, geometry.type);

          return (
            <Polygon
              paths={paths}
              options={{
                fillColor: fillColor,
                fillOpacity: 0.4,
                strokeColor: strokeColor,
                strokeWeight: 2,
                zIndex: 1,
              }}
            />
          );
        })()}

        {/* Render region labels using OverlayView */}
        {mode !== 'detail' && regionLabels.map((label) => (
          <OverlayView
            key={label.id}
            position={label.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="region-label">
              {label.text.split('\n').map((line, i) => (
                <div key={`${label.id}-line-${i}`}>{line}</div>
              ))}
            </div>
          </OverlayView>
        ))}

        {/* Render asset markers, but not in detail mode */}
        {isLoaded && mode !== 'detail' && (view.type === "kabupaten" || view.type === "korem") && assetMarkers.map((marker, index) => (
          <Marker
            key={`${marker.id || index}`}
            position={marker.position}
            icon={marker.icon}
            label={{
              text: "•",
              color: "white",
              fontSize: "30px",
              fontWeight: "bold",
            }}
            onClick={() => handleAssetClick(marker.asset)}
          />
        ))}

      </GoogleMap>
    </div>
  );
};

export default PetaAsetYardip;
