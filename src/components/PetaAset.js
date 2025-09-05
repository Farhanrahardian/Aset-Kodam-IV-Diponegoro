import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  LayersControl,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Helper functions to handle asset display ---
const validateCoordinates = (coords) => {
  if (!Array.isArray(coords)) return false;
  for (const coord of coords) {
    if (!Array.isArray(coord) || coord.length !== 2 || typeof coord[0] !== 'number' || typeof coord[1] !== 'number' || isNaN(coord[0]) || isNaN(coord[1])) return false;
  }
  return true;
};

const getCentroid = (lokasiData) => {
    if (!lokasiData) return null;
    let coordinates;
    try {
        coordinates = typeof lokasiData === 'string' ? JSON.parse(lokasiData) : lokasiData;
        let coordArray = coordinates[0];
        if (!validateCoordinates(coordArray)) return null;
        let x = 0, y = 0;
        for (const coord of coordArray) {
            x += coord[0];
            y += coord[1];
        }
        return [y / coordArray.length, x / coordArray.length];
    } catch (e) {
        return null;
    }
};

const AssetMarker = ({ asset, onAssetClick, isSelected }) => {
  const centroid = getCentroid(asset.lokasi);
  if (!centroid) return null;

  const icon = isSelected ? new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png',
    iconSize: [35, 35], 
  }) : new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
    iconSize: [30, 30],
  });

  return (
    <Marker position={centroid} icon={icon} eventHandlers={{ click: () => onAssetClick(asset) }}>
      <Popup>
        <strong>{asset.nama}</strong><br/>
        Status: {asset.status || 'N/A'}
      </Popup>
    </Marker>
  );
};

// --- Main Component ---
const PetaAset = ({ assets = [], onAssetClick, asetPilihan }) => {
  const [mapView, setMapView] = useState("korem"); // 'korem' atau 'kodim'
  const [selectedKorem, setSelectedKorem] = useState(null);
  const [filteredKodim, setFilteredKodim] = useState(null);
  
  const [koremData, setKoremData] = useState(null);
  const [kodimData, setKodimData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef(null);

  const mapCenter = [-7.5, 110.0];
  const initialZoom = 8;

  useEffect(() => {
    Promise.all([
      fetch("/data/korem.geojson").then(res => res.json()),
      fetch("/data/Kodim.geojson").then(res => res.json())
    ]).then(([korem, kodim]) => {
      setKoremData(korem);
      setKodimData(kodim);
    }).catch(e => {
      console.error("Gagal memuat data GeoJSON:", e);
      setError(e.message);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (mapView === "kodim" && selectedKorem && kodimData) {
      const kodimsInKorem = kodimData.features.filter(kodim => {
        return (
          kodim &&
          kodim.properties &&
          kodim.properties.listkodim_Korem &&
          selectedKorem &&
          selectedKorem.properties &&
          kodim.properties.listkodim_Korem === selectedKorem.properties.listkodim_Korem
        );
      });
      setFilteredKodim({
        type: "FeatureCollection",
        features: kodimsInKorem,
      });
    } else {
      setFilteredKodim(null);
    }
  }, [mapView, selectedKorem, kodimData]);

  const handleKoremClick = (e) => {
    const layer = e.target;
    const feature = e.target.feature;
    setSelectedKorem(feature);
    setMapView("kodim");
    if (mapRef.current) {
      mapRef.current.fitBounds(layer.getBounds());
    }
  };

  const handleKodimClick = (e) => {
    const layer = e.target;
    if (mapRef.current) {
      mapRef.current.fitBounds(layer.getBounds());
    }
  };

  const resetView = () => {
    setMapView("korem");
    setSelectedKorem(null);
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, initialZoom);
    }
  };

  const koremStyle = {
    fillColor: "#2E7D32",
    weight: 2,
    opacity: 1,
    color: "white",
    fillOpacity: 0.5,
  };

  const kodimStyle = {
    fillColor: "#f59e0b",
    weight: 2,
    opacity: 1,
    color: "white",
    fillOpacity: 0.6,
  };

  const onEachKorem = (feature, layer) => {
    layer.on({
      click: handleKoremClick,
    });
    layer.bindPopup(`<strong>${feature.properties.listkodim_Korem}</strong>`);
  };

  const onEachKodim = (feature, layer) => {
    layer.on({
      click: handleKodimClick,
    });
    layer.bindPopup(`<strong>${feature.properties.listkodim_Kodim}</strong>`);
  };

  if (loading) return <div>Memuat data peta...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {mapView === "kodim" && (
        <button
          onClick={resetView}
          style={{
            position: "absolute",
            top: "10px",
            left: "50px",
            zIndex: 1000,
            padding: "5px 10px",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Kembali ke Peta Korem
        </button>
      )}
      <MapContainer
        center={mapCenter}
        zoom={initialZoom}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => (mapRef.current = map)}
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

        {mapView === "korem" && koremData && (
          <GeoJSON
            key="korem-layer"
            data={koremData}
            style={koremStyle}
            onEachFeature={onEachKorem}
          />
        )}

        {mapView === "kodim" && filteredKodim && (
          <GeoJSON
            key="kodim-layer"
            data={filteredKodim}
            style={kodimStyle}
            onEachFeature={onEachKodim}
          />
        )}

        {/* Render assets */}
        {assets.map(asset => (
            <AssetMarker 
                key={asset.id} 
                asset={asset} 
                onAssetClick={onAssetClick} 
                isSelected={asetPilihan && asetPilihan.id === asset.id}
            />
        ))}

      </MapContainer>
    </div>
  );
};

export default PetaAset;