import React, { useState, useEffect, Fragment } from "react";
import { Offcanvas, Badge, Card, Row, Col, Button, Image, Modal } from "react-bootstrap";
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaGlobe,
  FaFilePdf,
} from "react-icons/fa";
import { parseLocation } from "../utils/locationUtils";
import PetaAsetYardip from "./PetaAsetYardip";

const API_URL = "http://localhost:3001";

// Helper untuk mendapatkan warna badge berdasarkan status
const getStatusBadgeVariant = (status) => {
  switch (status) {
    case "Dimiliki/Dikuasai":
      return "success";
    case "Tidak Dimiliki/Tidak Dikuasai":
      return "danger";
    default:
      return "warning";
  }
};

// Helper functions
const isImageFile = (filename) => {
  if (!filename) return false;
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const isPdfFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".pdf");
};

const isVideoFile = (filename) => {
  if (!filename) return false;
  const videoExtensions = [".mp4", ".mov", ".webm", ".avi"];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const getFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_URL}${url}`;
  return `${API_URL}/${url}`;
};

// ===== PREVIEW MODAL BUKTI PEMILIKAN =====
const BuktiPreviewModal = ({ show, onHide, buktiPreviewMedia }) => (
  <Modal show={show} onHide={onHide} size="lg" centered>
    <Modal.Header closeButton>
      <Modal.Title>Bukti Kepemilikan</Modal.Title>
    </Modal.Header>
    <Modal.Body className="text-center">
      {buktiPreviewMedia?.isPdf ? (
        <iframe
          src={buktiPreviewMedia.url}
          style={{ width: "100%", height: "70vh", border: "none" }}
          title="Preview PDF"
        />
      ) : buktiPreviewMedia?.isVideo ? (
        <video
          src={buktiPreviewMedia.url}
          controls
          className="img-fluid"
          style={{ maxHeight: "70vh", objectFit: "contain" }}
          autoPlay
        >
          Browser Anda tidak mendukung elemen video.
        </video>
      ) : (
        <img
          src={buktiPreviewMedia?.url}
          alt="Preview Bukti Pemilikan"
          className="img-fluid"
          style={{ maxHeight: "70vh", objectFit: "contain" }}
        />
      )}
    </Modal.Body>
    <Modal.Footer>
      {buktiPreviewMedia && (
        <Button
          variant="info"
          onClick={() => window.open(buktiPreviewMedia.url, "_blank")}
          className="me-2"
        >
          Buka di Tab Baru
        </Button>
      )}
      <Button variant="secondary" onClick={onHide}>
        Tutup
      </Button>
    </Modal.Footer>
  </Modal>
);

const DetailOffcanvasYardip = ({ show, handleClose, asetYardip }) => {
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);
  const [buktiPreviewMedia, setBuktiPreviewMedia] = useState(null);
  const [showBuktiPreviewModal, setShowBuktiPreviewModal] = useState(false);

  // Load geojson data when offcanvas is shown
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

    if (show && asetYardip) {
      const locationData = parseLocation(asetYardip.lokasi);
      const hasValidLocation = locationData && locationData.type === "Polygon";
      if (hasValidLocation) {
        loadData();
      }
    }
  }, [show, asetYardip]);

  // ===== HANDLER PREVIEW BUKTI PEMILIKAN =====
  const handlePreviewBukti = (mediaUrl, filename) => {
    const fullUrl = mediaUrl.startsWith("http") ? mediaUrl : `${API_URL}${mediaUrl}`;
    setBuktiPreviewMedia({
      url: fullUrl,
      isVideo: isVideoFile(filename),
      isPdf: isPdfFile(filename),
    });
    setShowBuktiPreviewModal(true);
  };

  const handleCloseBuktiPreview = () => {
    setShowBuktiPreviewModal(false);
    setBuktiPreviewMedia(null);
  };

  if (!asetYardip) return null;

  const locationData = parseLocation(asetYardip.lokasi);
  const hasValidLocation = locationData && locationData.type === "Polygon";

  return (
    <Fragment>
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
        <div style={{ height: "250px", width: "100%" }}>
          {hasValidLocation && provinsiData && kabupatenData ? (
            <PetaAsetYardip
              assets={[
                {
                  id: asetYardip.id,
                  pengelola: asetYardip.pengelola,
                  lokasi: asetYardip.lokasi,
                  area: asetYardip.area,
                  status: asetYardip.status,
                  provinsi: asetYardip.provinsi,
                  kabkota: asetYardip.kabkota,
                  kecamatan: asetYardip.kecamatan,
                  kelurahan: asetYardip.kelurahan,
                  peruntukan: asetYardip.peruntukan,
                  keterangan: asetYardip.keterangan,
                  type: "aset",
                }
              ]}
              provinsiData={provinsiData}
              kabupatenData={kabupatenData}
              mode="detail"
            />
          ) : (
            <div className="d-flex justify-content-center align-items-center h-100 bg-light">
              <p className="text-muted">
                {hasValidLocation ? "Memuat peta..." : "Lokasi poligon tidak tersedia."}
              </p>
            </div>
          )}
        </div>

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
                <small className="text-muted">Pengelola Aset</small>
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
                    {/* BUKTI PEMILIKAN */}
                    {asetYardip.bukti_pemilikan_url && (
                      <tr>
                        <td>
                          <strong>Bukti Pemilikan:</strong>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {isImageFile(asetYardip.bukti_pemilikan_filename) && (
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  border: "1px solid #ddd",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                }}
                              >
                                <img
                                  src={getFileUrl(asetYardip.bukti_pemilikan_url)}
                                  alt="Preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: "0.8em" }}>
                                {asetYardip.bukti_pemilikan_filename}
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() =>
                                  handlePreviewBukti(
                                    asetYardip.bukti_pemilikan_url,
                                    asetYardip.bukti_pemilikan_filename
                                  )
                                }
                                className="p-0"
                                style={{ fontSize: "0.7em" }}
                              >
                                {isPdfFile(asetYardip.bukti_pemilikan_filename)
                                  ? "Lihat PDF"
                                  : "Lihat Gambar"}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {asetYardip.keterangan_bukti_pemilikan && (
                      <tr>
                        <td>
                          <strong>Keterangan Bukti:</strong>
                        </td>
                        <td>{asetYardip.keterangan_bukti_pemilikan}</td>
                      </tr>
                    )}
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
                        {hasValidLocation && locationData ? (
                          <div>
                            <small className="text-muted">
                              Polygon dengan{" "}
                              {locationData.coordinates[0]?.length || 0} titik
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
                                {locationData.coordinates[0] ? (
                                  locationData.coordinates[0].map(
                                    (coord, idx) => (
                                      <div key={idx}>
                                        {idx + 1}: [
                                        {coord[0]?.toFixed(6) || "N/A"},{" "}
                                        {coord[1]?.toFixed(6) || "N/A"}]
                                      </div>
                                    )
                                  )
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
                          ? new Date(asetYardip.created_at).toLocaleString(
                            "id-ID"
                          )
                          : "-"}
                      </td>
                    </tr>
                    {asetYardip.updated_at && (
                      <tr>
                        <td>
                          <strong>Terakhir Diubah:</strong>
                        </td>
                        <td>
                          {new Date(asetYardip.updated_at).toLocaleString(
                            "id-ID"
                          )}
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
                        {locationData.coordinates[0]?.length || 0} titik
                      </span>
                    </div>
                  </Col>
                  <Col sm={12}>
                    <div className="mb-0">
                      <strong>Luas Kalkulasi:</strong>
                      <br />
                      <span className="text-success">
                        {asetYardip.area
                          ? `${Number(asetYardip.area).toLocaleString(
                            "id-ID"
                          )} m²`
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

    {/* ===== PREVIEW MODAL BUKTI PEMILIKAN ===== */}
    <BuktiPreviewModal
      show={showBuktiPreviewModal}
      onHide={handleCloseBuktiPreview}
      buktiPreviewMedia={buktiPreviewMedia}
    />
    </Fragment>
  );
};

export default DetailOffcanvasYardip;
