import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON,
  useMap,
  LayersControl,
} from "react-leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turf from "@turf/turf";
import axios from "axios";
import { normalizeKodimName } from "../utils/kodimUtils";

// Fix for broken icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Define styles outside the component to prevent re-creation on re-renders
// Helper function to generate a color from a string
const stringToColor = (str) => {
  if (!str) return "#000000"; // Default color for null or empty strings
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

const kodimStyle = {
  fillColor: "#f59e0b",
  weight: 2,
  opacity: 1,
  color: "white",
  fillOpacity: 0.5,
};
const selectedStyle = {
  fillColor: "#1976d2", // Blue fill
  fillOpacity: 0.2, // Highly transparent
  weight: 4, // Thicker border
  opacity: 1,
  color: "#1976d2", // Blue border
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
      animateZoom: false,
      keepResult: true,
    });

    map.addControl(searchControl);

    return () => {
      map.removeControl(searchControl);
    };
  }, [map]);

  return null;
};

const MapController = ({
  selectedKorem,
  selectedKodim,
  koremBoundaries,
  kodimBoundaries,
  resetSelectedLayer,
  importedGeometry,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!koremBoundaries) return;

    const timer = setTimeout(() => {
      if (importedGeometry) {
        try {
          const layer = L.geoJSON(importedGeometry);
          map.fitBounds(layer.getBounds(), { padding: [50, 50], animate: true });
        } catch (e) {
          console.error("Error fitting bounds to imported geometry:", e);
        }
        return;
      }

      if (selectedKodim && kodimBoundaries) {
        const kodimFeature = kodimBoundaries.features.find((f) => {
          const featureName = normalizeKodimName(f.properties.listkodim_Kodim);
          const searchName = selectedKodim.nama;
          if (searchName === "Kodim 0733/Kota Semarang") {
            return f.properties.listkodim_Korem === "Berdiri Sendiri";
          }
          return featureName === searchName;
        });
        if (kodimFeature) {
          try {
            const layer = L.geoJSON(kodimFeature);
            map.fitBounds(layer.getBounds(), { animate: true });
          } catch (error) {
            console.error("Error fitting bounds for kodim:", error);
          }
        }
        return;
      }

      if (selectedKorem && koremBoundaries) {
        const koremNameToSearch =
          selectedKorem.nama === "Kodim 0733/Kota Semarang"
            ? "Berdiri Sendiri"
            : selectedKorem.nama;

        const koremFeatures = koremBoundaries.features.filter(
          (f) => f.properties.listkodim_Korem === koremNameToSearch
        );
        if (koremFeatures.length > 0) {
          try {
            const featureGroup = L.featureGroup(
              koremFeatures.map((f) => L.geoJSON(f))
            );
            map.fitBounds(featureGroup.getBounds(), { animate: true });
          } catch (error) {
            console.error("Error fitting bounds for korem:", error);
          }
        }
        return;
      }

      try {
        const allKoremLayer = L.geoJSON(koremBoundaries);
        map.fitBounds(allKoremLayer.getBounds(), { animate: true });
      } catch (error) {
        console.error("Error fitting bounds for all korems:", error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [importedGeometry, selectedKorem, selectedKodim, koremBoundaries, kodimBoundaries, map]);

  return null;
};

const PetaGambarAset = ({
  onPolygonCreated,
  selectedKorem,
  selectedKodim,
  isLocationSelected,
  onLocationSelect,
  importedGeometry,
  geoJsonKey, // Terima key prop
  koremBoundaries,
  kodimBoundaries,
}) => {
  const featureGroupRef = useRef(null);
  const selectedLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(true);

  const mapCenter = [-7.5, 110.0];
  const initialZoom = 8;

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .leaflet-control-zoom, .leaflet-control-layers, .leaflet-control-geosearch, 
      .leaflet-draw, .leaflet-draw-toolbar, .leaflet-control-attribution, .leaflet-control {
        z-index: 500 !important;
      }
      .leaflet-control-layers-expanded, .leaflet-geosearch .results {
        z-index: 501 !important;
      }
      .leaflet-popup { z-index: 1002 !important; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);



  const resetSelectedLayer = useCallback(() => {
    if (selectedLayerRef.current) {
      if (selectedLayerRef.current.feature && selectedLayerRef.current.feature.properties) {
        const properties = selectedLayerRef.current.feature.properties;
        if (properties.listkodim_Kodim) {
          selectedLayerRef.current.setStyle(kodimStyle);
        } else if (properties.listkodim_Korem) {
          const koremName = properties.listkodim_Korem;
          const color = stringToColor(koremName);
          selectedLayerRef.current.setStyle({
            fillColor: color,
            weight: 2,
            opacity: 1,
            color: "white",
            fillOpacity: 0.5,
          });
        }
      }
      selectedLayerRef.current = null;
    }
  }, []);

  const onKoremEachFeature = useCallback((feature, layer) => {
    const koremName = feature.properties.listkodim_Korem;
    const displayKoremName = koremName === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : koremName;
    if (displayKoremName) {
      layer.bindPopup(`<b>KOREM:</b><br/>${displayKoremName}`);
    }
    layer.on({
      click: () => {
        if (koremName === "Berdiri Sendiri") {
          onLocationSelect && onLocationSelect("KODIM", "Kodim 0733/Kota Semarang", "Kodim 0733/Kota Semarang");
        } else {
          const finalKoremName = koremName === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : koremName;
          onLocationSelect && onLocationSelect("KOREM", finalKoremName, null);
        }
      },
    });
  }, [onLocationSelect]);

  const onKodimEachFeature = useCallback((feature, layer) => {
    const kodimName = normalizeKodimName(feature.properties.listkodim_Kodim);
    const koremName = feature.properties.listkodim_Korem;
    const displayKodimName = kodimName.includes("Semarang") ? "Kodim 0733/Kota Semarang" : kodimName;
    const displayKoremName = koremName === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : koremName;
    if (displayKodimName && displayKoremName) {
      layer.bindPopup(`<b>KODIM:</b> ${displayKodimName}<br/><b>KOREM:</b> ${displayKoremName}`);
    }
    layer.on({
      click: () => {
        resetSelectedLayer();
        layer.setStyle(selectedStyle);
        selectedLayerRef.current = layer;
        if (kodimName.includes("Semarang") || koremName === "Berdiri Sendiri" || kodimName === "Kodim 0733/Semarang (BS)") {
          onLocationSelect && onLocationSelect("KODIM", "Kodim 0733/Kota Semarang", "Kodim 0733/Kota Semarang");
        } else {
          const finalKoremName = koremName === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : koremName;
          const finalKodimName = kodimName.includes("Semarang") ? "Kodim 0733/Kota Semarang" : kodimName;
          onLocationSelect && onLocationSelect("KODIM", finalKoremName, finalKodimName);
        }
      },
    });
  }, [resetSelectedLayer, onLocationSelect]);

  const handleCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === "polygon") {
      const geojson = layer.toGeoJSON();
      const area = turf.area(geojson);
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);
      onPolygonCreated({ geometry: geojson.geometry, area: area });
    }
  };

  const handleBackToKorem = () => {
    onLocationSelect && onLocationSelect("KOREM", null, null);
  };

  const handleBackToKoremView = () => {
    if (selectedKorem) {
      const koremName = selectedKorem.nama === "Kodim 0733/Kota Semarang" ? "Berdiri Sendiri" : selectedKorem.nama;
      onLocationSelect && onLocationSelect("KOREM", koremName, null);
    }
  };

  const buttonStyle = {
    position: "absolute",
    top: "10px",
    left: "50px",
    zIndex: 1000,
    padding: "6px 10px",
    fontSize: "14px",
    backgroundColor: "white",
    border: "2px solid rgba(0,0,0,0.2)",
    borderRadius: "4px",
    cursor: "pointer",
  };

  const filteredKodimData = useMemo(() => {
    return selectedKorem && kodimBoundaries
      ? {
          ...kodimBoundaries,
          features: kodimBoundaries.features.filter((feature) => {
            const featureKoremName = feature.properties.listkodim_Korem;
            const featureKodimName = normalizeKodimName(
              feature.properties.listkodim_Kodim
            );
            const isKoremMatch =
              selectedKorem.nama === "Kodim 0733/Kota Semarang"
                ? featureKoremName === "Berdiri Sendiri"
                : featureKoremName === selectedKorem.nama;
            if (!isKoremMatch) return false;
            if (selectedKodim && selectedKodim.nama) {
              const searchName = selectedKodim.nama;
              if (searchName === "Kodim 0733/Kota Semarang") {
                return featureKodimName.includes("Semarang");
              }
              return featureKodimName === searchName;
            }
            return true;
          }),
        }
      : null;
  }, [selectedKorem, selectedKodim, kodimBoundaries]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        center={mapCenter}
        zoom={initialZoom}
        style={{ height: "100%", width: "100%" }}
        maxZoom={22}
        zoomAnimation={true}
        fadeAnimation={false}
        markerZoomAnimation={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapSearch />

        {mapReady && (
          <MapController
            selectedKorem={selectedKorem}
            selectedKodim={selectedKodim}
            koremBoundaries={koremBoundaries}
            kodimBoundaries={kodimBoundaries}
            resetSelectedLayer={resetSelectedLayer}
            importedGeometry={importedGeometry}
          />
        )}

        {importedGeometry && (
          <GeoJSON key={geoJsonKey} data={importedGeometry} style={{ color: "#00FFFF", weight: 4 }} />
        )}

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={21}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satelit">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={21}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topografi">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          {!importedGeometry && !selectedKorem && koremBoundaries && mapReady && (
            <LayersControl.Overlay checked name="Area KOREM">
              <GeoJSON
                data={koremBoundaries}
                style={(feature) => {
                  const koremName = feature.properties.listkodim_Korem;
                  const color = stringToColor(koremName);
                  return {
                    fillColor: color,
                    weight: 2,
                    opacity: 1,
                    color: "white",
                    fillOpacity: 0.5, // Increased opacity to make colors more visible
                  };
                }}
                onEachFeature={onKoremEachFeature}
              />
            </LayersControl.Overlay>
          )}

          {!importedGeometry && filteredKodimData && mapReady && (
            <LayersControl.Overlay checked name="Area KODIM">
              <GeoJSON
                key={selectedKodim ? selectedKodim.nama : selectedKorem.id}
                data={filteredKodimData}
                style={selectedKodim ? selectedStyle : kodimStyle}
                onEachFeature={onKodimEachFeature}
              />
            </LayersControl.Overlay>
          )}
        </LayersControl>
        <FeatureGroup ref={featureGroupRef}>
          {isLocationSelected && !importedGeometry && (
            <EditControl
              position="topleft"
              onCreated={handleCreated}
              onEdited={() => {}}
              onDeleted={() => {}}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: {
                    color: "#ff0000",
                  },
                },
              }}
            />
          )}
        </FeatureGroup>
      </MapContainer>
      {selectedKorem && !selectedKodim && (
        <button onClick={handleBackToKorem} style={buttonStyle}>
          Kembali
        </button>
      )}
      {selectedKodim && selectedKorem && (
        <button
          onClick={
            selectedKorem.nama === "Kodim 0733/Kota Semarang" ||
            selectedKorem.nama === "Berdiri Sendiri"
              ? handleBackToKorem
              : handleBackToKoremView
          }
          style={buttonStyle}
        >
          Kembali
        </button>
      )}
    </div>
  );
};

export default React.memo(PetaGambarAset);
