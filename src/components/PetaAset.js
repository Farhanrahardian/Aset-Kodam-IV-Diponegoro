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

// Improved coordinate validation
const validateCoordinates = (coords) => {
  if (!Array.isArray(coords)) return false;

  for (const coord of coords) {
    if (!Array.isArray(coord) || coord.length !== 2) return false;
    if (typeof coord[0] !== "number" || typeof coord[1] !== "number")
      return false;
    if (isNaN(coord[0]) || isNaN(coord[1])) return false;
    if (!isFinite(coord[0]) || !isFinite(coord[1])) return false;
  }
  return true;
};

// Safe asset to GeoJSON conversion with validation
const assetToGeoJSON = (asset) => {
  if (!asset || !asset.lokasi) {
    console.warn("Asset missing lokasi data:", asset?.id);
    return null;
  }

  let coordinates = asset.lokasi;

  // Handle different coordinate formats
  if (Array.isArray(coordinates)) {
    // Check if coordinates need wrapping
    if (coordinates.length > 0 && Array.isArray(coordinates[0])) {
      if (typeof coordinates[0][0] === "number") {
        // Format: [[lng,lat], [lng,lat], ...] - needs wrapping
        if (!validateCoordinates(coordinates)) {
          console.warn("Invalid coordinates for asset:", asset.id, coordinates);
          return null;
        }
        coordinates = [coordinates];
      } else if (Array.isArray(coordinates[0][0])) {
        // Format: [[[lng,lat], [lng,lat], ...]] - check inner array
        if (!validateCoordinates(coordinates[0])) {
          console.warn(
            "Invalid nested coordinates for asset:",
            asset.id,
            coordinates[0]
          );
          return null;
        }
      } else {
        console.warn(
          "Unrecognized coordinate structure for asset:",
          asset.id,
          coordinates
        );
        return null;
      }
    } else {
      console.warn("Empty or invalid coordinate array for asset:", asset.id);
      return null;
    }
  } else {
    console.warn(
      "Invalid coordinate format for asset:",
      asset.id,
      typeof coordinates
    );
    return null;
  }

  try {
    return {
      type: "Feature",
      properties: { ...asset },
      geometry: {
        type: "Polygon",
        coordinates: coordinates,
      },
    };
  } catch (error) {
    console.error("Error creating GeoJSON for asset:", asset.id, error);
    return null;
  }
};

const asetIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const selectedAsetIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2776/2776067.png", // Different icon for selected
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// Safe centroid calculation with better error handling
const getCentroid = (lokasiData) => {
  if (!lokasiData) return null;

  let coordinates;

  try {
    // Handle string input
    if (typeof lokasiData === "string") {
      coordinates = JSON.parse(lokasiData);
    } else {
      coordinates = lokasiData;
    }

    // Extract coordinate array from various formats
    let coordArray = null;

    if (Array.isArray(coordinates)) {
      if (coordinates.length > 0) {
        if (Array.isArray(coordinates[0])) {
          if (typeof coordinates[0][0] === "number") {
            // Format: [[lng,lat], [lng,lat], ...]
            coordArray = coordinates;
          } else if (Array.isArray(coordinates[0][0])) {
            // Format: [[[lng,lat], [lng,lat], ...]]
            coordArray = coordinates[0];
          }
        }
      }
    } else if (coordinates.type === "Polygon" && coordinates.coordinates) {
      // GeoJSON format
      coordArray = coordinates.coordinates[0];
    } else if (
      coordinates.coordinates &&
      Array.isArray(coordinates.coordinates[0])
    ) {
      // Wrapped coordinates
      coordArray = coordinates.coordinates[0];
    }

    if (!validateCoordinates(coordArray)) {
      console.warn("Invalid coordinates for centroid calculation:", coordArray);
      return null;
    }

    // Calculate centroid
    let x = 0,
      y = 0,
      validPoints = 0;

    for (const coord of coordArray) {
      x += coord[0]; // longitude
      y += coord[1]; // latitude
      validPoints++;
    }

    if (validPoints === 0) {
      return null;
    }

    const centroid = [y / validPoints, x / validPoints];

    // Validate centroid coordinates
    if (
      isNaN(centroid[0]) ||
      isNaN(centroid[1]) ||
      !isFinite(centroid[0]) ||
      !isFinite(centroid[1])
    ) {
      console.warn("Invalid centroid calculated:", centroid);
      return null;
    }

    return centroid;
  } catch (e) {
    console.error("Error calculating centroid:", e, lokasiData);
    return null;
  }
};

