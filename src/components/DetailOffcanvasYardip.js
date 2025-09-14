import React from "react";
import {
  Offcanvas,
  Badge,
  Card,
  Row,
  Col,
  Button,
} from "react-bootstrap";
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaRulerCombined,
  FaTag,
  FaInfoCircle,
  FaLayerGroup,
  FaGlobe,
  FaIdCard,
  FaUser,
  FaCertificate,
} from "react-icons/fa";
import PetaAsetYardip from "./PetaAsetYardip";

// Helper untuk mendapatkan warna badge berdasarkan status
const getStatusBadgeVariant = (status) => {
  switch (status) {
    case "Dimiliki/Dikuasai":
      return "success";
    case "Tidak Dimiliki/Tidak Dikuasai":
      return "danger";
    case "Lain-lain":
      return "warning";
    case "Dalam Proses":
      return "info";
    case "Aktif":
      return "success";
    case "Sengketa":
      return "danger";
    case "Tidak Aktif":
      return "secondary";
    default:
      return "light";
  }
};

const DetailOffcanvasYardip = ({
  show,
  handleClose,
  asetYardip,
}) => {
  if (!asetYardip) return null;

  // Siapkan data untuk mini-map
  const assetForMap = asetYardip.lokasi ? [{ ...asetYardip }] : [];

  // Validasi dan sanitasi data lokasi
  const validateLocationData = (asset) => {
    if (!asset.lokasi) return null;

    let lokasi = asset.lokasi;

    if (typeof lokasi === "string") {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        return null;
      }
    }

    if (Array.isArray(lokasi) && lokasi.length > 0) {
      if (Array.isArray(lokasi[0])) {
        return lokasi;
      }
    }

    if (lokasi.type === "Polygon" && lokasi.coordinates) {
      return lokasi.coordinates;
    }

    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }

    return null;
  };

  const validatedLocation = validateLocationData(asetYardip);
  const hasValidLocation = validatedLocation !== null;

  // Prepare asset for map display
  const prepareAssetForMap = () => {
    if (!hasValidLocation) return [];

    return [{
      id: asetYardip.id || `temp-${Date.now()}`,
      nama: asetYardip.pengelola || "Unknown",
      kodim: asetYardip.bidang || "",
      lokasi: validatedLocation,
      luas: Number(asetYardip.area) || 0,
      status: asetYardip.status || "",
      kabkota: asetYardip.kabkota || "",
      kecamatan: asetYardip.kecamatan || "",
      kelurahan: asetYardip.kelurahan || "",
      type: "yardip",
    }];
  };

  const assetForMapDisplay = prepareAssetForMap();

  return (
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="end"
      backdrop={true}
      style={{ width: "600px" }}
    >
      <Offcanvas.Header
        closeButton
        className="bg-success text-white border-bottom"
      >
        <Offcanvas.Title as="h5">
          <FaBuilding className="me-2" />
          Detail Aset Yardip
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body style={{ padding: 0 }}>
        {/* Mini Map Preview */}
        {asetYardip.lokasi && (
          <div style={{ height: "200px", width: "100%" }}>
            <PetaAsetYardip
              key={`detail-yardip-${asetYardip.id}-${asetYardip.updated_at || Date.now()}`}
              assets={assetForMapDisplay}
              fitBounds={true}
              isDrawing={false}
            />
          </div>
        )}

        <div
          style={{
            padding: "1rem",
            maxHeight: "calc(100vh - 300px)",
            overflowY: "auto",
          }}
        >
          {/* Main Info Card */}
          <Card className="mb-3 shadow-sm">
            <Card.Header className="bg-success text-white">
              <FaBuilding className="me-2" /> Informasi Aset Yardip
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h5 className="mb-1">{asetYardip.pengelola || "N/A"}</h5>
                <small className="text-muted">
                  Pengelola Aset
                </small>
                <div className="mt-2">
                  <Badge bg={getStatusBadgeVariant(asetYardip.status)} pill>
                    {asetYardip.status || "Status Tidak Diketahui"}
                  </Badge>
                  <Badge bg="info" pill className="ms-2">
                    {asetYardip.bidang || "Bidang Tidak Diketahui"}
                  </Badge>
                </div>
              </div>

              {/* Detailed Information Table */}
              <div className="table-responsive">
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td width="40%">
                        <strong>ID:</strong>
                      </td>
                      <td>{asetYardip.id || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Pengelola:</strong>
                      </td>
                      <td>{asetYardip.pengelola || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Bidang:</strong>
                      </td>
                      <td>
                        <Badge bg="info">{asetYardip.bidang || "-"}</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Provinsi:</strong>
                      </td>
                      <td>{asetYardip.provinsi || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kabupaten/Kota:</strong>
                      </td>
                      <td>{asetYardip.kabkota || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kecamatan:</strong>
                      </td>
                      <td>{asetYardip.kecamatan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Kelurahan/Desa:</strong>
                      </td>
                      <td>{asetYardip.kelurahan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Peruntukan:</strong>
                      </td>
                      <td>{asetYardip.peruntukan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Status:</strong>
                      </td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(asetYardip.status)}>
                          {asetYardip.status || "-"}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Luas Area:</strong>
                      </td>
                      <td>
                        {asetYardip.area ? (
                          <span className="text-success">
                            {Number(asetYardip.area).toLocaleString("id-ID")} m²
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Keterangan:</strong>
                      </td>
                      <td>{asetYardip.keterangan || "-"}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Koordinat:</strong>
                      </td>
                      <td>
                        {hasValidLocation && validatedLocation ? (
                          <div>
                            <small className="text-muted">
                              Polygon dengan{" "}
                              {Array.isArray(validatedLocation)
                                ? validatedLocation[0]?.length || 0
                                : 0}{" "}
                              titik
                            </small>
                            <details className="mt-1">
                              <summary
                                style={{
                                  cursor: "pointer",
                                  fontSize: "0.8em",
                                }}
                              >
                                Lihat koordinat
                              </summary>
                              <div
                                style={{
                                  maxHeight: "100px",
                                  overflowY: "auto",
                                  fontSize: "0.7em",
                                }}
                              >
                                {Array.isArray(validatedLocation) &&
                                validatedLocation[0] ? (
                                  validatedLocation[0].map((coord, idx) => (
                                    <div key={idx}>
                                      {idx + 1}: [
                                      {coord[0]?.toFixed(6) || "N/A"},{" "}
                                      {coord[1]?.toFixed(6) || "N/A"}]
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-muted">
                                    Format koordinat tidak valid
                                  </span>
                                )}
                              </div>
                            </details>
                          </div>
                        ) : (
                          <span className="text-muted">Tidak tersedia</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Tanggal Dibuat:</strong>
                      </td>
                      <td>
                        {asetYardip.created_at
                          ? new Date(asetYardip.created_at).toLocaleString("id-ID")
                          : "-"}
                      </td>
                    </tr>
                    {asetYardip.updated_at && (
                      <tr>
                        <td>
                          <strong>Terakhir Diubah:</strong>
                        </td>
                        <td>
                          {new Date(asetYardip.updated_at).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>

          {/* Geographic Information Card */}
          {hasValidLocation && (
            <Card className="mb-3 shadow-sm">
              <Card.Header className="bg-warning text-dark">
                <FaGlobe className="me-2" /> Informasi Geografis
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col sm={6}>
                    <div className="mb-2">
                      <strong>Tipe Geometri:</strong>
                      <br />
                      <span className="text-muted">Polygon</span>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-2">
                      <strong>Jumlah Koordinat:</strong>
                      <br />
                      <span className="text-muted">
                        {Array.isArray(validatedLocation) &&
                        validatedLocation[0]
                          ? validatedLocation[0].length
                          : 0}{" "}
                        titik
                      </span>
                    </div>
                  </Col>
                  <Col sm={12}>
                    <div className="mb-0">
                      <strong>Luas Kalkulasi:</strong>
                      <br />
                      <span className="text-success">
                        {asetYardip.area
                          ? `${Number(asetYardip.area).toLocaleString("id-ID")} m²`
                          : "Tidak tersedia"}
                      </span>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Location Details Card */}
          <Card className="mb-3 shadow-sm">
            <Card.Header className="bg-info text-white">
              <FaMapMarkerAlt className="me-2" /> Detail Lokasi
            </Card.Header>
            <Card.Body>
              <Row>
                <Col sm={6}>
                  <div className="mb-2">
                    <strong>Provinsi:</strong>
                    <br />
                    <span className="text-muted">
                      {asetYardip.provinsi || "Tidak tersedia"}
                    </span>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="mb-2">
                    <strong>Kabupaten/Kota:</strong>
                    <br />
                    <span className="text-muted">
                      {asetYardip.kabkota || "Tidak tersedia"}
                    </span>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="mb-2">
                    <strong>Kecamatan:</strong>
                    <br />
                    <span className="text-muted">
                      {asetYardip.kecamatan || "Tidak tersedia"}
                    </span>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="mb-0">
                    <strong>Kelurahan/Desa:</strong>
                    <br />
                    <span className="text-muted">
                      {asetYardip.kelurahan || "Tidak tersedia"}
                    </span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Additional Information */}
          {asetYardip.keterangan && (
            <Card className="mb-3 shadow-sm">
              <Card.Header className="bg-secondary text-white">
                <FaInfoCircle className="me-2" /> Keterangan Tambahan
              </Card.Header>
              <Card.Body>
                <p className="mb-0">{asetYardip.keterangan}</p>
              </Card.Body>
            </Card>
          )}
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default DetailOffcanvasYardip;