import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Form } from 'react-bootstrap';
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import toast from 'react-hot-toast';
import * as turf from '@turf/turf';

import FormYardip from './FormYardip';
import { parseLocation } from '../utils/locationUtils';

// Fix for broken icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const ZoomController = ({ geometry }) => {
  const map = useMap();
  useEffect(() => {
    if (geometry) {
      try {
        // Create a fresh GeoJSON object with the correct coordinate order (lng, lat) for bounds calculation
        const geoJsonGeometry = {
          type: 'Polygon',
          coordinates: [geometry.coordinates[0].map(latLng => [latLng[1], latLng[0]])]
        };
        const layer = L.geoJSON(geoJsonGeometry);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error("Could not fit bounds for geometry", e);
      }
    }
  }, [map, geometry]);
  return null;
};

const EditYardipModal = ({ show, onHide, asset, onSave, provinsiData, kabupatenData }) => {
  const formRef = useRef();
  const featureGroupRef = useRef();
  const [formData, setFormData] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [manualArea, setManualArea] = useState(null); // NEW: Track manual area changes

  // Effect to programmatically add/update the polygon layer for editing
  useEffect(() => {
    const featureGroup = featureGroupRef.current;
    if (!featureGroup) return;

    featureGroup.clearLayers();
    if (geometry && geometry.coordinates) {
      try {
        const polygon = L.polygon(geometry.coordinates[0]);
        featureGroup.addLayer(polygon);
      } catch(e) {
        console.error("Failed to create polygon layer for editing:", e);
      }
    }
  }, [geometry]);

  const handleLocationChange = (provinsi, kabupaten) => {
    setFormData(prev => ({ ...prev, provinsi, kabkota: kabupaten }));
  };

  // NEW: Handler for manual area changes from form
  const handleManualAreaChange = (newArea) => {
    setManualArea(newArea);
    setFormData(prev => ({ ...prev, area: newArea }));
  };

  useEffect(() => {
    if (asset) {
      const locationData = parseLocation(asset.lokasi);
      let initialGeometry = null;
      if (locationData && locationData.type === "Polygon") {
        // Convert GeoJSON coords [lng, lat] to Leaflet LatLng [lat, lng]
        const latLngs = locationData.coordinates[0].map(coord => [coord[1], coord[0]]);
        initialGeometry = { type: "Polygon", coordinates: [latLngs] };
      }
      setGeometry(initialGeometry);
      setFormData({ ...asset, lokasi: initialGeometry });
      setManualArea(asset.area); // Initialize manual area with existing area
    } else {
      setFormData(null);
      setGeometry(null);
      setManualArea(null);
    }
  }, [asset]);

  const handleSave = () => {
    if (formRef.current) {
      const { formData: latestFormData } = formRef.current.getFormData();
      let finalData = { ...latestFormData };

      if (geometry) {
        // Convert Leaflet LatLng [lat, lng] back to GeoJSON coords [lng, lat] for saving
        const geoJsonForSave = {
          type: "Polygon",
          coordinates: [geometry.coordinates[0].map(latLng => [latLng[1], latLng[0]])]
        };
        
        // Use manual area if set, otherwise calculate from geometry
        let finalArea;
        if (manualArea !== null) {
          finalArea = manualArea;
        } else {
          const calculatedArea = turf.area(geoJsonForSave);
          finalArea = parseFloat(calculatedArea.toFixed(2));
        }
        
        finalData.area = finalArea;
        finalData.lokasi = JSON.stringify(geoJsonForSave);
      } else if (manualArea !== null) {
        // If no geometry but manual area was changed
        finalData.area = manualArea;
      }
      
      console.log("Saving data:", finalData); // Debug log
      onSave(finalData);
    }
  };

  const onEdited = (e) => {
    const layers = e.layers;
    layers.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        const geoJSON = layer.toGeoJSON();
        const latLngs = geoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        const newGeometry = { type: "Polygon", coordinates: [latLngs] };
        setGeometry(newGeometry);

        // Calculate new area from edited polygon
        const area = turf.area(geoJSON.geometry);
        const calculatedArea = parseFloat(area.toFixed(2));
        
        // Update both manual area and form data
        setManualArea(calculatedArea);
        setFormData(prev => ({...prev, area: calculatedArea}));
        
        toast.success(`Poligon berhasil diedit. Luas baru: ${calculatedArea.toLocaleString('id-ID')} m²`);
      }
    });
  };

  const onCreated = (e) => {
    const { layer } = e;
    if (layer instanceof L.Polygon) {
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);
      const geoJSON = layer.toGeoJSON();
      const latLngs = geoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
      const newGeometry = { type: "Polygon", coordinates: [latLngs] };
      setGeometry(newGeometry);

      const area = turf.area(geoJSON.geometry);
      const calculatedArea = parseFloat(area.toFixed(2));
      
      setManualArea(calculatedArea);
      setFormData(prev => ({...prev, area: calculatedArea}));
      
      toast.success(`Poligon baru berhasil dibuat. Luas: ${calculatedArea.toLocaleString('id-ID')} m²`);
    }
  };

  const mapCenter = geometry ? L.geoJSON(geometry).getBounds().getCenter() : [-7.5, 110.0];

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Aset Yardip: {asset?.pengelola || ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <h5>Data Formulir</h5>
            <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '15px' }}>
              {formData && (
                <FormYardip
                  ref={formRef}
                  assetToEdit={formData}
                  isEditMode={true}
                  isEnabled={true}
                  onSave={() => {}}
                  onCancel={onHide}
                  selectedProvinceName={formData.provinsi}
                  selectedKabupatenName={formData.kabkota}
                  initialArea={formData.area}
                  provinsiData={provinsiData}
                  kabupatenData={kabupatenData}
                  onLocationChange={handleLocationChange}
                  isPolygonCreated={true}
                  onManualAreaChange={handleManualAreaChange} // NEW: Pass handler
                />
              )}
            </div>
          </Col>
          <Col md={6}>
            <h5>Edit Lokasi Peta</h5>
            <MapContainer
              key={asset ? asset.id : 'new'}
              center={mapCenter}
              zoom={13}
              style={{ height: "65vh", width: "100%" }}
            >
              <ZoomController geometry={geometry} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FeatureGroup ref={featureGroupRef}>
                <EditControl
                  position="topright"
                  onEdited={onEdited}
                  onCreated={onCreated}
                  draw={{
                    rectangle: false,
                    circle: false,
                    circlemarker: false,
                    marker: false,
                    polyline: false,
                    polygon: !geometry,
                  }}
                  edit={{
                    edit: !!geometry,
                    remove: false,
                  }}
                />
              </FeatureGroup>
            </MapContainer>
            <Form.Text className="mt-2 d-block">
              Gunakan kontrol di pojok kanan atas peta untuk membuat atau mengedit poligon.
              {manualArea && (
                <div className="mt-2">
                  <strong>Luas saat ini:</strong> {manualArea.toLocaleString('id-ID')} m²
                </div>
              )}
            </Form.Text>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Simpan Perubahan
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditYardipModal;