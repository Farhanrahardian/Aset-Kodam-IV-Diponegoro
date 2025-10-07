import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  LayersControl,
  useMap,
  Polygon,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import axios from "axios";
import { parseLocation } from "../utils/locationUtils";

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

const createCustomIcon = (color) =>
  new L.Icon({
    iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const greenIcon = createCustomIcon("green");
const redIcon = createCustomIcon("red");
const yellowIcon = createCustomIcon("yellow");

// --- MAIN COMPONENT ---
const PetaAsetYardip = ({
  assets = [],
  onAssetClick,
  filter,
  onViewChange,
  provinsiData,
  kabupatenData,
}) => {
  const [view, setView] = useState({
    type: "nasional",
    provinsi: null,
    kabupaten: null,
    kabupatenFeature: null,
  });
  const geoJsonLayerRef = useRef(null);

  // Inject CSS for labels
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .region-label {
        pointer-events: none; /* Allow clicks to pass through */
      }
      .region-label div {
        pointer-events: auto; /* Make content clickable */
        width: 150px;
        text-align: center;
        text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white;
        font-weight: bold;
      }
      .region-label strong { font-size: 12px; }
      .region-label span { font-size: 11px; background-color: rgba(255, 255, 255, 0.7); border-radius: 3px; padding: 1px 3px; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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

  // --- ASSET COUNT CALCULATION ---
  const provinsiDataWithCount = useMemo(() => {
    if (!provinsiData || !assets) return null;
    const features = provinsiData.features.map((feature) => {
      const asset_count = assets.filter((asset) => {
        const center = getAssetCenter(asset);
        if (!center) return false;
        const point = turf.point([center[1], center[0]]);
        return turf.booleanPointInPolygon(point, feature);
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
        const point = turf.point([center[1], center[0]]);
        return turf.booleanPointInPolygon(point, feature);
      }).length;
      return { ...feature, properties: { ...feature.properties, asset_count } };
    });
    return { ...kabupatenData, features };
  }, [kabupatenData, assets]);

  // --- SYNC WITH EXTERNAL FILTER ---
  useEffect(() => {
    if (!kabupatenData) return;
    const { provinsi, kabupaten } = filter || {};
    if (provinsi && kabupaten) {
      const kabFeature = kabupatenData.features.find(
        (f) =>
          f.properties.PROVINCE === provinsi &&
          f.properties.Kabupaten === kabupaten
      );
      if (kabFeature) {
        setView({
          type: "kabupaten",
          provinsi,
          kabupaten,
          kabupatenFeature: kabFeature,
        });
      }
    } else if (provinsi) {
      setView({
        type: "provinsi",
        provinsi,
        kabupaten: null,
        kabupatenFeature: null,
      });
    } else {
      setView({
        type: "nasional",
        provinsi: null,
        kabupaten: null,
        kabupatenFeature: null,
      });
    }
  }, [filter, kabupatenData]);

  // --- ZOOM CONTROLLER COMPONENT ---
  const ZoomController = ({ view, assets }) => {
    const map = useMap();

    useEffect(() => {
      const zoomToFeature = () => {
        let bounds = null;

        // Try to get bounds from the main GeoJSON layer (province/district)
        if (geoJsonLayerRef.current) {
          try {
            bounds = geoJsonLayerRef.current.getBounds();
          } catch (e) {
            console.error("Error creating bounds from geoJsonLayerRef", e);
          }
        }

        // Extend bounds to include visible asset markers
        if (assets && assets.length > 0) {
          const assetPoints = assets.map(getAssetCenter).filter(Boolean);
          if (assetPoints.length > 0) {
            const assetsBounds = L.latLngBounds(assetPoints);
            if (bounds && bounds.isValid()) {
              bounds.extend(assetsBounds);
            } else {
              bounds = assetsBounds;
            }
          }
        }

        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15,
            animate: false,
          });
        } else if (view.type === "nasional") {
          // Fallback to default view if no bounds are valid
          map.setView([-1.5, 110.0], 8);
        }
      };

      const timer = setTimeout(zoomToFeature, 0);

      return () => clearTimeout(timer);
    }, [map, view, assets]);

    return null;
  };

  // --- EVENT HANDLERS ---
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

  const onEachProvinceFeature = (feature, layer) => {
    const provinceName = feature.properties.PROVINCE;
    layer.bindPopup(`<b>${provinceName}</b>`);
    layer.on({
      click: () => {
        const newView = {
          type: "provinsi",
          provinsi: provinceName,
          kabupaten: null,
        };
        setView({ ...newView, kabupatenFeature: null });
        if (onViewChange) onViewChange(newView);
      },
    });
  };

  const onEachKabupatenFeature = (feature, layer) => {
    const { PROVINCE, Kabupaten } = feature.properties;
    layer.bindPopup(`<b>${Kabupaten}</b><br/>${PROVINCE}`);
    layer.on({
      click: () => {
        const newView = {
          type: "kabupaten",
          provinsi: PROVINCE,
          kabupaten: Kabupaten,
        };
        setView({ ...newView, kabupatenFeature: feature });
        if (onViewChange) onViewChange(newView);
      },
    });
  };

  // --- REGION LABELS COMPONENT ---
  const RegionLabels = ({ view, provinsiData, kabupatenData }) => {
    if (view.type === "kabupaten") return null; // No labels in the most zoomed-in view

    let labels = [];

    if (view.type === "nasional" && provinsiData) {
      labels = provinsiData.features
        .map((feature) => {
          const { PROVINCE, asset_count } = feature.properties;
          if (feature.geometry) {
            const point = turf.pointOnFeature(feature);
            const coords = point.geometry.coordinates;

            // Manual adjustment for Jawa Tengah label
            if (PROVINCE === "Jawa Tengah") {
              coords[1] = coords[1] - 0.1; // Move latitude down
            }
            if (PROVINCE === "Daerah Istimewa Yogyakarta") {
              coords[1] = coords[1] + 0.05; // Move latitude up
            }

            return (
              <Marker
                key={`label-prov-${PROVINCE}`}
                position={[coords[1], coords[0]]}
                icon={L.divIcon({
                  className: "region-label",
                  html: `<div><strong>${PROVINCE}</strong><br/><span>${asset_count} Aset</span></div>`,
                  iconSize: [150, 40],
                  iconAnchor: [75, 20],
                })}
                eventHandlers={{
                  click: () => {
                    const newView = {
                      type: "provinsi",
                      provinsi: PROVINCE,
                      kabupaten: null,
                    };
                    setView({ ...newView, kabupatenFeature: null });
                    if (onViewChange) onViewChange(newView);
                  },
                }}
              />
            );
          }
          return null;
        })
        .filter(Boolean);
    }

    if (view.type === "provinsi" && kabupatenData) {
      const featuresInView = kabupatenData.features.filter(
        (f) => f.properties.PROVINCE === view.provinsi
      );
      labels = featuresInView
        .map((feature) => {
          const { PROVINCE, Kabupaten, asset_count } = feature.properties;
          if (feature.geometry) {
            const point = turf.pointOnFeature(feature);
            const coords = point.geometry.coordinates;
            return (
              <Marker
                key={`label-kab-${Kabupaten}`}
                position={[coords[1], coords[0]]}
                icon={L.divIcon({
                  className: "region-label",
                  html: `<div><strong>${Kabupaten.replace(
                    "KABUPATEN ",
                    ""
                  )}</strong><br/><span>${asset_count} Aset</span></div>`,
                  iconSize: [150, 40],
                  iconAnchor: [75, 20],
                })}
                eventHandlers={{
                  click: () => {
                    const newView = {
                      type: "kabupaten",
                      provinsi: PROVINCE,
                      kabupaten: Kabupaten,
                    };
                    setView({ ...newView, kabupatenFeature: feature });
                    if (onViewChange) onViewChange(newView);
                  },
                }}
              />
            );
          }
          return null;
        })
        .filter(Boolean);
    }

    return <>{labels}</>;
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

  if (!provinsiDataWithCount || !kabupatenDataWithCount)
    return <div>Memuat data peta...</div>;

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
        <ZoomController view={view} assets={assets} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satelit">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>
        </LayersControl>

        <RegionLabels
          view={view}
          provinsiData={provinsiDataWithCount}
          kabupatenData={kabupatenDataWithCount}
        />

        {view.type === "nasional" && (
          <GeoJSON
            ref={geoJsonLayerRef}
            key="provinsi-layer"
            data={provinsiDataWithCount}
            style={(feature) =>
              provinceStyles[feature.properties.PROVINCE] ||
              provinceStyles.default
            }
            onEachFeature={onEachProvinceFeature}
          />
        )}

        {view.type === "provinsi" && (
          <GeoJSON
            ref={geoJsonLayerRef}
            key={"kabupaten-layer-" + view.provinsi}
            data={{
              type: "FeatureCollection",
              features: kabupatenDataWithCount.features.filter(
                (f) => f.properties.PROVINCE === view.provinsi
              ),
            }}
            style={kabupatenStyle}
            onEachFeature={onEachKabupatenFeature}
          />
        )}

        {view.type === "kabupaten" && view.kabupatenFeature && (
          <GeoJSON
            ref={geoJsonLayerRef}
            key={"kabupaten-selected-" + view.kabupaten}
            data={view.kabupatenFeature}
            style={selectedStyle}
          />
        )}

        {view.type === "kabupaten" &&
          assets.map((asset) => {
            const center = getAssetCenter(asset);
            if (!center) return null;
            let markerIcon = yellowIcon;
            if (asset.status === "Dimiliki/Dikuasai") markerIcon = greenIcon;
            else if (asset.status === "Tidak Dimiliki/Tidak Dikuasai")
              markerIcon = redIcon;
            return (
              <Marker
                key={asset.id}
                position={center}
                icon={markerIcon}
                eventHandlers={{
                  click: () => onAssetClick && onAssetClick(asset),
                }}
              >
                <Popup>
                  <b>{asset.pengelola || "Aset"}</b>
                  <br />
                  Status: {asset.status || "N/A"}
                  <br />
                  Luas:{" "}
                  {asset.area
                    ? `${Number(asset.area).toLocaleString("id-ID")} m²`
                    : "N/A"}
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default PetaAsetYardip;
