import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  LayersControl,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import koremData from "../data/korem.geojson";
import kodimData from "../data/Kodim.geojson";

// --- Helper functions ---

const validateCoordinates = (coords) => {
  if (!Array.isArray(coords)) return false;
  for (const coord of coords) {
    if (
      !Array.isArray(coord) ||
      coord.length < 2 ||
      typeof coord[0] !== "number" ||
      typeof coord[1] !== "number" ||
      isNaN(coord[0]) ||
      isNaN(coord[1])
    ) {
      return false;
    }
  }
  return true;
};

const parseLocation = (lokasiData) => {
  if (!lokasiData) return null;

  try {
    const parsed =
      typeof lokasiData === "string" ? JSON.parse(lokasiData) : lokasiData;

    if (parsed.type === "Polygon" && parsed.coordinates) {
      return { type: "Polygon", coordinates: parsed.coordinates };
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      if (validateCoordinates(parsed)) {
        return { type: "Polygon", coordinates: [parsed] };
      }
      if (validateCoordinates(parsed[0])) {
        return { type: "Polygon", coordinates: parsed };
      }
    }
    
    console.warn("Format lokasi tidak dikenali:", lokasiData);
    return null;
  } catch (e) {
    console.error("Gagal mem-parse data lokasi:", e, "Data:", lokasiData);
    return null;
  }
};

const getCentroid = (geometry) => {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
    return null;
  }

  const coords = geometry.coordinates[0];
  if (!validateCoordinates(coords) || coords.length === 0) return null;

  let x = 0, y = 0;
  for (const coord of coords) {
    x += coord[0];
    y += coord[1];
  }
  return [y / coords.length, x / coords.length];
};


// --- Icons ---

const createIcon = (color) => new L.Icon({
  iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = createIcon("blue");
const redIcon = createIcon("red");
const greenIcon = createIcon("green");
const yellowIcon = createIcon("yellow");


// --- Sub-components ---

const AssetLayer = ({ assets, onAssetClick, isSelected }) => {
  return assets.map((asset) => {
    const geometry = parseLocation(asset.lokasi);
    if (!geometry) return null;

    const isAssetSelected = isSelected && isSelected(asset);
    const style = {
      fillColor: asset.type === "yardip" ? "#D0021B" : "#4A90E2",
      weight: 2,
      opacity: 1,
      color: isAssetSelected ? "yellow" : "white",
      fillOpacity: 0.6,
    };

    return (
      <GeoJSON
        key={asset.id}
        data={geometry}
        style={style}
        eventHandlers={{
          click: () => {
            if (onAssetClick) onAssetClick(asset);
          },
        }}
      >
        <Popup>
          <strong>{asset.nama || asset.pengelola || "Aset"}</strong>
          <br />
          Status: {asset.status || "N/A"}
          <br />
          Luas: {(asset.luas || 0).toLocaleString("id-ID")} m²
        </Popup>
      </GeoJSON>
    );
  });
};

const AssetMarkers = ({ assets, onAssetClick, isSelected, markerColorMode, certFilter }) => {
  const assetsToRender = assets.filter(asset => {
    if (markerColorMode !== 'certificate' || certFilter === 'all') {
      return true;
    }
    const hasCert = asset.pemilikan_sertifikat === 'Ya';
    if (certFilter === 'certified') {
      return hasCert;
    }
    if (certFilter === 'uncertified') {
      return !hasCert;
    }
    return true;
  });

  return assetsToRender.map((asset) => {
    const geometry = parseLocation(asset.lokasi);
    const centroid = getCentroid(geometry);
    if (!centroid) return null;

    let iconToUse;
    if (isSelected && isSelected(asset)) {
      iconToUse = yellowIcon;
    } else if (markerColorMode === "certificate") {
      iconToUse = asset.pemilikan_sertifikat === "Ya" ? blueIcon : redIcon;
    } else {
      iconToUse = asset.type === "yardip" ? redIcon : greenIcon;
    }

    return (
      <Marker
        key={asset.id}
        position={centroid}
        icon={iconToUse}
        eventHandlers={{
          click: () => {
            if (onAssetClick) onAssetClick(asset);
          },
        }}
      >
        <Popup>
          <strong>{asset.nama || asset.pengelola || "Aset"}</strong>
          <br />
          Status: {asset.status || "N/A"}
        </Popup>
      </Marker>
    );
  });
};

const MapController = ({ assets, fitBounds, zoomToAsset }) => {
  const map = useMap();

  // Effect to fit bounds to a collection of assets
  useEffect(() => {
    if (fitBounds && assets && assets.length > 0) {
      const geometries = assets.map(asset => parseLocation(asset.lokasi)).filter(Boolean);
      if (geometries.length > 0) {
        const featureGroup = L.featureGroup(
          geometries.map(geom => L.geoJSON(geom))
        );
        map.fitBounds(featureGroup.getBounds(), { padding: [50, 50] });
      }
    }
  }, [map, assets, fitBounds]);

  // Effect to zoom to a single asset
  useEffect(() => {
    if (zoomToAsset && zoomToAsset.lokasi) {
      const geometry = parseLocation(zoomToAsset.lokasi);
      if (geometry) {
        const layer = L.geoJSON(geometry);
        map.fitBounds(layer.getBounds(), { maxZoom: 18, padding: [50, 50], animate: true });
      } else {
        const centroid = getCentroid(parseLocation(zoomToAsset.lokasi));
        if(centroid) {
            map.setView(centroid, 18, {animate: true});
        }
      }
    }
  }, [map, zoomToAsset]);

  return null;
};


// --- Main Component ---

const PetaAset = React.memo(
  ({
    assets = [],
    onAssetClick,
    asetPilihan, // For highlighting
    zoomToAsset, // For zooming
    fitBounds = false,
    markerColorMode = "type", // 'type' or 'certificate'
  }) => {
    const mapRef = useRef(null);
    const [certFilter, setCertFilter] = useState('all'); // 'all', 'certified', 'uncertified'
    const [selectedKorem, setSelectedKorem] = useState(null);

    const mapCenter = [-7.5, 110.0];
    const initialZoom = 8;

    const isSelected = (asset) => asetPilihan && asetPilihan.id === asset.id;

    const filterControlStyle = {
      position: 'absolute',
      top: '70px',
      right: '10px',
      zIndex: 1000,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: '8px',
      borderRadius: '5px',
      border: '1px solid #ccc',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    };

    const buttonStyle = (filterType) => ({
      padding: '5px 10px',
      border: '1px solid #aaa',
      borderRadius: '4px',
      cursor: 'pointer',
      backgroundColor: certFilter === filterType ? '#cce5ff' : 'white',
      fontWeight: certFilter === filterType ? 'bold' : 'normal',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
    });

    const handleKoremClick = (e, feature) => {
      setSelectedKorem(feature.properties);
      const map = mapRef.current;
      if (map) {
        map.fitBounds(e.target.getBounds());
      }
    };

    const onEachKorem = (feature, layer) => {
      layer.on({
        click: (e) => handleKoremClick(e, feature),
      });
      layer.bindPopup(feature.properties.nama);
    };

    const onEachKodim = (feature, layer) => {
      layer.bindPopup(feature.properties.listkodim_Kodim);
    };

    const resetView = () => {
      setSelectedKorem(null);
      const map = mapRef.current;
      if (map) {
        map.setView(mapCenter, initialZoom);
      }
    };

    const sanitizedKoremData = koremData
    ? {
        ...koremData,
        features: Array.isArray(koremData.features)
          ? koremData.features.filter(
              (feature) =>
                feature.geometry &&
                feature.geometry.type &&
                feature.geometry.coordinates
            )
          : [],
      }
    : null;

    const filteredKodimData = selectedKorem && kodimData
      ? {
          ...kodimData,
          features: Array.isArray(kodimData.features)
            ? kodimData.features.filter(
                (feature) =>
                  feature.properties.listkodim_Korem === selectedKorem.nama &&
                  feature.geometry &&
                  feature.geometry.type &&
                  feature.geometry.coordinates
              )
            : [],
        }
      : null;

    return (
      <div style={{ position: "relative", height: "100%", width: "100%" }}>
        {selectedKorem && (
          <button
            onClick={resetView}
            style={{
              position: 'absolute',
              top: '10px',
              left: '50px',
              zIndex: 1000,
              padding: '5px 10px',
              backgroundColor: 'white',
              border: '2px solid rgba(0,0,0,0.2)',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Kembali ke Tampilan Korem
          </button>
        )}
        <MapContainer
          center={mapCenter}
          zoom={initialZoom}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
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

          {!selectedKorem && sanitizedKoremData && (
            <GeoJSON 
              key="korem-layer"
              data={sanitizedKoremData} 
              style={{ color: "blue", weight: 2, fillOpacity: 0.1 }} 
              onEachFeature={onEachKorem} 
            />
          )}
          {selectedKorem && filteredKodimData && (
            <GeoJSON 
              key="kodim-layer"
              data={filteredKodimData} 
              style={{ color: "green", weight: 2, fillOpacity: 0.2 }}
              onEachFeature={onEachKodim}
            />
          )}

          {fitBounds ? (
            <AssetLayer assets={assets} onAssetClick={onAssetClick} isSelected={isSelected} />
          ) : (
            <AssetMarkers assets={assets} onAssetClick={onAssetClick} isSelected={isSelected} markerColorMode={markerColorMode} certFilter={certFilter} />
          )}

          <MapController assets={assets} fitBounds={fitBounds} zoomToAsset={zoomToAsset} />

        </MapContainer>

        {/* Filter Control UI */}
        {markerColorMode === 'certificate' && !fitBounds && (
          <div style={filterControlStyle}>
            <button style={buttonStyle('all')} onClick={() => setCertFilter('all')}>Semua</button>
            <button style={buttonStyle('certified')} onClick={() => setCertFilter('certified')}>
              <img src={blueIcon.options.iconUrl} alt="Bersertifikat" style={{ width: '12px', height: '20px' }} />
              Bersertifikat
            </button>
            <button style={buttonStyle('uncertified')} onClick={() => setCertFilter('uncertified')}>
              <img src={redIcon.options.iconUrl} alt="Belum Bersertifikat" style={{ width: '12px', height: '20px' }} />
              Belum Bersertifikat
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default PetaAset;