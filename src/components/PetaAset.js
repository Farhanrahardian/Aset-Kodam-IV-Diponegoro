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
  // Pengecekan 1: Pastikan itu adalah array
  if (!Array.isArray(coords)) {
    console.error("Kesalahan Validasi: Koordinat bukan array.");
    return false;
  }
  // Pengecekan 2: Pastikan setiap elemen adalah array 2D dengan angka
  for (const coord of coords) {
    if (
      !Array.isArray(coord) ||
      coord.length !== 2 ||
      typeof coord[0] !== "number" ||
      typeof coord[1] !== "number" ||
      isNaN(coord[0]) ||
      isNaN(coord[1])
    ) {
      console.error("Kesalahan Validasi: Koordinat tidak valid. Item:", coord);
      return false;
    }
  }
  return true;
};

const getCentroid = (lokasiData) => {
  if (!lokasiData) {
    console.warn(
      "Peringatan: Lokasi data kosong atau null, marker tidak akan dibuat."
    );
    return null;
  }

  let coordinatesToProcess;

  try {
    // Jika lokasiData adalah string, coba parse sebagai JSON
    const parsedLokasi = typeof lokasiData === "string" ? JSON.parse(lokasiData) : lokasiData;

    // Tentukan koordinat berdasarkan tipe GeoJSON
    if (parsedLokasi.type === "Polygon") {
      // Untuk Polygon, ambil array koordinat pertama (outer ring)
      coordinatesToProcess = parsedLokasi.coordinates[0];
    } else if (parsedLokasi.type === "Point") {
      // Untuk Point, koordinatnya langsung
      coordinatesToProcess = [parsedLokasi.coordinates];
    } else if (parsedLokasi.type === "LineString") {
      // Untuk LineString, koordinatnya langsung
      coordinatesToProcess = parsedLokasi.coordinates;
    } else {
      // Jika bukan GeoJSON, asumsikan itu adalah array koordinat langsung (seperti sebelumnya)
      coordinatesToProcess = parsedLokasi[0];
    }

    if (!validateCoordinates(coordinatesToProcess)) {
      console.error("Kesalahan GetCentroid: Gagal memvalidasi koordinat.");
      return null;
    }

    // Periksa apakah array kosong
    if (coordinatesToProcess.length === 0) {
      console.warn(
        "Peringatan: Koordinat kosong, tidak bisa menghitung centroid."
      );
      return null;
    }

    // Hitung titik tengah
    let x = 0,
      y = 0;
    for (const coord of coordinatesToProcess) {
      x += coord[0];
      y += coord[1];
    }
    // Ingat, GeoJSON menggunakan [longitude, latitude]
    return [y / coordinatesToProcess.length, x / coordinatesToProcess.length];
  } catch (e) {
    console.error(
      "Gagal parse lokasi data atau menghitung centroid:",
      e,
      "Data:",
      lokasiData
    );
    return null;
  }
};

// --- Definisikan Ikon Kustom ---
const asetTanahIcon = new L.Icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const asetYardipIcon = new L.Icon({
  iconUrl:
    "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Icon yang akan digunakan saat aset dipilih
const selectedIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2776/2776067.png",
  iconSize: [35, 35],
});

const AssetMarker = ({ asset, onAssetClick, isSelected }) => {
  const centroid = getCentroid(asset.lokasi);
  if (!centroid) return null;

  // Logika baru untuk memilih ikon
  let iconToUse;
  if (isSelected) {
    iconToUse = selectedIcon;
  } else if (asset.type === "tanah") {
    iconToUse = asetTanahIcon;
  } else if (asset.type === "yardip") {
    iconToUse = asetYardipIcon;
  } else {
    // Default icon jika type tidak terdefinisi
    iconToUse = new L.Icon.Default();
  }

  return (
    <Marker
      position={centroid}
      icon={iconToUse}
      eventHandlers={{ click: () => onAssetClick(asset) }}
    >
      <Popup>
        <strong>{asset.nama || asset.pengelola || "Aset"}</strong>
        <br />
        Status: {asset.status || "N/A"}
        <br />
        <span style={{ color: asset.type === "tanah" ? "blue" : "red" }}>
          Tipe: {asset.type || "N/A"}
        </span>
      </Popup>
    </Marker>
  );
};