// --- Child Components ---

const AssetPolygon = ({ asset, style, onAssetClick, showMarker = false }) => {
  const map = useMap();
  const geoJsonData = assetToGeoJSON(asset);
  const centroid = getCentroid(asset.lokasi);

  if (!geoJsonData) {
    console.warn("Could not create GeoJSON for asset:", asset.id);
    return null;
  }

  const handleClick = () => {
    if (asset.lokasi) {
      try {
        const layer = L.geoJSON(geoJsonData);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error("Error fitting bounds for asset:", asset.id, e);
      }
    }
    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  return (
    <>
      <GeoJSON
        key={`polygon-${asset.id}`}
        data={geoJsonData}
        style={style}
        eventHandlers={{ click: handleClick }}
      >
        <Popup>
          <div>
            <strong>{asset.nama}</strong>
            <br />
            Luas:{" "}
            {asset.luas ? Number(asset.luas).toLocaleString("id-ID") : "N/A"} m²
            <br />
            Status: {asset.status || "N/A"}
            <br />
            {asset.alamat && <span>Alamat: {asset.alamat}</span>}
          </div>
        </Popup>
      </GeoJSON>

      {/* Show marker on polygon when specified */}
      {showMarker && centroid && (
        <Marker
          key={`polygon-marker-${asset.id}`}
          position={centroid}
          icon={selectedAsetIcon}
          eventHandlers={{ click: handleClick }}
        >
          <Popup>
            <div>
              <strong>{asset.nama}</strong>
              <br />
              Status: {asset.status || "N/A"}
              <br />
              Luas:{" "}
              {asset.luas
                ? Number(asset.luas).toLocaleString("id-ID")
                : "N/A"}{" "}
              m²
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

const AssetMarker = ({ asset, onAssetClick }) => {
  const map = useMap();
  const centroid = getCentroid(asset.lokasi);

  if (!centroid) {
    console.warn("Could not calculate centroid for asset:", asset.id);
    return null;
  }

  const handleClick = () => {
    const geoJsonData = assetToGeoJSON(asset);
    if (geoJsonData) {
      try {
        const layer = L.geoJSON(geoJsonData);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error("Error fitting bounds for asset:", asset.id, e);
      }
    }

    if (onAssetClick) {
      onAssetClick(asset);
    }
  };

  return (
    <Marker
      key={`marker-${asset.id}`}
      position={centroid}
      icon={asetIcon}
      eventHandlers={{ click: handleClick }}
    >
      <Popup>
        <div>
          <strong>{asset.nama}</strong>
          <br />
          Status: {asset.status || "N/A"}
          <br />
          Luas:{" "}
          {asset.luas ? Number(asset.luas).toLocaleString("id-ID") : "N/A"} m²
        </div>
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
  isDrawing = false,
  onDrawingCreated,
  jatengBoundary,
  diyBoundary,
}) => {
  const mapCenter = [-7.5, 110.0];

  console.log("PetaAset render:", {
    assetsCount: assets.length,
    tampilan,
    isDrawing,
    selectedAsset: asetPilihan?.id || null,
  });

  // Filter and validate assets before rendering
  const validAssets = assets.filter((asset) => {
    if (!asset || !asset.lokasi) return false;

    try {
      const geoJsonData = assetToGeoJSON(asset);
      return geoJsonData !== null;
    } catch (e) {
      console.warn("Asset failed validation:", asset.id, e);
      return false;
    }
  });

  console.log(
    `Valid assets for rendering: ${validAssets.length} / ${assets.length}`
  );

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
    fillOpacity: 0.8,
  };

  const styleJateng = {
    color: "#ff7800",
    weight: 2,
    fill: false,
    opacity: 0.8,
  };

  const styleDIY = {
    color: "#006400",
    weight: 2,
    dashArray: "4",
    fill: false,
    opacity: 0.8,
  };

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

      {/* Province boundaries */}
      {jatengBoundary && (
        <GeoJSON
          key="jateng-boundary"
          data={jatengBoundary}
          style={styleJateng}
        />
      )}
      {diyBoundary && (
        <GeoJSON key="diy-boundary" data={diyBoundary} style={styleDIY} />
      )}

      {/* Drawing mode */}
      {isDrawing ? (
        <FeatureGroup>
          <EditControl
            position="topleft"
            // Di PetaAset.js, ganti handler onCreated di EditControl dengan ini:

            // Di PetaAset.js, ganti handler onCreated di EditControl dengan ini:

            onCreated={(e) => {
              console.log("PetaAset onCreated:", e);

              const { layerType, layer } = e;

              if (layerType === "polygon" && onDrawingCreated) {
                try {
                  const geoJSON = layer.toGeoJSON();
                  const calculatedArea = area(geoJSON);

                  console.log("GeoJSON:", geoJSON);
                  console.log("Area:", calculatedArea);

                  onDrawingCreated({
                    geometry: geoJSON.geometry,
                    area: calculatedArea,
                    type: "polygon",
                  });
                } catch (error) {
                  console.error("Error in PetaAset onCreated:", error);
                }
              }
            }}
            onDeleted={(e) => {
              console.log("Drawing deleted:", e);
              // Handle polygon deletion if needed
            }}
            draw={{
              polygon: {
                shapeOptions: {
                  color: "#4CAF50",
                  weight: 2,
                  fillOpacity: 0.5,
                },
                allowIntersection: false,
                showArea: true,
                metric: true,
              },
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
            }}
            edit={{
              remove: true, // Allow deletion
              edit: false, // Disable editing for now
            }}
          />

          {/* Render existing assets in drawing mode with reduced opacity */}
          {validAssets.map((asset) => {
            const isSelected = asetPilihan && asset.id === asetPilihan.id;
            const drawingModeStyle = isSelected
              ? { ...selectedStyle, fillOpacity: 0.3, opacity: 0.6 }
              : { ...defaultStyle, fillOpacity: 0.2, opacity: 0.4 };

            if (tampilan === "titik") {
              return (
                <AssetMarker
                  key={`draw-marker-${asset.id}`}
                  asset={asset}
                  onAssetClick={onAssetClick}
                />
              );
            } else {
              return (
                <AssetPolygon
                  key={`draw-polygon-${asset.id}`}
                  asset={asset}
                  style={drawingModeStyle}
                  onAssetClick={onAssetClick}
                  showMarker={isSelected}
                />
              );
            }
          })}
        </FeatureGroup>
      ) : (
        /* Normal display mode */
        validAssets.map((asset) => {
          const isSelected = asetPilihan && asset.id === asetPilihan.id;
          const style = isSelected ? selectedStyle : defaultStyle;

          if (tampilan === "titik") {
            // In marker mode, show selected asset as polygon + marker
            if (isSelected) {
              return (
                <AssetPolygon
                  key={`selected-polygon-${asset.id}`}
                  asset={asset}
                  style={selectedStyle}
                  onAssetClick={onAssetClick}
                  showMarker={true}
                />
              );
            } else {
              return (
                <AssetMarker
                  key={`marker-${asset.id}`}
                  asset={asset}
                  onAssetClick={onAssetClick}
                />
              );
            }
          } else {
            // In polygon mode, always show polygons
            return (
              <AssetPolygon
                key={`polygon-${asset.id}`}
                asset={asset}
                style={style}
                onAssetClick={onAssetClick}
                showMarker={isSelected}
              />
            );
          }
        })
      )}
    </MapContainer>
  );
};

export default PetaAset;
