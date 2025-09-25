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
      setFormData({ ...asset, lokasi: initialGeometry }); // Pass geometry to form
    } else {
      setFormData(null);
      setGeometry(null);
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
        const area = turf.area(geoJsonForSave);
        finalData.area = parseFloat(area.toFixed(2));
        finalData.lokasi = JSON.stringify(geoJsonForSave); // Save as stringified GeoJSON object
      }
      
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

        // Update form data with new area
        const area = turf.area(geoJSON.geometry);
        setFormData(prev => ({...prev, area: parseFloat(area.toFixed(2))}));
      }
    });
  };

  const onCreated = (e) => {
    const { layer } = e;
    if (layer instanceof L.Polygon) {
      featureGroupRef.current.clearLayers(); // Clear previous layers
      featureGroupRef.current.addLayer(layer); // Add the new one
      const geoJSON = layer.toGeoJSON();
      const latLngs = geoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
      const newGeometry = { type: "Polygon", coordinates: [latLngs] };
      setGeometry(newGeometry);

      const area = turf.area(geoJSON.geometry);
      setFormData(prev => ({...prev, area: parseFloat(area.toFixed(2))}));
      toast.success("Poligon baru berhasil dibuat.");
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
                  assetToEdit={formData} // Pass the whole formData so area updates are reflected
                  isEditMode={true}
                  isEnabled={true}
                  onSave={() => {}} // Dummy onSave
                  onCancel={onHide}
                  selectedProvinceName={formData.provinsi}
                  selectedKabupatenName={formData.kabkota}
                  initialArea={formData.area}
                  provinsiData={provinsiData}
                  kabupatenData={kabupatenData}
                  onLocationChange={handleLocationChange}
                  isPolygonCreated={true}
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
                    polygon: !geometry, // Allow creating only if no polygon exists
                  }}
                  edit={{
                    edit: !!geometry, // Allow editing only if a polygon exists
                    remove: false, // Disallow removal for now
                  }}
                />
              </FeatureGroup>
            </MapContainer>
            <Form.Text className="mt-2">
              Gunakan kontrol di pojok kanan atas peta untuk membuat atau mengedit poligon.
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
