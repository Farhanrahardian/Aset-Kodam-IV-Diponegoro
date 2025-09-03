import React from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON,
  Popup,
  LayersControl,
  useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import area from "@turf/area";

// Function to convert asset location to GeoJSON feature
const assetToGeoJSON = (asset) => ({
  type: "Feature",
  properties: { ...asset },
  geometry: {
    type: "Polygon",
    coordinates: asset.lokasi,
  },
});

// Inner component to handle each polygon, its click event, and zooming
const AssetPolygon = ({ asset, style, onAssetClick }) => {
  const map = useMap();
  const geoJsonData = assetToGeoJSON(asset);

  const handleClick = () => {
    if (asset.lokasi) {
      const bounds = L.geoJSON(geoJsonData).getBounds();
      map.fitBounds(bounds, { padding: [50, 50] }); // Zoom to polygon with padding
    }
    if (onAssetClick) {
      onAssetClick(asset); // Pass asset data up to the parent component
    }
  };

  return (
    <GeoJSON
      data={geoJsonData}
      style={style}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup>
        <b>{asset.nama}</b>
        <br />
        Kodim: {asset.kodim}
        <br />
        Luas: {asset.luas ? asset.luas.toLocaleString("id-ID") : "N/A"} m²
        <br />
        Status: {asset.status}
      </Popup>
    </GeoJSON>
  );
};

const PetaAset = ({
  assets,
  isDrawing,
  onDrawingCreated,
  jatengBoundary,
  diyBoundary,
  onAssetClick, // Prop to handle click from parent
}) => {
  const mapCenter = [-7.5, 110.0];

  const _onCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === "polygon") {
      const geoJSON = layer.toGeoJSON();
      const calculatedArea = area(geoJSON);
      onDrawingCreated({
        geometry: geoJSON.geometry.coordinates,
        area: calculatedArea,
      });
    }
  };

  const assetStyle = {
    fillColor: "#2E7D32",
    weight: 2,
    opacity: 1,
    color: "white",
    fillOpacity: 0.5,
  };

  const styleJateng = {
    color: "#ff7800",
    weight: 2,
    fill: false,
  };

  const styleDIY = {
    color: "#006400",
    weight: 2,
    dashArray: "4",
    fill: false,
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
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Medan">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          />
        </LayersControl.BaseLayer>
        {jatengBoundary && (
          <LayersControl.Overlay name="Batas Jateng" checked>
            <GeoJSON data={jatengBoundary} style={styleJateng} />
          </LayersControl.Overlay>
        )}
        {diyBoundary && (
          <LayersControl.Overlay name="Batas DIY" checked>
            <GeoJSON data={diyBoundary} style={styleDIY} />
          </LayersControl.Overlay>
        )}
      </LayersControl>

      <FeatureGroup>
        {isDrawing && (
          <EditControl
            position="topleft"
            onCreated={_onCreated}
            draw={{
              polygon: {
                allowIntersection: false,
                drawError: {
                  color: "#e1e100",
                  message: "<strong>Oh snap!</strong> you can't draw that!",
                },
                shapeOptions: {
                  color: "#4CAF50",
                },
              },
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
            }}
            edit={{ remove: false, edit: false }}
          />
        )}
      </FeatureGroup>

      {/* Render existing assets as polygons using the new component */}
      {assets.map((asset) => {
        if (!asset.lokasi) return null; // Don't render assets without location
        return (
          <AssetPolygon
            key={asset.id}
            asset={asset}
            style={assetStyle}
            onAssetClick={onAssetClick}
          />
        );
      })}
    </MapContainer>
  );
};

export default PetaAset;