// --- Main Component ---
const PetaAset = React.memo(
  ({
    assets = [],
    onAssetClick,
    asetPilihan,
    onKoremClick,
    onKodimClick,
    resetMapTrigger,
  }) => {
    const [mapView, setMapView] = useState("korem");
    const [selectedKorem, setSelectedKorem] = useState(null);
    const [filteredKodim, setFilteredKodim] = useState(null);
    const [koremData, setKoremData] = useState(null);
    const [kodimData, setKodimData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [assetFilter, setAssetFilter] = useState("all");

    const mapRef = useRef(null);

    const mapCenter = [-7.5, 110.0];
    const initialZoom = 8;

    // Efek untuk mereset view dari parent
    useEffect(() => {
      if (resetMapTrigger) {
        resetView();
      }
    }, [resetMapTrigger]);

    useEffect(() => {
      Promise.all([
        fetch("/data/korem.geojson").then((res) => res.json()),
        fetch("/data/Kodim.geojson").then((res) => res.json()),
      ])
        .then(([korem, kodim]) => {
          setKoremData(korem);
          setKodimData(kodim);
        })
        .catch((e) => {
          console.error("Gagal memuat data GeoJSON:", e);
          setError(e.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }, []);

    useEffect(() => {
      if (mapView === "kodim" && selectedKorem && kodimData) {
        const kodimsInKorem = kodimData.features.filter((kodim) => {
          return (
            kodim &&
            kodim.properties &&
            kodim.properties.listkodim_Korem &&
            selectedKorem &&
            selectedKorem.properties &&
            kodim.properties.listkodim_Korem ===
              selectedKorem.properties.listkodim_Korem
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

    // Efek baru untuk auto-zoom ke Kodim
    useEffect(() => {
      if (
        mapRef.current &&
        filteredKodim &&
        filteredKodim.features.length > 0
      ) {
        try {
          const kodimLayer = L.geoJSON(filteredKodim);
          mapRef.current.fitBounds(kodimLayer.getBounds());
        } catch (e) {
          console.error("Error saat melakukan auto-zoom ke Kodim:", e);
        }
      }
    }, [filteredKodim]);

    const handleKoremClick = (e) => {
      const feature = e.target.feature;
      // Angkat state ke parent
      if (onKoremClick) {
        onKoremClick(feature);
      }
      // Tetap kelola state internal untuk tampilan
      setSelectedKorem(feature);
      setMapView("kodim");
    };

    const handleKodimClick = (e) => {
      const layer = e.target;
      // Angkat state ke parent
      if (onKodimClick) {
        onKodimClick(layer.feature);
      }
      // Lakukan zoom
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

    const filteredAssets = assets.filter((asset) => {
      if (assetFilter === "all") {
        return true;
      }
      return asset.type === assetFilter;
    });

    return (
      <div style={{ position: "relative", height: "100%", width: "100%" }}>
        {/* Container untuk tombol filter */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "50px",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "white",
            padding: "5px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
        >
          {mapView === "kodim" && (
            <button
              onClick={resetView}
              style={{
                padding: "5px 10px",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Kembali ke Korem
            </button>
          )}
          <button
            onClick={() => setAssetFilter("all")}
            style={{
              padding: "5px 10px",
              backgroundColor: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: assetFilter === "all" ? "bold" : "normal",
            }}
          >
            Semua
          </button>
          <button
            onClick={() => setAssetFilter("tanah")}
            style={{
              padding: "5px 10px",
              backgroundColor: assetFilter === "tanah" ? "#A9D3FF" : "white",
              border: "1px solid #4A90E2",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <img
              src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"
              alt="Aset Tanah"
              style={{ width: "12px", height: "20px" }}
            />
          </button>
          <button
            onClick={() => setAssetFilter("yardip")}
            style={{
              padding: "5px 10px",
              backgroundColor: assetFilter === "yardip" ? "#FFBABA" : "white",
              border: "1px solid #D0021B",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <img
              src="https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png"
              alt="Aset Yardip"
              style={{ width: "10x", height: "20px" }}
            />
          </button>
        </div>

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

          {/* Render aset yang sudah difilter */}
          {filteredAssets.map((asset) => (
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
  }
);

export default PetaAset;
