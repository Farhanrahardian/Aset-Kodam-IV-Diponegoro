import React from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON,
  Popup,
  LayersControl,
  useMap,
  Marker,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import area from "@turf/area";

// --- Helper Functions & Components ---

const assetToGeoJSON = (asset) => ({
  type: "Feature",
  properties: { ...asset },
  geometry: {
    type: "Polygon",
    coordinates: asset.lokasi,
  },
});

const asetIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const getCentroid = (lokasiData) => {
  if (!lokasiData) return null;

  let geometry;

  if (typeof lokasiData === "string") {
    try {
      geometry = JSON.parse(lokasiData);
    } catch (e) {
      return null;
    }
  } else {
    geometry = lokasiData;
  }

  let coords;
  if (geometry.type === "Polygon" && geometry.coordinates) {
    coords = geometry.coordinates[0];
  } else if (
    geometry.geometry &&
    geometry.geometry.type === "Polygon" &&
    geometry.geometry.coordinates
  ) {
    coords = geometry.geometry.coordinates[0];
  } else if (
    Array.isArray(geometry) &&
    Array.isArray(geometry[0]) &&
    Array.isArray(geometry[0][0])
  ) {
    coords = geometry[0];
  } else if (geometry.coordinates && Array.isArray(geometry.coordinates[0])) {
    coords = geometry.coordinates[0];
  } else {
    return null;
  }

  if (!coords || !Array.isArray(coords) || coords.length === 0) {
    return null;
  }

  let x = 0,
    y = 0,
    len = coords.length;
  for (const coord of coords) {
    if (Array.isArray(coord) && coord.length === 2) {
      x += coord[0];
      y += coord[1];
    } else {
      return null;
    }
  }

  return [y / len, x / len];
};

// --- Child Components ---

const AssetPolygon = ({ asset, style, onAssetClick }) => {
  const map = useMap();
  const geoJsonData = assetToGeoJSON(asset);

  const handleClick = () => {
    if (asset.lokasi) {
      const layer = L.geoJSON(geoJsonData);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  return (
    <GeoJSON
      data={geoJsonData}
      style={style}
      eventHandlers={{ click: handleClick }}
    >
      <Popup>
        <b>{asset.nama}</b>
        <br />
        Luas: {asset.luas ? asset.luas.toLocaleString("id-ID") : "N/A"} m²
      </Popup>
    </GeoJSON>
  );
};

const AssetMarker = ({ asset, onAssetClick }) => {
  const map = useMap();
  const centroid = getCentroid(asset.lokasi);

  if (!centroid) return null;

  const handleClick = () => {
    const geoJsonData = assetToGeoJSON(asset);
    const layer = L.geoJSON(geoJsonData);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  return (
    <Marker
      position={centroid}
      icon={asetIcon}
      eventHandlers={{ click: handleClick }}
    >
      <Popup>
        <b>{asset.nama}</b>
      </Popup>
    </Marker>
  );
};

// --- Main Component ---

const PetaAset = ({
  assets = [],
  tampilan = "poligon",
  asetPilihan = null,
  onAssetClick,
  isDrawing,
  onDrawingCreated,
  jatengBoundary,
  diyBoundary,
}) => {
  const mapCenter = [-7.5, 110.0];

  const defaultStyle = {
    fillColor: "#2E7D32",
    weight: 2,
    opacity: 1,
    color: "white",
    fillOpacity: 0.6,
  };

  const selectedStyle = {
    fillColor: "#f59e0b",
    weight: 3,
    opacity: 1,
    color: "#f59e0b",
    fillOpacity: 0.7,
  };

  const styleJateng = { color: "#ff7800", weight: 2, fill: false };
  const styleDIY = { color: "#006400", weight: 2, dashArray: "4", fill: false };

  return (
    <MapContainer
      center={mapCenter}
      zoom={8}
      style={{ height: "100%", width: "100%" }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street Map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satelit">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {jatengBoundary && <GeoJSON data={jatengBoundary} style={styleJateng} />}
      {diyBoundary && <GeoJSON data={diyBoundary} style={styleDIY} />}

      {isDrawing ? (
        <FeatureGroup>
          <EditControl
            position="topleft"
            onCreated={(e) => {
              const { layerType, layer } = e;
              if (layerType === "polygon" && onDrawingCreated) {
                const geoJSON = layer.toGeoJSON();
                const calculatedArea = area(geoJSON);
                onDrawingCreated({
                  geometry: geoJSON.geometry.coordinates,
                  area: calculatedArea,
                });
              }
            }}
            draw={{
              polygon: { shapeOptions: { color: "#4CAF50" } },
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
            }}
            edit={{ remove: false, edit: false }}
          />

          {/* aset ikut dimasukkan ke dalam FeatureGroup supaya tetap muncul saat edit */}
          {assets.map((asset) => {
            if (!asset.lokasi) return null;

            const isSelected = asetPilihan && asset.id === asetPilihan.id;

            if (isSelected) {
              return (
                <AssetPolygon
                  key={asset.id + "-selected"}
                  asset={asset}
                  style={selectedStyle}
                  onAssetClick={onAssetClick}
                />
              );
            }

            if (tampilan === "titik") {
              return (
                <AssetMarker
                  key={asset.id}
                  asset={asset}
                  onAssetClick={onAssetClick}
                />
              );
            } else {
              return (
                <AssetPolygon
                  key={asset.id}
                  asset={asset}
                  style={defaultStyle}
                  onAssetClick={onAssetClick}
                />
              );
            }
          })}
        </FeatureGroup>
      ) : (
        <>
          {assets.map((asset) => {
            if (!asset.lokasi) return null;

            const isSelected = asetPilihan && asset.id === asetPilihan.id;

            if (isSelected) {
              return (
                <AssetPolygon
                  key={asset.id + "-selected"}
                  asset={asset}
                  style={selectedStyle}
                  onAssetClick={onAssetClick}
                />
              );
            }

            if (tampilan === "titik") {
              return (
                <AssetMarker
                  key={asset.id}
                  asset={asset}
                  onAssetClick={onAssetClick}
                />
              );
            } else {
              return (
                <AssetPolygon
                  key={asset.id}
                  asset={asset}
                  style={defaultStyle}
                  onAssetClick={onAssetClick}
                />
              );
            }
          })}
        </>
      )}
    </MapContainer>
  );
};

export default PetaAset;
