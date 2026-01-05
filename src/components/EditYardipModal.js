import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const [geometryChanged, setGeometryChanged] = useState(false);

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
        const latLngs = locationData.coordinates[0].map(coord => [coord[1], coord[0]]);
        initialGeometry = { type: "Polygon", coordinates: [latLngs] };
      }
      setGeometry(initialGeometry);
      setFormData({ ...asset, lokasi: initialGeometry });
      setGeometryChanged(false); // Reset flag on asset change
    } else {
      setFormData(null);
      setGeometry(null);
      setGeometryChanged(false);
    }
  }, [asset]);

  const handleSave = () => {
    if (formRef.current) {
      const { formData: latestFormData } = formRef.current.getFormData();
      let finalData = { ...latestFormData };

      // If geometry was changed, recalculate area and location from the map polygon
      if (geometryChanged && geometry) {
        const geoJsonForSave = {
          type: "Polygon",
          coordinates: [geometry.coordinates[0].map(latLng => [latLng[1], latLng[0]])]
        };
        const calculatedArea = turf.area(geoJsonForSave);
        
        finalData.area = parseFloat(calculatedArea.toFixed(2));
        finalData.lokasi = JSON.stringify(geoJsonForSave);
      }
      // If geometry was NOT changed, the `latestFormData` (including any manual area changes) is used as is.
      
      console.log("Saving data:", finalData);
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
        setGeometryChanged(true); // Set flag to true
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
      setGeometryChanged(true); // Set flag to true
    }
  };

  const mapCenter = geometry ? L.geoJSON({
    type: 'Polygon',
    coordinates: [geometry.coordinates[0].map(latLng => [latLng[1], latLng[0]])]
  }).getBounds().getCenter() : [-7.5, 110.0];

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
              {geometryChanged && (
                <span className="text-warning fw-bold">
                  ⚠️ Poligon telah diubah. Luas akan diperbarui saat menyimpan.
                </span>
              )}
              {!geometryChanged && (
                <span>
                  Gunakan kontrol di pojok kanan atas peta untuk membuat atau
                  mengedit poligon.
                </span>
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