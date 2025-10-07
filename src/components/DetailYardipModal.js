import React from "react";
import { Modal, Button, Row, Col, Card, Table } from "react-bootstrap";
import {
  MapContainer,
  TileLayer,
  Polygon,
  useMap,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";

import { parseLocation } from "../utils/locationUtils";

// A simplified zoom controller for the detail map
const DetailMapController = ({ geometry }) => {
  const map = useMap();
  React.useEffect(() => {
    if (map && geometry) {
      try {
        // Create a GeoJSON object with correct coordinate order for bounds calculation
        const geoJsonForBounds = {
          type: "Polygon",
          coordinates: [
            geometry.coordinates[0].map((latLng) => [latLng[1], latLng[0]]),
          ],
        };
        const layer = L.geoJSON(geoJsonForBounds);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (e) {
        console.error("Could not fit bounds for detail map", e);
      }
    }
  }, [map, geometry]);
  return null;
};

const DetailYardipModal = ({ show, onHide, asset }) => {
  if (!asset) return null;

  const locationData = parseLocation(asset.lokasi);
  const hasValidLocation = locationData && locationData.type === "Polygon";

  let mapGeometry = null;
  if (hasValidLocation) {
    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng] for rendering
    const latLngs = locationData.coordinates[0].map((coord) => [
      coord[1],
      coord[0],
    ]);
    mapGeometry = { type: "Polygon", coordinates: [latLngs] };
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Dimiliki/Dikuasai":
        return "bg-success";
      case "Tidak Dimiliki/Tidak Dikuasai":
        return "bg-danger";
      default:
        return "bg-info";
    }
  };

  const getPolygonStyleByStatus = (status) => {
    switch (status) {
      case "Dimiliki/Dikuasai":
        return { color: "#28a745", weight: 2, fillOpacity: 0.6 }; // Green
      case "Tidak Dimiliki/Tidak Dikuasai":
        return { color: "#dc3545", weight: 2, fillOpacity: 0.6 }; // Red
      default:
        return { color: "#ffc107", weight: 2, fillOpacity: 0.6 }; // Yellow for Lain-lain
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Detail Aset Yardip: {asset.pengelola}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <Card>
              <Card.Header>
                <h5>Informasi Aset</h5>
              </Card.Header>
              <Card.Body>
                <Table borderless striped>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Pengelola</strong>
                      </td>
                      <td>{asset.pengelola || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Bidang</strong>
                      </td>
                      <td>{asset.bidang || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Provinsi</strong>
                      </td>
                      <td>{asset.provinsi || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kabupaten/Kota</strong>
                      </td>
                      <td>{asset.kabkota || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kecamatan</strong>
                      </td>
                      <td>{asset.kecamatan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kelurahan/Desa</strong>
                      </td>
                      <td>{asset.kelurahan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Peruntukan</strong>
                      </td>
                      <td>{asset.peruntukan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Status</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${getStatusBadgeClass(
                            asset.status
                          )}`}
                        >
                          {asset.status || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Luas Area</strong>
                      </td>
                      <td>
                        {asset.area
                          ? `${Number(asset.area).toLocaleString("id-ID")} m²`
                          : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Keterangan</strong>
                      </td>
                      <td style={{ whiteSpace: "pre-wrap" }}>
                        {asset.keterangan || "-"}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>
                <h5>Lokasi Peta</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div style={{ height: "100%", minHeight: "400px" }}>
                  {hasValidLocation ? (
                    <MapContainer
                      key={asset.id} // Ensure map re-renders when asset changes
                      center={[-7.5, 110.0]}
                      zoom={8}
                      style={{ height: "100%", width: "100%" }}
                      scrollWheelZoom={false}
                    >
                      <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Street Map">
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satelit">
                          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                        </LayersControl.BaseLayer>
                      </LayersControl>

                      <Polygon
                        positions={mapGeometry.coordinates[0]}
                        pathOptions={getPolygonStyleByStatus(asset.status)}
                      />
                      <DetailMapController geometry={mapGeometry} />
                    </MapContainer>
                  ) : (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <p className="text-muted">
                        Lokasi poligon tidak tersedia.
                      </p>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DetailYardipModal;
