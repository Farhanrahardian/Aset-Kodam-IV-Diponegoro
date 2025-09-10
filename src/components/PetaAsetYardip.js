import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from "react-leaflet";
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

const PetaAsetYardip = ({
  onDrawingCreated,
  assets = [],
  isDrawing = false,
  jatengBoundary,
  diyBoundary,
  selectedKorem,
  selectedKodim,
  fitBounds = false,
  cityBounds = null,
  selectedCity = null,
  manualAreaAdjustment = null, // New prop for manual area adjustment
  originalGeometry = null, // New prop for original geometry
}) => {
  const mapRef = useRef(null);
  const featureGroupRef = useRef(null);
  const adjustedPolygonRef = useRef(null);
  const [adjustedGeometry, setAdjustedGeometry] = useState(null);

  const mapCenter = [-7.5, 110.0]; // Center of Central Java
  const initialZoom = 8;

  // Auto-zoom to selected area, city, or assets with improved timing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        if (cityBounds && Array.isArray(cityBounds) && cityBounds.length === 2) {
          console.log("Auto-zooming to city bounds:", cityBounds, "City:", selectedCity);
          
          try {
            const southWest = L.latLng(cityBounds[0][0], cityBounds[0][1]);
            const northEast = L.latLng(cityBounds[1][0], cityBounds[1][1]);
            const bounds = L.latLngBounds(southWest, northEast);
            
            mapRef.current.fitBounds(bounds, { 
              padding: [30, 30],
              maxZoom: 12,
              animate: true,
              duration: 1.5
            });
            
            console.log("✅ Successfully zoomed to city:", selectedCity);
          } catch (error) {
            console.error("Error zooming to city bounds:", error);
            const centerLat = (cityBounds[0][0] + cityBounds[1][0]) / 2;
            const centerLng = (cityBounds[0][1] + cityBounds[1][1]) / 2;
            mapRef.current.setView([centerLat, centerLng], 11, { animate: true });
          }
        }
        else if (selectedKodim && selectedKodim.geometry) {
          const kodimLayer = L.geoJSON(selectedKodim.geometry);
          mapRef.current.fitBounds(kodimLayer.getBounds(), { 
            padding: [20, 20],
            animate: true 
          });
        } 
        else if (selectedKorem && selectedKorem.geometry) {
          const koremLayer = L.geoJSON(selectedKorem.geometry);
          mapRef.current.fitBounds(koremLayer.getBounds(), { 
            padding: [20, 20],
            animate: true 
          });
        } 
        else if (fitBounds && assets.length > 0) {
          const validAssets = assets.filter(asset => asset.lokasi && Array.isArray(asset.lokasi));
          if (validAssets.length > 0) {
            try {
              const group = new L.FeatureGroup();
              validAssets.forEach(asset => {
                const geoJsonAsset = createGeoJSONFromAsset(asset);
                if (geoJsonAsset) {
                  const layer = L.geoJSON(geoJsonAsset);
                  group.addLayer(layer);
                }
              });
              
              if (group.getLayers().length > 0) {
                mapRef.current.fitBounds(group.getBounds(), { 
                  padding: [10, 10],
                  animate: true 
                });
              }
            } catch (error) {
              console.error("Error fitting bounds to assets:", error);
            }
          }
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedKorem, selectedKodim, assets, fitBounds, cityBounds, selectedCity]);

  // Handle manual area adjustment - adjust polygon to match new area
  useEffect(() => {
    if (manualAreaAdjustment && originalGeometry && featureGroupRef.current) {
      try {
        console.log("Adjusting polygon for manual area:", manualAreaAdjustment);
        
        // Create the adjusted polygon
        const adjustedPolygon = adjustPolygonToArea(originalGeometry, manualAreaAdjustment);
        
        if (adjustedPolygon) {
          setAdjustedGeometry(adjustedPolygon);
          
          // Clear existing layers and add the adjusted polygon
          featureGroupRef.current.clearLayers();
          
          // Create Leaflet layer for the adjusted polygon
          const adjustedLayer = L.geoJSON(adjustedPolygon, {
            style: {
              color: "#ff6b35", // Orange color for manually adjusted
              fillColor: "#ff6b35",
              fillOpacity: 0.5,
              weight: 3,
              dashArray: "5,5" // Dashed style to indicate manual adjustment
            }
          });
          
          featureGroupRef.current.addLayer(adjustedLayer);
          adjustedPolygonRef.current = adjustedLayer;
          
          console.log("✅ Polygon adjusted to area:", manualAreaAdjustment);
        }
      } catch (error) {
        console.error("Error adjusting polygon area:", error);
      }
    } else if (!manualAreaAdjustment && adjustedPolygonRef.current) {
      // Remove adjusted polygon if no manual adjustment
      if (featureGroupRef.current && adjustedPolygonRef.current) {
        featureGroupRef.current.removeLayer(adjustedPolygonRef.current);
        adjustedPolygonRef.current = null;
        setAdjustedGeometry(null);
      }
    }
  }, [manualAreaAdjustment, originalGeometry]);

  // Function to adjust polygon area using scaling method
  const adjustPolygonToArea = (geometry, targetArea) => {
    try {
      if (!geometry || !geometry.coordinates || !targetArea) return null;

      // Create turf polygon
      const polygon = turf.polygon(geometry.coordinates);
      const currentArea = turf.area(polygon);
      
      if (currentArea <= 0) return null;

      // Calculate scaling factor based on area ratio
      const areaRatio = targetArea / currentArea;
      const scaleFactor = Math.sqrt(areaRatio);
      
      console.log("Area adjustment:", {
        currentArea: currentArea.toFixed(2),
        targetArea: targetArea.toFixed(2),
        scaleFactor: scaleFactor.toFixed(4)
      });

      // Get centroid for scaling origin
      const centroid = turf.centroid(polygon);
      const centerCoords = centroid.geometry.coordinates;

      // Scale the polygon from its centroid
      const scaledPolygon = turf.transformScale(polygon, scaleFactor, {
        origin: centerCoords
      });

      // Verify the new area
      const newArea = turf.area(scaledPolygon);
      console.log("Scaled polygon area:", newArea.toFixed(2));

      return {
        type: "Feature",
        properties: {
          originalArea: currentArea,
          targetArea: targetArea,
          actualArea: newArea,
          scaleFactor: scaleFactor,
          isManuallyAdjusted: true
        },
        geometry: scaledPolygon.geometry
      };
    } catch (error) {
      console.error("Error in adjustPolygonToArea:", error);
      return null;
    }
  };

  const handleCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === "polygon") {
      const geojson = layer.toGeoJSON();
      const area = turf.area(geojson);

      console.log("Drawing created:", {
        layerType,
        geojson,
        area,
        selectedCity
      });

      // Clear previous drawings and adjusted polygons
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
        featureGroupRef.current.addLayer(layer);
      }
      
      // Reset adjusted geometry state
      setAdjustedGeometry(null);
      adjustedPolygonRef.current = null;

      // Call callback from parent
      if (typeof onDrawingCreated === "function") {
        onDrawingCreated({
          geometry: geojson.geometry,
          area: area,
        });
      }
    }
  };

  // Helper function to create GeoJSON from asset data
  const createGeoJSONFromAsset = (asset) => {
    if (!asset.lokasi) return null;

    try {
      let coordinates = asset.lokasi;

      if (Array.isArray(coordinates) && Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
        coordinates = coordinates[0];
      }
      else if (Array.isArray(coordinates) && Array.isArray(coordinates[0]) && coordinates[0].length === 2) {
        // Already in correct format
      }
      else if (Array.isArray(coordinates) && coordinates.length === 1 && Array.isArray(coordinates[0])) {
        coordinates = coordinates[0];
      }
      else {
        console.warn("Unrecognized coordinate format for asset:", asset.id);
        return null;
      }

      if (coordinates.length > 0) {
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coordinates.push([first[0], first[1]]);
        }
      }

      return {
        type: "Feature",
        properties: {
          id: asset.id,
          nama: asset.nama,
          kodim: asset.kodim,
          status: asset.status,
          luas: asset.luas,
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      };
    } catch (error) {
      console.error("Error creating GeoJSON for asset:", asset.id, error);
      return null;
    }
  };

  // Styles for different elements
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

  const boundaryStyle = {
    fillColor: "#2563eb",
    weight: 2,
    opacity: 1,
    color: "#1e40af",
    fillOpacity: 0.1,
  };

  const assetStyle = {
    fillColor: "#e11d48",
    weight: 2,
    opacity: 1,
    color: "#be123c",
    fillOpacity: 0.7,
  };

  const cityHighlightStyle = {
    fillColor: "#10b981",
    weight: 3,
    opacity: 0.9,
    color: "#059669",
    fillOpacity: 0.15,
    dashArray: "8,4"
  };

  // Style for manually adjusted polygon
  const adjustedPolygonStyle = {
    fillColor: "#ff6b35",
    weight: 3,
    opacity: 1,
    color: "#d63031",
    fillOpacity: 0.4,
    dashArray: "5,5"
  };

  // Popup content for assets
  const onEachAssetFeature = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties;
      const popupContent = `
        <div class="asset-popup">
          <h6 class="mb-2 text-primary">${props.nama || 'Unknown Asset'}</h6>
          <small>
            <strong>ID:</strong> ${props.id}<br/>
            <strong>Kodim:</strong> ${props.kodim || '-'}<br/>
            <strong>Status:</strong> <span class="badge bg-success">${props.status || '-'}</span><br/>
            <strong>Luas:</strong> ${props.luas ? Number(props.luas).toFixed(2) + ' m²' : '-'}
          </small>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };

  // Popup content for adjusted polygon
  const onEachAdjustedFeature = (feature, layer) => {
    if (feature.properties && feature.properties.isManuallyAdjusted) {
      const props = feature.properties;
      const popupContent = `
        <div class="adjusted-polygon-popup">
          <h6 class="mb-2 text-warning">📐 Area Disesuaikan Manual</h6>
          <small>
            <strong>Area Asli:</strong> ${props.originalArea.toFixed(2)} m²<br/>
            <strong>Area Target:</strong> ${props.targetArea.toFixed(2)} m²<br/>
            <strong>Area Aktual:</strong> ${props.actualArea.toFixed(2)} m²<br/>
            <strong>Faktor Skala:</strong> ${props.scaleFactor.toFixed(4)}<br/>
            <span class="text-muted">Polygon telah disesuaikan dengan luas manual</span>
          </small>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };

  // Create city bounds rectangle for visual reference
  const createCityBoundsGeoJSON = () => {
    if (!cityBounds || !Array.isArray(cityBounds) || cityBounds.length !== 2) {
      return null;
    }

    const [southWest, northEast] = cityBounds;
    return {
      type: "Feature",
      properties: { 
        name: selectedCity,
        type: "city_bounds" 
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [southWest[1], southWest[0]], // SW
          [northEast[1], southWest[0]], // SE  
          [northEast[1], northEast[0]], // NE
          [southWest[1], northEast[0]], // NW
          [southWest[1], southWest[0]]  // Close polygon
        ]]
      }
    };
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={initialZoom}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
      whenCreated={(map) => {
        mapRef.current = map;
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapSearch />
      
      {/* Drawing Tools */}
      <FeatureGroup ref={featureGroupRef}>
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
            polygon: isDrawing
              ? {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: { 
                    color: "#ff0000",
                    fillColor: "#ff0000",
                    fillOpacity: 0.5,
                    weight: 2
                  },
                }
              : false,
          }}
          edit={{
            remove: isDrawing,
            edit: isDrawing,
          }}
        />
      </FeatureGroup>

      {/* Provincial Boundaries */}
      {jatengBoundary && <GeoJSON data={jatengBoundary} style={boundaryStyle} />}
      {diyBoundary && <GeoJSON data={diyBoundary} style={boundaryStyle} />}

      {/* City Bounds Highlight */}
      {cityBounds && selectedCity && (
        <GeoJSON 
          data={createCityBoundsGeoJSON()} 
          style={cityHighlightStyle}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(`
              <div class="city-bounds-popup">
                <h6 class="text-success mb-2">📍 Area Target Terpilih</h6>
                <p class="mb-1"><strong>${selectedCity}</strong></p>
                <small class="text-muted">
                  Lokasi siap untuk penambahan aset Yardip baru.<br/>
                  Gunakan tool menggambar untuk menandai area aset.
                </small>
              </div>
            `, {
              className: 'custom-popup'
            });
            
            setTimeout(() => {
              if (layer && layer.openPopup) {
                layer.openPopup();
                setTimeout(() => {
                  if (layer && layer.closePopup) {
                    layer.closePopup();
                  }
                }, 3000);
              }
            }, 1000);
          }}
        />
      )}

      {/* Manually Adjusted Polygon */}
      {adjustedGeometry && (
        <GeoJSON
          key={`adjusted-${manualAreaAdjustment}`}
          data={adjustedGeometry}
          style={adjustedPolygonStyle}
          onEachFeature={onEachAdjustedFeature}
        />
      )}

      {/* Existing Assets */}
      {assets.length > 0 &&
        assets.map((asset, idx) => {
          const geoJsonAsset = createGeoJSONFromAsset(asset);
          return geoJsonAsset ? (
            <GeoJSON
              key={`asset-${asset.id || idx}`}
              data={geoJsonAsset}
              style={assetStyle}
              onEachFeature={onEachAssetFeature}
            />
          ) : null;
        })}

      {/* Highlight Korem/Kodim */}
      {selectedKodim && selectedKodim.geometry && (
        <GeoJSON data={selectedKodim.geometry} style={kodimStyle} />
      )}
      {selectedKorem && selectedKorem.geometry && (
        <GeoJSON data={selectedKorem.geometry} style={koremStyle} />
      )}
    </MapContainer>
  );
};

export default PetaAsetYardip;
