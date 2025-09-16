import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turf from "@turf/turf";

// Fix for broken icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom colored markers for different statuses
const createCustomIcon = (color = "#3388ff", status = "") => {
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.6 12.5 28.5 12.5 28.5S25 23.1 25 12.5C25 5.6 19.4 0 12.5 0z" 
            fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12.5" cy="12.5" r="6" fill="#fff"/>
      <circle cx="12.5" cy="12.5" r="3" fill="${color}"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: `custom-marker-${status.replace(/[^a-zA-Z0-9]/g, "")}`,
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -41],
  });
};

// Get marker color based on status
const getMarkerColor = (status) => {
  switch (status) {
    case "Dimiliki/Dikuasai":
      return "#10b981"; // Green
    case "Tidak Dimiliki/Tidak Dikuasai":
      return "#ef4444"; // Red
    case "Lain-lain":
      return "#f59e0b"; // Yellow/Orange
    case "Dalam Proses":
      return "#06b6d4"; // Cyan
    default:
      return "#6b7280"; // Gray
  }
};

const MapSearch = () => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider: provider,
      style: "bar",
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
    });

    map.addControl(searchControl);

    return () => {
      map.removeControl(searchControl);
    };
  }, [map]);

  return null;
};

const PetaAsetYardip = ({
  onDrawingCreated,
  assets = [],
  isDrawing = false,
  jatengBoundary,
  diyBoundary,
  selectedKorem,
  selectedKodim,
  fitBounds = false,
  cityBounds = null,
  selectedCity = null,
  manualAreaAdjustment = null,
  originalGeometry = null,
  onAssetClick,
  zoomToAsset = null,
  markerColorMode = "status",
  displayMode = "polygon", // NEW: "polygon" or "marker" - default polygon for backward compatibility
}) => {
  const mapRef = useRef(null);
  const featureGroupRef = useRef(null);
  const adjustedPolygonRef = useRef(null);
  const [adjustedGeometry, setAdjustedGeometry] = useState(null);

  const mapCenter = [-7.5, 110.0]; // Center of Central Java
  const initialZoom = 8;

  // Auto-zoom to selected area, city, assets, or specific asset
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        if (zoomToAsset && zoomToAsset.lokasi) {
          console.log("Auto-zooming to specific yardip asset:", zoomToAsset);
          try {
            if (displayMode === "marker") {
              // For marker mode, zoom to asset center
              const center = getAssetCenter(zoomToAsset);
              if (center) {
                mapRef.current.setView(center, 15, {
                  animate: true,
                  duration: 1.5,
                });
                console.log(
                  "✅ Successfully zoomed to yardip asset marker:",
                  zoomToAsset.id
                );
              }
            } else {
              // For polygon mode, fit bounds to polygon
              const validatedLocation = validateAndParseLocation(
                zoomToAsset.lokasi
              );
              if (validatedLocation) {
                const geoJsonAsset = {
                  type: "Feature",
                  geometry: {
                    type: "Polygon",
                    coordinates: validatedLocation,
                  },
                };
                const layer = L.geoJSON(geoJsonAsset);
                mapRef.current.fitBounds(layer.getBounds(), {
                  padding: [50, 50],
                  maxZoom: 16,
                  animate: true,
                  duration: 1.5,
                });
                console.log(
                  "✅ Successfully zoomed to yardip asset polygon:",
                  zoomToAsset.id
                );
              }
            }
          } catch (error) {
            console.error("Error zooming to yardip asset:", error);
          }
        } else if (
          cityBounds &&
          Array.isArray(cityBounds) &&
          cityBounds.length === 2
        ) {
          console.log(
            "Auto-zooming to city bounds:",
            cityBounds,
            "City:",
            selectedCity
          );

          try {
            const southWest = L.latLng(cityBounds[0][0], cityBounds[0][1]);
            const northEast = L.latLng(cityBounds[1][0], cityBounds[1][1]);
            const bounds = L.latLngBounds(southWest, northEast);

            mapRef.current.fitBounds(bounds, {
              padding: [30, 30],
              maxZoom: 12,
              animate: true,
              duration: 1.5,
            });

            console.log("✅ Successfully zoomed to city:", selectedCity);
          } catch (error) {
            console.error("Error zooming to city bounds:", error);
            const centerLat = (cityBounds[0][0] + cityBounds[1][0]) / 2;
            const centerLng = (cityBounds[0][1] + cityBounds[1][1]) / 2;
            mapRef.current.setView([centerLat, centerLng], 11, {
              animate: true,
            });
          }
        } else if (selectedKodim && selectedKodim.geometry) {
          const kodimLayer = L.geoJSON(selectedKodim.geometry);
          mapRef.current.fitBounds(kodimLayer.getBounds(), {
            padding: [20, 20],
            animate: true,
          });
        } else if (selectedKorem && selectedKorem.geometry) {
          const koremLayer = L.geoJSON(selectedKorem.geometry);
          mapRef.current.fitBounds(koremLayer.getBounds(), {
            padding: [20, 20],
            animate: true,
          });
        } else if (fitBounds && assets.length > 0) {
          if (displayMode === "marker") {
            // For marker mode, fit bounds to all marker positions
            const validAssets = assets.filter((asset) => asset.lokasi);
            if (validAssets.length > 0) {
              const bounds = L.latLngBounds();
              validAssets.forEach((asset) => {
                const center = getAssetCenter(asset);
                if (center) {
                  bounds.extend(center);
                }
              });
              if (bounds.isValid()) {
                mapRef.current.fitBounds(bounds, {
                  padding: [20, 20],
                  animate: true,
                });
              }
            }
          } else {
            // For polygon mode, fit bounds to all polygons
            const validAssets = assets.filter(
              (asset) => asset.lokasi && Array.isArray(asset.lokasi)
            );
            if (validAssets.length > 0) {
              try {
                const group = new L.FeatureGroup();
                validAssets.forEach((asset) => {
                  const geoJsonAsset = createGeoJSONFromAsset(asset);
                  if (geoJsonAsset) {
                    const layer = L.geoJSON(geoJsonAsset);
                    group.addLayer(layer);
                  }
                });

                if (group.getLayers().length > 0) {
                  mapRef.current.fitBounds(group.getBounds(), {
                    padding: [10, 10],
                    animate: true,
                  });
                }
              } catch (error) {
                console.error("Error fitting bounds to yardip assets:", error);
              }
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    selectedKorem,
    selectedKodim,
    assets,
    fitBounds,
    cityBounds,
    selectedCity,
    zoomToAsset,
    displayMode,
  ]);

  // Function to get asset center point for markers
  const getAssetCenter = (asset) => {
    try {
      const validatedLocation = validateAndParseLocation(asset.lokasi);
      if (!validatedLocation) return null;

      // Create turf polygon and get centroid
      const polygon = turf.polygon(validatedLocation);
      const centroid = turf.centroid(polygon);
      const [lng, lat] = centroid.geometry.coordinates;

      return [lat, lng]; // Leaflet expects [lat, lng]
    } catch (error) {
      console.error("Error getting asset center:", error);
      return null;
    }
  };

  // Function to validate and parse location data
  const validateAndParseLocation = (locationData) => {
    if (!locationData) return null;

    let lokasi = locationData;

    if (typeof lokasi === "string") {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        console.error("Failed to parse location JSON:", e);
        return null;
      }
    }

    if (Array.isArray(lokasi)) {
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        typeof lokasi[0][0] === "number"
      ) {
        return [lokasi];
      }
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        Array.isArray(lokasi[0][0])
      ) {
        return lokasi;
      }
    }

    if (lokasi.type === "Polygon" && lokasi.coordinates) {
      return lokasi.coordinates;
    }

    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }

    console.warn("Unrecognized yardip location format:", lokasi);
    return null;
  };

  // Handle manual area adjustment - adjust polygon to match new area
  useEffect(() => {
    if (manualAreaAdjustment && originalGeometry && featureGroupRef.current) {
      try {
        console.log("Adjusting polygon for manual area:", manualAreaAdjustment);

        // Create the adjusted polygon
        const adjustedPolygon = adjustPolygonToArea(
          originalGeometry,
          manualAreaAdjustment
        );

        if (adjustedPolygon) {
          setAdjustedGeometry(adjustedPolygon);

          // Clear existing layers and add the adjusted polygon
          featureGroupRef.current.clearLayers();

          // Create Leaflet layer for the adjusted polygon
          const adjustedLayer = L.geoJSON(adjustedPolygon, {
            style: {
              color: "#ff6b35", // Orange color for manually adjusted
              fillColor: "#ff6b35",
              fillOpacity: 0.5,
              weight: 3,
              dashArray: "5,5", // Dashed style to indicate manual adjustment
            },
          });

          featureGroupRef.current.addLayer(adjustedLayer);
          adjustedPolygonRef.current = adjustedLayer;

          console.log("✅ Polygon adjusted to area:", manualAreaAdjustment);
        }
      } catch (error) {
        console.error("Error adjusting polygon area:", error);
      }
    } else if (!manualAreaAdjustment && adjustedPolygonRef.current) {
      // Remove adjusted polygon if no manual adjustment
      if (featureGroupRef.current && adjustedPolygonRef.current) {
        featureGroupRef.current.removeLayer(adjustedPolygonRef.current);
        adjustedPolygonRef.current = null;
        setAdjustedGeometry(null);
      }
    }
  }, [manualAreaAdjustment, originalGeometry]);

  // Function to adjust polygon area using scaling method
  const adjustPolygonToArea = (geometry, targetArea) => {
    try {
      if (!geometry || !geometry.coordinates || !targetArea) return null;

      // Create turf polygon
      const polygon = turf.polygon(geometry.coordinates);
      const currentArea = turf.area(polygon);

      if (currentArea <= 0) return null;

      // Calculate scaling factor based on area ratio
      const areaRatio = targetArea / currentArea;
      const scaleFactor = Math.sqrt(areaRatio);

      console.log("Area adjustment:", {
        currentArea: currentArea.toFixed(2),
        targetArea: targetArea.toFixed(2),
        scaleFactor: scaleFactor.toFixed(4),
      });

      // Get centroid for scaling origin
      const centroid = turf.centroid(polygon);
      const centerCoords = centroid.geometry.coordinates;

      // Scale the polygon from its centroid
      const scaledPolygon = turf.transformScale(polygon, scaleFactor, {
        origin: centerCoords,
      });

      // Verify the new area
      const newArea = turf.area(scaledPolygon);
      console.log("Scaled polygon area:", newArea.toFixed(2));

      return {
        type: "Feature",
        properties: {
          originalArea: currentArea,
          targetArea: targetArea,
          actualArea: newArea,
          scaleFactor: scaleFactor,
          isManuallyAdjusted: true,
        },
        geometry: scaledPolygon.geometry,
      };
    } catch (error) {
      console.error("Error in adjustPolygonToArea:", error);
      return null;
    }
  };

  const handleCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === "polygon") {
      const geojson = layer.toGeoJSON();
      const area = turf.area(geojson);

      console.log("Drawing created:", {
        layerType,
        geojson,
        area,
        selectedCity,
      });

      // Clear previous drawings and adjusted polygons
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
        featureGroupRef.current.addLayer(layer);
      }

      // Reset adjusted geometry state
      setAdjustedGeometry(null);
      adjustedPolygonRef.current = null;

      // Call callback from parent
      if (typeof onDrawingCreated === "function") {
        onDrawingCreated({
          geometry: geojson.geometry,
          area: area,
        });
      }
    }
  };

  // Helper function to create GeoJSON from asset data
  const createGeoJSONFromAsset = (asset) => {
    if (!asset.lokasi) return null;

    try {
      const validatedLocation = validateAndParseLocation(asset.lokasi);
      if (!validatedLocation) return null;

      return {
        type: "Feature",
        properties: {
          id: asset.id,
          nama: asset.nama,
          pengelola: asset.pengelola,
          bidang: asset.bidang,
          status: asset.status,
          luas: asset.luas,
          area: asset.area,
          kabkota: asset.kabkota,
          kecamatan: asset.kecamatan,
          kelurahan: asset.kelurahan,
          keterangan: asset.keterangan,
          type: asset.type,
          originalAsset: asset.originalAsset || asset, // Reference to original asset
        },
        geometry: {
          type: "Polygon",
          coordinates: validatedLocation,
        },
      };
    } catch (error) {
      console.error(
        "Error creating GeoJSON for yardip asset:",
        asset.id,
        error
      );
      return null;
    }
  };

  // Function to get asset style based on color mode
  const getAssetStyle = (feature, markerColorMode) => {
    const properties = feature.properties;

    switch (markerColorMode) {
      case "status":
        switch (properties.status) {
          case "Dimiliki/Dikuasai":
            return {
              fillColor: "#10b981", // Green
              color: "#059669",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7,
            };
          case "Tidak Dimiliki/Tidak Dikuasai":
            return {
              fillColor: "#ef4444", // Red
              color: "#dc2626",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7,
            };
          case "Lain-lain":
            return {
              fillColor: "#f59e0b", // Yellow
              color: "#d97706",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7,
            };
          case "Dalam Proses":
            return {
              fillColor: "#06b6d4", // Cyan
              color: "#0891b2",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7,
            };
          default:
            return {
              fillColor: "#6b7280", // Gray
              color: "#4b5563",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7,
            };
        }
      case "bidang":
        // Color by bidang/field
        const bidangColors = {
          "Bidang A": { fillColor: "#8b5cf6", color: "#7c3aed" },
          "Bidang B": { fillColor: "#06b6d4", color: "#0891b2" },
          "Bidang C": { fillColor: "#10b981", color: "#059669" },
          "Bidang D": { fillColor: "#f59e0b", color: "#d97706" },
          "Bidang E": { fillColor: "#ef4444", color: "#dc2626" },
        };
        const bidangStyle = bidangColors[properties.bidang] || {
          fillColor: "#6b7280",
          color: "#4b5563",
        };
        return {
          ...bidangStyle,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        };
      default:
        return {
          fillColor: "#e11d48", // Default pink
          color: "#be123c",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        };
    }
  };

  // Styles for different elements
  const koremStyle = {
    fillColor: "#2E7D32",
    weight: 2,
    opacity: 1,
    color: "white",
    fillOpacity: 0.3,
  };

  const kodimStyle = {
    fillColor: "#f59e0b",
    weight: 2,
    opacity: 1,
    color: "white",
    fillOpacity: 0.5,
  };

  const boundaryStyle = {
    fillColor: "#2563eb",
    weight: 2,
    opacity: 1,
    color: "#1e40af",
    fillOpacity: 0.1,
  };

  const cityHighlightStyle = {
    fillColor: "#10b981",
    weight: 3,
    opacity: 0.9,
    color: "#059669",
    fillOpacity: 0.15,
    dashArray: "8,4",
  };

  // Style for manually adjusted polygon
  const adjustedPolygonStyle = {
    fillColor: "#ff6b35",
    weight: 3,
    opacity: 1,
    color: "#d63031",
    fillOpacity: 0.4,
    dashArray: "5,5",
  };

  // Popup content for assets with click handler (for polygons)
  const onEachAssetFeature = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties;
      const originalAsset = props.originalAsset || feature.properties;

      const popupContent = `
        <div class="yardip-asset-popup">
          <h6 class="mb-2 text-success">${
            props.pengelola || props.nama || "Unknown Asset"
          }</h6>
          <small>
            <strong>ID:</strong> ${props.id}<br/>
            <strong>Bidang:</strong> <span class="badge bg-info">${
              props.bidang || "-"
            }</span><br/>
            <strong>Status:</strong> <span class="badge bg-success">${
              props.status || "-"
            }</span><br/>
            <strong>Lokasi:</strong> ${props.kabkota || "-"}<br/>
            <strong>Luas:</strong> ${
              props.area
                ? Number(props.area).toLocaleString("id-ID") + " m²"
                : "-"
            }<br/>
            <div class="mt-2">
              <button class="btn btn-sm btn-primary" onclick="window.handleYardipAssetClick && window.handleYardipAssetClick('${
                props.id
              }')">
                Lihat Detail
              </button>
            </div>
          </small>
        </div>
      `;
      layer.bindPopup(popupContent);

      // Add click handler for the layer itself
      layer.on("click", function (e) {
        console.log("Yardip Asset clicked:", originalAsset);
        if (onAssetClick && typeof onAssetClick === "function") {
          onAssetClick(originalAsset);
        }
      });
    }
  };

  // Popup content for adjusted polygon
  const onEachAdjustedFeature = (feature, layer) => {
    if (feature.properties && feature.properties.isManuallyAdjusted) {
      const props = feature.properties;
      const popupContent = `
        <div class="adjusted-polygon-popup">
          <h6 class="mb-2 text-warning">📐 Area Disesuaikan Manual</h6>
          <small>
            <strong>Area Asli:</strong> ${props.originalArea.toFixed(2)} m²<br/>
            <strong>Area Target:</strong> ${props.targetArea.toFixed(2)} m²<br/>
            <strong>Area Aktual:</strong> ${props.actualArea.toFixed(2)} m²<br/>
            <strong>Faktor Skala:</strong> ${props.scaleFactor.toFixed(4)}<br/>
            <span class="text-muted">Polygon telah disesuaikan dengan luas manual</span>
          </small>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };

  // Create city bounds rectangle for visual reference
  const createCityBoundsGeoJSON = () => {
    if (!cityBounds || !Array.isArray(cityBounds) || cityBounds.length !== 2) {
      return null;
    }

    const [southWest, northEast] = cityBounds;
    return {
      type: "Feature",
      properties: {
        name: selectedCity,
        type: "city_bounds",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [southWest[1], southWest[0]], // SW
            [northEast[1], southWest[0]], // SE
            [northEast[1], northEast[0]], // NE
            [southWest[1], northEast[0]], // NW
            [southWest[1], southWest[0]], // Close polygon
          ],
        ],
      },
    };
  };

  // Set up global click handler for popup buttons
  useEffect(() => {
    window.handleYardipAssetClick = (assetId) => {
      console.log("Popup button clicked for yardip asset:", assetId);
      const asset = assets.find(
        (a) => a.originalAsset?.id == assetId || a.id == assetId
      );
      if (asset && onAssetClick && typeof onAssetClick === "function") {
        const originalAsset = asset.originalAsset || asset;
        onAssetClick(originalAsset);
      }
    };

    return () => {
      // Cleanup global handler
      if (window.handleYardipAssetClick) {
        delete window.handleYardipAssetClick;
      }
    };
  }, [assets, onAssetClick]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={initialZoom}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
      whenCreated={(map) => {
        mapRef.current = map;
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapSearch />

      {/* Drawing Tools */}
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onCreated={handleCreated}
          onEdited={() => {}}
          onDeleted={() => {}}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: isDrawing
              ? {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: {
                    color: "#ff0000",
                    fillColor: "#ff0000",
                    fillOpacity: 0.5,
                    weight: 2,
                  },
                }
              : false,
          }}
          edit={{
            remove: isDrawing,
            edit: isDrawing,
          }}
        />
      </FeatureGroup>

      {/* Provincial Boundaries */}
      {jatengBoundary && (
        <GeoJSON data={jatengBoundary} style={boundaryStyle} />
      )}
      {diyBoundary && <GeoJSON data={diyBoundary} style={boundaryStyle} />}

      {/* City Bounds Highlight */}
      {cityBounds && selectedCity && (
        <GeoJSON
          data={createCityBoundsGeoJSON()}
          style={cityHighlightStyle}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `
              <div class="city-bounds-popup">
                <h6 class="text-success mb-2">📍 Area Target Terpilih</h6>
                <p class="mb-1"><strong>${selectedCity}</strong></p>
                <small class="text-muted">
                  Lokasi siap untuk penambahan aset Yardip baru.<br/>
                  Gunakan tool menggambar untuk menandai area aset.
                </small>
              </div>
            `,
              {
                className: "custom-popup",
              }
            );

            setTimeout(() => {
              if (layer && layer.openPopup) {
                layer.openPopup();
                setTimeout(() => {
                  if (layer && layer.closePopup) {
                    layer.closePopup();
                  }
                }, 3000);
              }
            }, 1000);
          }}
        />
      )}

      {/* Manually Adjusted Polygon */}
      {adjustedGeometry && (
        <GeoJSON
          key={`adjusted-${manualAreaAdjustment}`}
          data={adjustedGeometry}
          style={adjustedPolygonStyle}
          onEachFeature={onEachAdjustedFeature}
        />
      )}

      {/* Conditional rendering based on displayMode */}
      {displayMode === "marker"
        ? // MARKER MODE: Show pin markers for assets
          assets.length > 0 &&
          assets.map((asset, idx) => {
            const center = getAssetCenter(asset);
            if (!center) return null;

            const originalAsset = asset.originalAsset || asset;
            const markerColor = getMarkerColor(originalAsset.status);
            const customIcon = createCustomIcon(
              markerColor,
              originalAsset.status
            );

            return (
              <Marker
                key={`yardip-marker-${originalAsset.id || idx}`}
                position={center}
                icon={customIcon}
                eventHandlers={{
                  click: () => {
                    console.log("Yardip Marker clicked:", originalAsset);
                    if (onAssetClick && typeof onAssetClick === "function") {
                      onAssetClick(originalAsset);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="yardip-marker-popup">
                    <h6 className="mb-2 text-success">
                      {originalAsset.pengelola ||
                        originalAsset.nama ||
                        "Unknown Asset"}
                    </h6>
                    <small>
                      <strong>Bidang:</strong>{" "}
                      <span className="badge bg-info">
                        {originalAsset.bidang || "-"}
                      </span>
                      <br />
                      <strong>Status:</strong>{" "}
                      <span
                        className={`badge bg-${
                          originalAsset.status === "Dimiliki/Dikuasai"
                            ? "success"
                            : originalAsset.status ===
                              "Tidak Dimiliki/Tidak Dikuasai"
                            ? "danger"
                            : originalAsset.status === "Lain-lain"
                            ? "warning"
                            : originalAsset.status === "Dalam Proses"
                            ? "info"
                            : "secondary"
                        }`}
                      >
                        {originalAsset.status || "-"}
                      </span>
                      <br />
                      <strong>Lokasi:</strong> {originalAsset.kabkota || "-"}
                      <br />
                      <strong>Luas:</strong>{" "}
                      {originalAsset.area
                        ? Number(originalAsset.area).toLocaleString("id-ID") +
                          " m²"
                        : "-"}
                      <br />
                    </small>
                  </div>
                </Popup>
              </Marker>
            );
          })
        : // POLYGON MODE: Show polygon shapes for assets (original behavior)
          assets.length > 0 &&
          assets.map((asset, idx) => {
            const geoJsonAsset = createGeoJSONFromAsset(asset);
            return geoJsonAsset ? (
              <GeoJSON
                key={`yardip-asset-${asset.id || idx}`}
                data={geoJsonAsset}
                style={(feature) => getAssetStyle(feature, markerColorMode)}
                onEachFeature={onEachAssetFeature}
              />
            ) : null;
          })}

      {/* Highlight Korem/Kodim */}
      {selectedKodim && selectedKodim.geometry && (
        <GeoJSON data={selectedKodim.geometry} style={kodimStyle} />
      )}
      {selectedKorem && selectedKorem.geometry && (
        <GeoJSON data={selectedKorem.geometry} style={koremStyle} />
      )}
    </MapContainer>
  );
};

export default PetaAsetYardip;
