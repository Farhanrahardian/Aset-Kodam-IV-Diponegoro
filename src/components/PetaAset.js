import React, { useEffect, useState } from "react";
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
import { parseLocation, getCentroid } from "../utils/locationUtils";
import * as turf from "@turf/turf";
import { normalizeKodimName } from "../utils/kodimUtils";

// --- STYLING ---
const defaultStyle = { color: "blue", weight: 2, fillOpacity: 0.1 };
const koremStyle = { color: "#0033A0", weight: 3, fillOpacity: 0.1 };
const kodimStyle = { color: "#2E7D32", weight: 2, fillOpacity: 0.2 };
const selectedStyle = { color: "#FFC107", weight: 4, fillOpacity: 0.3 };

// --- ICONS ---
const createIcon = (color) =>
  new L.Icon({
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

// --- HELPER FUNCTIONS ---
const fitBoundsToAsset = (map, asset) => {
  try {
    const geometry = parseLocation(asset.lokasi);
    if (geometry && geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates.length > 0) {
      // Leaflet's L.polygon expects [lat, lng], but GeoJSON is [lng, lat]. We must swap them.
      const leafletCoords = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
      const polygon = L.polygon(leafletCoords);
      const bounds = polygon.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      } else {
        // Fallback for invalid bounds
        if (leafletCoords.length > 0) {
          map.setView(leafletCoords[0], 15);
        }
      }
    }
  } catch (e) {
    console.error("Could not fit bounds to asset:", e);
  }
};

const renderAssetAsPolygon = (map, asset) => {
  try {
    const geometry = parseLocation(asset.lokasi);
    if (geometry && geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates.length > 0) {
      // Leaflet's L.polygon expects [lat, lng], but GeoJSON is [lng, lat]. We must swap them.
      const leafletCoords = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
      const polygon = L.polygon(leafletCoords, { 
        color: '#FF5722', 
        weight: 3, 
        fillOpacity: 0.5 
      });
      polygon.isAssetPolygon = true; // Tag layer for cleanup
      polygon.addTo(map);
      return polygon;
    }
  } catch (e) {
    console.error("Could not render asset as polygon:", e);
  }
  return null;
};

// --- MAP CONTROLLER ---
const MapController = ({ view, koremData, kodimData, assets, setView, onMapKoremSelect, onMapKodimSelect, mode }) => {
  const map = useMap();

  useEffect(() => {
    console.log("MapController useEffect triggered");
    console.log("View:", view);
    console.log("KoremData:", koremData);
    console.log("Assets:", assets);
    
    if (!map) return;

    // Always clear asset polygons and labels from previous renders
    map.eachLayer(layer => {
        if (layer.isAssetPolygon || (layer instanceof L.Marker && layer.options.icon instanceof L.DivIcon)) {
            map.removeLayer(layer);
        }
    });

    // MODE 1: Render a single asset polygon and zoom (for Detail Modal/Offcanvas)
    if (mode === 'detail' && assets && assets.length > 0) {
        const asset = assets[0];
        renderAssetAsPolygon(map, asset);
        fitBoundsToAsset(map, asset);
        // Exit early, do not execute the view logic below
        return;
    }

    // MODE 2: Main map view logic (National, Korem, Kodim)
    if (view.type === "kodim" && view.kodim) {
      let feature = null;
      const normalizedViewKodim = normalizeKodimName(view.kodim.listkodim_Kodim);
      
      if (normalizedViewKodim === "Kodim 0733/Kota Semarang") {
        feature = kodimData?.features.find(f => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)");
      } else {
        feature = kodimData?.features.find(f => normalizeKodimName(f.properties.listkodim_Kodim) === normalizedViewKodim);
      }
      
      if (feature) map.fitBounds(L.geoJSON(feature).getBounds());

    } else if (view.type === "korem" && view.korem) {
      const feature = koremData?.features.find(f => f.properties.listkodim_Korem === view.korem.listkodim_Korem);
      if (feature) map.fitBounds(L.geoJSON(feature).getBounds());

    } else {
      if (koremData && koremData.features.length > 0) {
        map.fitBounds(L.geoJSON(koremData).getBounds());
      }
    }

    // Add labels for the current view
    if (view.type === "nasional" && koremData) {
        console.log("Adding korem labels for nasional view");
        koremData.features.forEach(feature => {
            let { listkodim_Korem: nama, asset_count } = feature.properties;
            const featureName = (nama || '').toLowerCase();
            const isLabelHidden = featureName.includes('hutan') || featureName.includes('waduk') || featureName.includes('wadung kedungombo');

            if (!isLabelHidden && feature.geometry) {
                if (nama === 'Kodim 0733/Kota Semarang') {
                    nama = 'Kodim 0733/Kota Semarang';
                }
                
                const point = turf.pointOnFeature(feature);
                const coords = point.geometry.coordinates;
                const leafletCoords = [coords[1], coords[0]];

                console.log(`Creating label for ${nama} with ${asset_count} assets`);
                const label = L.marker(leafletCoords, {
                    icon: L.divIcon({
                        className: 'korem-label',
                        html: `<div><strong>${nama}</strong><br><span>${asset_count} Aset</span></div>`,
                        iconSize: [150, 40],
                        iconAnchor: [75, 20]
                    })
                });

                label.on('click', () => {
                    if (feature.properties.listkodim_Korem === "Kodim 0733/Kota Semarang") {
                        const kodimFeature = kodimData.features.find(f => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)");
                        if (kodimFeature) {
                            const kodimProperties = { ...kodimFeature.properties, listkodim_Kodim: "Kodim 0733/Kota Semarang" };
                            setView({ type: 'kodim', korem: feature.properties, kodim: kodimProperties });
                            if (onMapKodimSelect) onMapKodimSelect(kodimProperties);
                        }
                    } else {
                        setView({ type: "korem", korem: feature.properties, kodim: null });
                        if (onMapKoremSelect) onMapKoremSelect(feature.properties);
                    }
                });

                label.addTo(map);
            }
        });
    }

  }, [map, view, koremData, kodimData, assets, setView, onMapKoremSelect, onMapKodimSelect, mode]);

  return null;
};

// --- MAIN COMPONENT ---
const PetaAset = ({
    assets = [],
    onAssetClick,
    asetPilihan,
    koremData,
    kodimData,
    koremFilter, // From parent filter
    kodimFilter, // From parent filter
    onMapKoremSelect, // Callback for when a korem is selected on map
    onMapKodimSelect, // Callback for when a kodim is selected on map
    onMapBack, // Callback for when back button is clicked on map
    mode = "interactive", // 'interactive' or 'detail'
  }) => {
    const [view, setView] = useState({ type: "nasional", korem: null, kodim: null });

    useEffect(() => {
        console.log("BUG_TRACE: [PetaAset] Filter effect triggered", { koremFilter, kodimFilter });

        // Logika filter yang disatukan
        if (koremFilter || kodimFilter) {
            let targetKodimName = kodimFilter;
            let targetKoremName = koremFilter?.nama;

            // Jika Korem Semarang ("Berdiri Sendiri") dipilih, perlakukan sebagai pemilihan Kodim Semarang
            if (targetKoremName === 'Berdiri Sendiri') {
                targetKodimName = 'Kodim 0733/Kota Semarang';
            }

            if (targetKodimName) {
                // Langsung ke view kodim
                const normalizedKodimFilter = normalizeKodimName(targetKodimName);
                let kodimFeature = null;

                if (normalizedKodimFilter === "Kodim 0733/Kota Semarang") {
                    kodimFeature = kodimData.features.find(f => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)");
                } else {
                    kodimFeature = kodimData.features.find(f => normalizeKodimName(f.properties.listkodim_Kodim) === normalizedKodimFilter);
                }

                if (kodimFeature) {
                    let contextKoremProperties;
                    if (normalizedKodimFilter === "Kodim 0733/Kota Semarang") {
                        const semarangKoremFeature = koremData.features.find(f => f.properties.listkodim_Korem === "Kodim 0733/Kota Semarang");
                        contextKoremProperties = semarangKoremFeature?.properties;
                    } else {
                        const koremName = kodimFeature.properties.listkodim_Korem;
                        const koremFeature = koremData.features.find(f => f.properties.listkodim_Korem === koremName);
                        contextKoremProperties = koremFeature?.properties;
                    }

                    setView({
                        type: 'kodim',
                        korem: contextKoremProperties,
                        kodim: { ...kodimFeature.properties, listkodim_Kodim: normalizedKodimFilter }
                    });
                } else {
                     console.warn("BUG_TRACE: [PetaAset] Kodim feature not found for filter:", targetKodimName);
                }
            } else if (targetKoremName) {
                // Ke view korem (untuk korem selain Semarang)
                const koremFeature = koremData.features.find(f => f.properties.listkodim_Korem === targetKoremName);
                if (koremFeature) {
                    setView({ type: 'korem', korem: koremFeature.properties, kodim: null });
                } else {
                    console.warn("BUG_TRACE: [PetaAset] Korem feature not found for filter:", targetKoremName);
                }
            }
        } else {
            // Reset ke view nasional
            setView({ type: 'nasional', korem: null, kodim: null });
        }
    }, [koremFilter, kodimFilter, koremData, kodimData]);

    const isSelected = (asset) => asetPilihan && asetPilihan.id === asset.id;

    const onEachKorem = (feature, layer) => {
      layer.bindPopup(feature.properties.listkodim_Korem);
      layer.on({ 
        click: () => {
          // Update internal view state
          setView({ type: "korem", korem: feature.properties, kodim: null });
          // Notify parent component about the selection
          if (onMapKoremSelect) {
            // Pastikan properti yang dikirim adalah objek yang valid
            if (feature.properties && typeof feature.properties === 'object') {
              onMapKoremSelect(feature.properties);
            } else {
              console.warn("Invalid korem properties:", feature.properties);
            }
          }
        } 
      });
    };

    const onEachKodim = (feature, layer) => {
      // Gunakan nama dinormalisasi untuk popup
      const normalizedKodimName = normalizeKodimName(feature.properties.listkodim_Kodim);
      layer.bindPopup(normalizedKodimName);
      layer.on({ 
        click: () => {
          // Update internal view state
          let normalizedKodimName = normalizeKodimName(feature.properties.listkodim_Kodim);
          
          // Tangani kasus khusus untuk Kodim Kota Semarang
          if (feature.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)") {
            normalizedKodimName = "Kodim 0733/Kota Semarang";
          }
          
          const normalizedKodim = { 
            ...feature.properties, 
            listkodim_Kodim: normalizedKodimName 
          };
          
          setView({ type: "kodim", korem: view.korem, kodim: normalizedKodim });
          
          // Notify parent component about the selection
          if (onMapKodimSelect) {
            // Pastikan properti yang dikirim adalah objek yang valid
            if (normalizedKodim && typeof normalizedKodim === 'object') {
              onMapKodimSelect(normalizedKodim);
            } else {
              console.warn("Invalid kodim properties:", normalizedKodim);
            }
          }
        } 
      });
    };

    const getStyle = (feature) => {
        // The feature being rendered is always the one we want to see,
        // so we can use a simpler style logic.
        if (feature.properties.listkodim_Kodim) return kodimStyle;
        if (feature.properties.listkodim_Korem) return koremStyle;
        return defaultStyle;
    }

    // Determine which layers to show based on view state
    let koremsToShow = null;
    if (koremData) {
        if (view.type === 'nasional') {
            koremsToShow = koremData;
        } else if (view.type === 'korem') {
            // Only show the selected Korem
            const selectedFeature = koremData.features.find(f => f.properties.listkodim_Korem === view.korem.listkodim_Korem);
            koremsToShow = selectedFeature ? { ...koremData, features: [selectedFeature] } : null;
        }
    }

    let kodimsToShow = null;
    if (kodimData && view.korem) {
        if (view.type === 'korem') {
            // Show all Kodims for the selected Korem
            // Tangani kasus khusus "Berdiri Sendiri"
            let koremName = view.korem.listkodim_Korem;
            if (koremName === "Kodim 0733/Kota Semarang") {
                // Untuk "Berdiri Sendiri", tampilkan Kodim 0733/Kota Semarang (dengan nama GeoJSON "Kodim 0733/Semarang (BS)")
                kodimsToShow = { 
                    ...kodimData, 
                    features: kodimData.features.filter(f => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)") 
                };
            } else {
                kodimsToShow = { 
                    ...kodimData, 
                    features: kodimData.features.filter(f => f.properties.listkodim_Korem === koremName) 
                };
            }
        } else if (view.type === 'kodim') {
            // Only show the selected Kodim
            // Untuk Kodim Kota Semarang, kita perlu menangani kasus khusus
            let selectedFeature = null;
            if (view.kodim.listkodim_Kodim === "Kodim 0733/Kota Semarang") {
                // Cari feature dengan nama GeoJSON yang sesuai
                selectedFeature = kodimData.features.find(f => f.properties.listkodim_Kodim === "Kodim 0733/Semarang (BS)");
            } else {
                // Untuk kodim lainnya
                selectedFeature = kodimData.features.find(f => normalizeKodimName(f.properties.listkodim_Kodim) === normalizeKodimName(view.kodim.listkodim_Kodim));
            }
            kodimsToShow = selectedFeature ? { ...kodimData, features: [selectedFeature] } : null;
        }
    }

    const assetsToShow = mode === 'detail' ? assets : (
        view.type === "kodim" ? assets.filter(a => {
            // Normalisasi nama kodim pada aset untuk perbandingan
            const normalizedAssetKodim = normalizeKodimName(String(a.kodim || "").trim());
            const normalizedViewKodim = normalizeKodimName(view.kodim.listkodim_Kodim);
            
            // Tangani kasus khusus untuk Kodim Kota Semarang
            if (normalizedViewKodim === "Kodim 0733/Kota Semarang") {
                // Aset dengan kodim "Kodim 0733/Kota Semarang" atau "Kodim 0733/Semarang (BS)"
                return normalizedAssetKodim === "Kodim 0733/Kota Semarang" || a.kodim === "Kodim 0733/Semarang (BS)";
            }
            
            return normalizedAssetKodim === normalizedViewKodim;
        }) : []
    );

    const assetsOnMapCount = assetsToShow.filter(a => {
        // Pastikan aset memiliki data lokasi yang valid
        const locationData = parseLocation(a.lokasi);
        const centroid = getCentroid(locationData);
        return centroid !== null;
    }).length;

    const buttonStyle = {
        position: 'absolute', top: '10px', left: '50px', zIndex: 1000, padding: '8px 12px',
        backgroundColor: 'white', border: '2px solid rgba(0,0,0,0.2)', borderRadius: '4px', cursor: 'pointer'
    };

    const handleBackClick = () => {
        // Kasus khusus: Jika kita berada di view Kodim Semarang, "Kembali" akan langsung ke view nasional.
        if (view.type === 'kodim' && view.kodim?.listkodim_Kodim === 'Kodim 0733/Kota Semarang') {
            setView({ type: 'nasional', korem: null, kodim: null });
            if (onMapBack) {
                onMapBack({ type: 'nasional', korem: null, kodim: null });
            }
        } else if (view.type === 'kodim') {
            // Perilaku normal: dari kodim ke korem induknya
            setView({ type: 'korem', korem: view.korem, kodim: null });
            if (onMapBack) {
                onMapBack({ type: 'korem', korem: view.korem, kodim: null });
            }
        } else if (view.type === 'korem') {
            // Perilaku normal: dari korem ke nasional
            setView({ type: 'nasional', korem: null, kodim: null });
            if (onMapBack) {
                onMapBack({ type: 'nasional', korem: null, kodim: null });
            }
        }
    }

    return (
      <div style={{ position: "relative", height: "100%", width: "100%" }}>
        <style>{`
            .korem-label {
                pointer-events: none; /* Allow clicks to pass through the container */
            }
            .korem-label div {
                pointer-events: auto; /* But make the content clickable */
                width: 150px;
                text-align: center; 
                text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white; 
                font-weight: bold; 
            }
            .korem-label strong { font-size: 12px; }
            .korem-label span { font-size: 11px; background-color: rgba(255, 255, 255, 0.7); border-radius: 3px; padding: 1px 3px; }
        `}</style>

        {view.type !== 'nasional' && <button onClick={handleBackClick} style={buttonStyle}>Kembali</button>}

        {view.type === 'kodim' && assetsToShow.length > assetsOnMapCount && (
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                backgroundColor: 'rgba(255, 229, 100, 0.9)',
                padding: '5px 15px',
                borderRadius: '15px',
                border: '1px solid #E6A23C',
                fontSize: '12px',
                color: '#4A4A4A',
                textAlign: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
                <strong>Info:</strong> Menampilkan {assetsOnMapCount} dari {assetsToShow.length} aset. 
                {assetsToShow.length - assetsOnMapCount} aset tidak memiliki data lokasi valid.
            </div>
        )}

        <MapContainer center={[-7.5, 110.0]} zoom={8} style={{ height: "100%", width: "100%" }}>
            <MapController view={view} koremData={koremData} kodimData={kodimData} assets={assetsToShow} setView={setView} onMapKoremSelect={onMapKoremSelect} onMapKodimSelect={onMapKodimSelect} mode={mode} />
            <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Street Map">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satelit">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </LayersControl.BaseLayer>
            </LayersControl>

            {/* Always render Korems, style will change based on view. Key forces style re-evaluation. */}                                                         │
            {koremsToShow && <GeoJSON key={'korem-' + view.korem?.listkodim_Korem} data={koremsToShow} style={getStyle} onEachFeature={onEachKorem} />}

          {/* Render Kodims when a Korem or Kodim is selected */}                                                                                                │
          {kodimsToShow && <GeoJSON key={'kodim-' + view.korem?.listkodim_Korem + '-' + view.kodim?.listkodim_Kodim} data={kodimsToShow} style={getStyle}      
          onEachFeature={onEachKodim} />}

            {/* Polygon dirender secara imperatif di MapController. */}
            {/* Render markers untuk peta utama. */}
            {mode !== 'detail' && (assetsToShow || []).map(asset => {
                    const locationData = parseLocation(asset.lokasi);
                    const centroid = getCentroid(locationData);
                    if (!centroid) return null;
                    
                    // Tentukan warna marker berdasarkan status aset
                    let markerIcon = greenIcon; // default
                    if (asset.status === "Dimiliki/Dikuasai") {
                        markerIcon = greenIcon;
                    } else if (asset.status === "Tidak Dimiliki/Tidak Dikuasai") {
                        markerIcon = redIcon;
                    } else if (asset.status === "Lain-lain") {
                        markerIcon = yellowIcon;
                    }
                    
                    return (
                        <Marker key={asset.id} position={centroid} icon={markerIcon} eventHandlers={{ click: () => onAssetClick && onAssetClick(asset) }}>
                            <Popup>
                                <strong>{asset.nama || "Aset"}</strong><br />
                                Status: {asset.status || "N/A"}<br />
                                Kodim: {normalizeKodimName(asset.kodim) || "N/A"}
                            </Popup>
                        </Marker>
                    );
                })
            }

        </MapContainer>
      </div>
    );
  }
;

export default PetaAset;
