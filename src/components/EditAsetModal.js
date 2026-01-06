import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Polygon,
  useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import toast from "react-hot-toast";

import FormAset from "./FormAset";
import { parseLocation, getCentroid } from "../utils/locationUtils";
import * as turf from "@turf/turf";

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
    if (
      map &&
      geometry &&
      geometry.coordinates &&
      geometry.coordinates.length > 0
    ) {
      const geoJsonCoords = geometry.coordinates[0].map((latLng) => [
        latLng[1],
        latLng[0],
      ]);
      const geoJsonGeometry = {
        type: "Polygon",
        coordinates: [geoJsonCoords],
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

const EditAsetModal = ({
  show,
  onHide,
  asset,
  koremList,
  onSave,
  isSaving,
}) => {
  const [geometry, setGeometry] = useState(null);
  const [geometryChanged, setGeometryChanged] = useState(false);
  const featureGroupRef = useRef();
  const formAsetRef = useRef();

  useEffect(() => {
    if (asset) {
      const locationData = parseLocation(asset.lokasi);
      if (locationData && locationData.type === "Polygon") {
        const latLngs = locationData.coordinates[0].map((coord) => [
          coord[1],
          coord[0],
        ]);
        setGeometry({ type: "Polygon", coordinates: [latLngs] });
        setGeometryChanged(false);
      } else {
        setGeometry(null);
        setGeometryChanged(false);
      }
    } else {
      setGeometry(null);
      setGeometryChanged(false);
    }
  }, [asset]);

  const handleSave = () => {
    if (formAsetRef.current) {
      const {
        formData: latestFormData,
        buktiPemilikanFile,
        assetPhotos,
      } = formAsetRef.current.getFormData();

      console.log("=== SAVE DEBUG ===");
      console.log("Original formData:", latestFormData);
      console.log("Geometry state:", geometry);
      console.log("Geometry changed:", geometryChanged);

      let finalData = { ...latestFormData };

      // Jika geometry berubah, update lokasi dan luas
      if (geometryChanged && geometry) {
        console.log("Geometry changed - updating lokasi");

        const geoJsonForSave = {
          type: "Polygon",
          coordinates: [
            geometry.coordinates[0].map((latLng) => [latLng[1], latLng[0]]),
          ],
        };

        const area = turf.area(geoJsonForSave);
        const roundedArea = parseFloat(area.toFixed(2));

        console.log("Calculated area:", roundedArea);

        // Update luas dan lokasi
        finalData.luas = roundedArea;
        finalData.lokasi = geoJsonForSave;

        // Update luas sesuai status sertifikat
        if (finalData.pemilikan_sertifikat === "Ya") {
          finalData.sertifikat_luas = roundedArea;
          console.log("Updated sertifikat_luas:", roundedArea);
        } else {
          finalData.belum_sertifikat_luas = roundedArea;
          console.log("Updated belum_sertifikat_luas:", roundedArea);
        }
      } else {
        console.log("Geometry not changed - keeping original data");
        // Pastikan data luas dari form tetap digunakan dan disinkronkan ke 'luas' utama
        if (finalData.pemilikan_sertifikat === "Ya") {
          finalData.luas = finalData.sertifikat_luas;
          console.log(
            "Using sertifikat_luas from form:",
            finalData.sertifikat_luas
          );
        } else {
          finalData.luas = finalData.belum_sertifikat_luas;
          console.log(
            "Using belum_sertifikat_luas from form:",
            finalData.belum_sertifikat_luas
          );
        }
      }

      console.log("Final data to be saved:", finalData);
      console.log("=== END SAVE DEBUG ===");

      onSave(finalData, buktiPemilikanFile, assetPhotos);
    } else {
      toast.error("Tidak ada data untuk disimpan.");
    }
  };

  const onEdited = (e) => {
    console.log("onEdited event fired!");
    const layers = e.layers;
    layers.eachLayer((layer) => {
      console.log("Processing a layer in onEdited.");
      if (layer instanceof L.Polygon) {
        console.log("Layer is a polygon. Updating geometry state.");
        const geoJSON = layer.toGeoJSON();
        const latLngs = geoJSON.geometry.coordinates[0].map((coord) => [
          coord[1],
          coord[0],
        ]);
        setGeometry({ type: "Polygon", coordinates: [latLngs] });
        setGeometryChanged(true);
      }
    });
  };

  const onCreated = (e) => {
    const { layer } = e;
    if (layer instanceof L.Polygon) {
      const geoJSON = layer.toGeoJSON();
      const latLngs = geoJSON.geometry.coordinates[0].map((coord) => [
        coord[1],
        coord[0],
      ]);
      setGeometry({ type: "Polygon", coordinates: [latLngs] });
      setGeometryChanged(true);
      toast("Poligon baru dibuat. Jangan lupa klik 'Simpan Perubahan'.");
      featureGroupRef.current.removeLayer(layer);
    }
  };

  const handleEditStop = useCallback(() => {
    if (geometryChanged) {
      toast("Poligon diubah. Luas akan diperbarui saat menyimpan.");
    }
  }, [geometryChanged]);

  const mapCenter = geometry
    ? getCentroid({
        type: "Polygon",
        coordinates: [geometry.coordinates[0].map((c) => [c[1], c[0]])],
      })
    : [-7.7956, 110.3695];

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Aset Tanah: {asset?.nama || ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <h5>Data Formulir</h5>
            <div
              style={{
                maxHeight: "65vh",
                overflowY: "auto",
                paddingRight: "15px",
              }}
            >
              {asset && (
                <FormAset
                  ref={formAsetRef}
                  assetToEdit={asset}
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
                  onEditStop={handleEditStop}
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
        <Button variant="secondary" onClick={onHide} disabled={isSaving}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span className="ms-2">Menyimpan...</span>
            </>
          ) : (
            "Simpan Perubahan"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditAsetModal;
