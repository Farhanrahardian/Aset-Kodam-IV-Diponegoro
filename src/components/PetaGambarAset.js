import React, { useEffect, useRef } from "react";
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

// Fix for broken icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

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

const PetaGambarAset = ({
  onPolygonCreated,
  selectedKorem,
  selectedKodim,
  isLocationSelected,
}) => {
  const mapRef = useRef(null);
  const featureGroupRef = useRef(null);

  const mapCenter = [-7.5, 110.0]; // Center of Central Java
  const initialZoom = 8;

  // Auto-zoom to selected area
  useEffect(() => {
    if (mapRef.current) {
      if (selectedKodim && selectedKodim.geometry) {
        const kodimLayer = L.geoJSON(selectedKodim.geometry);
        mapRef.current.fitBounds(kodimLayer.getBounds());
      } else if (selectedKorem && selectedKorem.geometry) {
        const koremLayer = L.geoJSON(selectedKorem.geometry);
        mapRef.current.fitBounds(koremLayer.getBounds());
      }
    }
  }, [selectedKorem, selectedKodim]);

  const handleCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === "polygon") {
      const geojson = layer.toGeoJSON();
      const area = turf.area(geojson);

      // Clear previous drawings
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);

      onPolygonCreated({
        geometry: geojson.geometry,
        area: area,
      });
    }
  };

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

  return (
    <MapContainer
      center={mapCenter}
      zoom={initialZoom}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapSearch />
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
        <LayersControl.BaseLayer name="Topografi">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <FeatureGroup ref={featureGroupRef}>
        {isLocationSelected && (
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

      {selectedKodim && selectedKodim.geometry && (
        <GeoJSON data={selectedKodim.geometry} style={kodimStyle} />
      )}
    </MapContainer>
  );
};

export default PetaGambarAset;
