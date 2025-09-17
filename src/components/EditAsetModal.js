import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import toast from "react-hot-toast";

import FormAset from "./FormAset";
import { parseLocation, getCentroid } from "../utils/locationUtils";

// Fix for broken icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const EditMapController = ({ geometry }) => {
  const map = useMap();

  useEffect(() => {
    if (map && geometry && geometry.coordinates && geometry.coordinates.length > 0) {
      const geoJsonCoords = geometry.coordinates[0].map(latLng => [latLng[1], latLng[0]]);
      const geoJsonGeometry = {
        type: "Polygon",
        coordinates: [geoJsonCoords]
      };
      
      const layer = L.geoJSON(geoJsonGeometry);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    }
  }, [map, geometry]);

  return null;
};

const EditAsetModal = ({ show, onHide, asset, koremList, onSave }) => {
  const [formData, setFormData] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const featureGroupRef = useRef();
  const formAsetRef = useRef(); // Create a ref for FormAset

  useEffect(() => {
    if (asset) {
      setFormData({ ...asset });
      const locationData = parseLocation(asset.lokasi);
      if (locationData && locationData.type === "Polygon") {
        const latLngs = locationData.coordinates[0].map(coord => [coord[1], coord[0]]);
        setGeometry({ type: "Polygon", coordinates: [latLngs] });
      } else {
        setGeometry(null);
      }
    } else {
      setFormData(null);
      setGeometry(null);
    }
  }, [asset]);

  const handleSave = () => {
    if (formAsetRef.current) {
      const { formData: latestFormData, buktiPemilikanFile, assetPhotos } = formAsetRef.current.getFormData();
      
      let finalData = { ...latestFormData };
      if (geometry) {
        const geoJsonCoords = geometry.coordinates[0].map(latLng => [latLng[1], latLng[0]]);
        finalData.lokasi = {
          type: "Polygon",
          coordinates: [geoJsonCoords],
        };
      }
      onSave(finalData, buktiPemilikanFile, assetPhotos);
    } else {
      toast.error("Tidak ada data untuk disimpan.");
    }
  };

  const onEdited = (e) => {
    const layers = e.layers;
    layers.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        const geoJSON = layer.toGeoJSON();
        const latLngs = geoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        setGeometry({ type: "Polygon", coordinates: [latLngs] });
      }
    });
  };

  const onCreated = (e) => {
    const { layer } = e;
    if (layer instanceof L.Polygon) {
      const geoJSON = layer.toGeoJSON();
      const latLngs = geoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
      setGeometry({ type: "Polygon", coordinates: [latLngs] });
      toast.success("Poligon baru berhasil dibuat.");
      featureGroupRef.current.removeLayer(layer);
    }
  };
  
  const mapCenter = geometry ? getCentroid({type: 'Polygon', coordinates: [geometry.coordinates[0].map(c => [c[1], c[0]])]}) : [-7.7956, 110.3695];

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Aset Tanah: {asset?.nama || ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <h5>Data Formulir</h5>
            <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '15px' }}>
              {formData && (
                <FormAset
                  ref={formAsetRef}
                  assetToEdit={formData}
                  koremList={koremList}
                  onCancel={onHide}
                  isEditMode={true}
                  isEnabled={true}
                />
              )}
            </div>
          </Col>
          <Col md={6}>
            <h5>Edit Lokasi Peta</h5>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: "65vh", width: "100%" }}
            >
              <EditMapController geometry={geometry} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
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
                {geometry && <Polygon positions={geometry.coordinates[0]} />}
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

export default EditAsetModal;
