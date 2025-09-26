import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON,
  useMap,
  LayersControl,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turf from "@turf/turf";
import axios from "axios";

// Fix for broken icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// --- STYLING ---
const provinceStyles = {
  "Jawa Tengah": {
    fillColor: "#2E7D32",
    color: "black",
    weight: 1,
    fillOpacity: 0.5,
  },
  "Daerah Istimewa Yogyakarta": {
    fillColor: "#FFC107",
    color: "black",
    weight: 1,
    fillOpacity: 0.5,
  },
};
const kabupatenStyle = {
  fillColor: "#0d6efd",
  color: "white",
  weight: 2,
  fillOpacity: 0.5,
};
const selectedStyle = { color: "#ffc107", weight: 4, fillOpacity: 0.3 };

// --- MAIN COMPONENT ---
const PetaGambarYardip = ({
  onPolygonCreated,
  onLocationSelect,
  isDrawingEnabled,
  assets,
  newlyDrawnGeometry,
  provinsiData,
  kabupatenData,
  mapNavigationTrigger, // NEW: prop for form-controlled navigation
}) => {
  const [view, setView] = useState({
    type: "nasional",
    name: null,
    feature: null,
  });

  const featureGroupRef = useRef(null);
  const geoJsonLayerRef = useRef(null);

  // NEW: Effect to handle form-triggered navigation
  useEffect(() => {
    if (mapNavigationTrigger && provinsiData && kabupatenData) {
      const { type, name } = mapNavigationTrigger;

      if (type === "provinsi") {
        // Find the province and navigate to it
        const provinceFeature = provinsiData.features.find(
          (f) => f.properties.PROVINCE === name
        );
        if (provinceFeature) {
          setView({ type: "provinsi", name: name, feature: null });
        }
      } else if (type === "kabupaten") {
        // Find the kabupaten and navigate to it
        const kabupatenFeature = kabupatenData.features.find(
          (f) => f.properties.Kabupaten === name
        );
        if (kabupatenFeature) {
          setView({
            type: "kabupaten",
            name: kabupatenFeature.properties.PROVINCE,
            feature: kabupatenFeature,
          });
        }
      }
    }
  }, [mapNavigationTrigger, provinsiData, kabupatenData]);

  // Effect to draw imported geometry
  useEffect(() => {
    const featureGroup = featureGroupRef.current;
    if (featureGroup) {
      featureGroup.clearLayers();
      if (newlyDrawnGeometry && newlyDrawnGeometry.type === "Polygon") {
        try {
          // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
          const latLngs = newlyDrawnGeometry.coordinates[0].map((coord) => [
            coord[1],
            coord[0],
          ]);
          const newLayer = L.polygon(latLngs, {
            color: "#ff0000", // Style it like the drawn polygon
          });
          featureGroup.addLayer(newLayer);
        } catch (e) {
          console.error("Error adding newly drawn geometry to map:", e);
        }
      }
    }
  }, [newlyDrawnGeometry]);

  // --- ZOOM CONTROLLER COMPONENT ---
  const ZoomController = ({
    view,
    newlyDrawnGeometry,
    mapNavigationTrigger,
  }) => {
    const map = useMap();

    useEffect(() => {
      const zoomToFeature = () => {
        let bounds = null;

        // Prioritize zooming to the newly drawn geometry
        if (newlyDrawnGeometry) {
          try {
            const drawnLayer = L.geoJSON(newlyDrawnGeometry);
            bounds = drawnLayer.getBounds();
          } catch (e) {
            console.error("Error creating bounds for newly drawn geometry:", e);
          }
        }

        // If no drawn geometry, fallback to the GeoJSON layer (province/kabupaten)
        if ((!bounds || !bounds.isValid()) && geoJsonLayerRef.current) {
          try {
            bounds = geoJsonLayerRef.current.getBounds();
          } catch (e) {
            console.error("Error creating bounds from geoJsonLayerRef", e);
          }
        }

        // NEW: Handle form-triggered navigation with specific bounds
        if (
          (!bounds || !bounds.isValid()) &&
          mapNavigationTrigger &&
          provinsiData &&
          kabupatenData
        ) {
          const { type, name } = mapNavigationTrigger;
          try {
            if (type === "provinsi") {
              const provinceFeature = provinsiData.features.find(
                (f) => f.properties.PROVINCE === name
              );
              if (provinceFeature) {
                const layer = L.geoJSON(provinceFeature);
                bounds = layer.getBounds();
              }
            } else if (type === "kabupaten") {
              const kabupatenFeature = kabupatenData.features.find(
                (f) => f.properties.Kabupaten === name
              );
              if (kabupatenFeature) {
                const layer = L.geoJSON(kabupatenFeature);
                bounds = layer.getBounds();
              }
            }
          } catch (e) {
            console.error("Error creating bounds for form navigation:", e);
          }
        }

        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } else if (view.type === "nasional") {
          // Fallback to default view if no bounds are valid
          map.setView([-7.5, 110.0], 8);
        }
      };

      // Delay to ensure layers are rendered
      const timer = setTimeout(zoomToFeature, 200);

      return () => clearTimeout(timer);
    }, [map, view, newlyDrawnGeometry, mapNavigationTrigger]);

    return null;
  };

  const getAssetCenter = (asset) => {
    try {
      let lokasi =
        typeof asset.lokasi === "string"
          ? JSON.parse(asset.lokasi)
          : asset.lokasi;
      if (!lokasi) return null;
      const polygon = turf.polygon(
        lokasi.type === "Polygon" ? lokasi.coordinates : lokasi
      );
      const centroid = turf.centroid(polygon);
      return [
        centroid.geometry.coordinates[1],
        centroid.geometry.coordinates[0],
      ];
    } catch (e) {
      return null;
    }
  };

  // --- RENDER EXISTING ASSETS ---
  const AssetsLayer = () => {
    const map = useMap();

    useEffect(() => {
      if (!assets || assets.length === 0) return;

      const assetLayers = L.layerGroup();

      assets.forEach((asset) => {
        try {
          let lokasi =
            typeof asset.lokasi === "string"
              ? JSON.parse(asset.lokasi)
              : asset.lokasi;
          if (lokasi) {
            const assetLayer = L.geoJSON(lokasi, {
              style: { color: "#00ff00", weight: 2, opacity: 0.7 },
            }).bindPopup(
              `<b>${asset.pengelola || "Aset"}</b><br/>Status: ${
                asset.status || "N/A"
              }`
            );
            assetLayers.addLayer(assetLayer);
          }
        } catch (e) {
          console.error("Error parsing asset location:", e);
        }
      });

      assetLayers.addTo(map);

      return () => {
        map.removeLayer(assetLayers);
      };
    }, [map, assets]);

    return null;
  };

  // --- EVENT HANDLERS ---
  const handleCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === "polygon") {
      const geojson = layer.toGeoJSON();
      const area = turf.area(geojson);
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);
      if (onPolygonCreated) {
        onPolygonCreated({ geometry: geojson.geometry, area: area });
      }
    }
  };

  const handleBackClick = () => {
    if (view.type === "kabupaten") {
      setView({ type: "provinsi", name: view.name, feature: null });
      if (onLocationSelect) onLocationSelect("provinsi", view.name);
    } else if (view.type === "provinsi") {
      setView({ type: "nasional", name: null, feature: null });
      if (onLocationSelect) onLocationSelect("nasional", null);
    }
  };

  const onEachProvinceFeature = (feature, layer) => {
    const provinceName = feature.properties.PROVINCE;
    layer.bindPopup(`<b>${provinceName}</b>`);
    layer.on({
      click: () => {
        setView({ type: "provinsi", name: provinceName, feature: null });
        if (onLocationSelect) onLocationSelect("provinsi", provinceName);
      },
    });
  };

  const onEachKabupatenFeature = (feature, layer) => {
    const { PROVINCE, Kabupaten } = feature.properties;
    layer.bindPopup(`<b>${Kabupaten}</b><br/>${PROVINCE}`);
    layer.on({
      click: () => {
        setView({ type: "kabupaten", name: PROVINCE, feature: feature });
        if (onLocationSelect) onLocationSelect("kabupaten", Kabupaten);
      },
    });
  };

  const getStyle = (feature) => {
    if (
      view.type === "kabupaten" &&
      view.feature?.properties.Kabupaten === feature.properties.Kabupaten
    ) {
      return selectedStyle;
    }
    return kabupatenStyle;
  };

  const buttonStyle = {
    position: "absolute",
    top: "10px",
    left: "50px",
    zIndex: 1000,
    padding: "8px 12px",
    backgroundColor: "white",
    border: "2px solid rgba(0,0,0,0.2)",
    borderRadius: "4px",
    cursor: "pointer",
  };

  if (!provinsiData || !kabupatenData) {
    return <div>Memuat data peta...</div>;
  }

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {view.type !== "nasional" && (
        <button onClick={handleBackClick} style={buttonStyle}>
          Kembali
        </button>
      )}
      <MapContainer
        center={[-7.5, 110.0]}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomController
          view={view}
          newlyDrawnGeometry={newlyDrawnGeometry}
          mapNavigationTrigger={mapNavigationTrigger}
        />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satelit">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
        </LayersControl>

        {!newlyDrawnGeometry && view.type === "nasional" && (
          <GeoJSON
            ref={geoJsonLayerRef}
            key="provinsi-layer"
            data={provinsiData}
            style={(feature) =>
              provinceStyles[feature.properties.PROVINCE] ||
              provinceStyles.default
            }
            onEachFeature={onEachProvinceFeature}
          />
        )}

        {!newlyDrawnGeometry && view.type === "provinsi" && (
          <GeoJSON
            ref={geoJsonLayerRef}
            key={"kabupaten-layer-" + view.name}
            data={{
              type: "FeatureCollection",
              features: kabupatenData.features.filter(
                (f) => f.properties.PROVINCE === view.name
              ),
            }}
            style={getStyle}
            onEachFeature={onEachKabupatenFeature}
          />
        )}

        {view.type === "kabupaten" && view.feature && (
          <GeoJSON
            ref={geoJsonLayerRef}
            key={"kabupaten-selected-" + view.feature.properties.Kabupaten}
            data={view.feature}
            style={getStyle}
          />
        )}

        <AssetsLayer />

        <FeatureGroup ref={featureGroupRef}>
          {isDrawingEnabled && view.type === "kabupaten" && (
            <EditControl
              position="topleft"
              onCreated={handleCreated}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: { color: "#ff0000" },
                },
              }}
              edit={{ remove: true, edit: true }}
            />
          )}
        </FeatureGroup>
      </MapContainer>
    </div>
  );
};

export default PetaGambarYardip;
