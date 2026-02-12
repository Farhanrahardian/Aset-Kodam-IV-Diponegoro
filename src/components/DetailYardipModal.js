import React, { useState, useEffect } from "react";
import { Modal, Button, Row, Col, Card, Table } from "react-bootstrap";
import { parseLocation } from "../utils/locationUtils";
import PetaAsetYardip from "./PetaAsetYardip";

const DetailYardipModal = ({ show, onHide, asset }) => {
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);

  // Load geojson data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [provRes, kabRes] = await Promise.all([
          fetch("/data/provinsi.geojson"),
          fetch("/data/kabupaten_kota.geojson")
        ]);

        const provData = await provRes.json();
        const kabData = await kabRes.json();

        setProvinsiData(provData);
        setKabupatenData(kabData);
      } catch (error) {
        console.error("Error loading geojson data:", error);
      }
    };

    if (show && asset) {
      const locationData = parseLocation(asset.lokasi);
      const hasValidLocation = locationData && locationData.type === "Polygon";
      if (hasValidLocation) {
        loadData();
      }
    }
  }, [show, asset]);

  if (!asset) return null;

  const locationData = parseLocation(asset.lokasi);
  const hasValidLocation = locationData && locationData.type === "Polygon";

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

  // Prepare asset data for the map
  const assetForMap = hasValidLocation
    ? {
        id: asset.id || `temp-${Date.now()}`,
        pengelola: asset.pengelola || "Unknown",
        lokasi: asset.lokasi, // Pass original data, PetaAsetYardip will parse it
        area: Number(asset.area) || 0,
        status: asset.status || "",
        provinsi: asset.provinsi || "",
        kabkota: asset.kabkota || "",
        kecamatan: asset.kecamatan || "",
        kelurahan: asset.kelurahan || "",
        peruntukan: asset.peruntukan || "",
        keterangan: asset.keterangan || "",
        type: "aset",
      }
    : null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Aset Yardip: {asset.pengelola}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <Card>
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
              <Card.Body className="p-0">
                <div style={{ height: "100%", minHeight: "400px" }}>
                  {hasValidLocation && provinsiData && kabupatenData ? (
                    <PetaAsetYardip
                      assets={assetForMap ? [assetForMap] : []}
                      provinsiData={provinsiData}
                      kabupatenData={kabupatenData}
                      mode="detail"
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                      <div className="text-center">
                        <i className="fas fa-map-marker-alt fa-3x mb-3"></i>
                        <p>Lokasi tidak tersedia</p>
                        {!hasValidLocation && asset.lokasi && (
                          <div className="mt-2">
                            <small className="text-danger">
                              Data lokasi tidak valid atau rusak
                            </small>
                            <br />
                            <small className="text-muted">
                              Format: {typeof asset.lokasi}
                            </small>
                          </div>
                        )}
                      </div>
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
