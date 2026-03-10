import { useNavigate } from "react-router-dom";
import React, { useState, Fragment, useEffect } from "react";
import {
  Offcanvas,
  Badge,
  Card,
  Row,
  Col,
  Button,
  Image,
  Modal,
  Spinner,
} from "react-bootstrap";
import {
  FaBuilding,
  FaInfoCircle,
  FaImage,
  FaExpand,
  FaCompress,
  FaRedo,
  FaUndo,
  FaTimes,
  FaMapMarkerAlt,
} from "react-icons/fa";
import PetaAsetYardip from "./PetaAsetYardip";
import { parseLocation, getCentroid } from "../utils/locationUtils";
import "./DetailOffcanvasAset.css";

const API_URL = "http://localhost:3001";

// Helper untuk mendapatkan warna badge berdasarkan status
const getStatusBadgeVariant = (status) => {
  if (!status) return "secondary";
  const s = status.toLowerCase();
  if (s.includes("tidak")) return "danger";
  if (s.includes("dimiliki") || s.includes("dikuasai")) return "success";
  return "warning";
};

// Helper function untuk cek file type
const isImageFile = (filename) => {
  if (!filename) return false;
  return [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].some(ext => filename.toLowerCase().endsWith(ext));
};

const isPdfFile = (filename) => filename?.toLowerCase().endsWith(".pdf");
const isVideoFile = (filename) => [".mp4", ".mov", ".webm", ".avi"].some(ext => filename?.toLowerCase().endsWith(ext));

const DetailOffcanvasYardip = ({ show, handleClose, asetYardip }) => {
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);
  
  // State untuk Foto Aset
  const [fotoAsetPreviewMedia, setFotoAsetPreviewMedia] = useState(null);
  const [showFotoAsetPreviewModal, setShowFotoAsetPreviewModal] = useState(false);
  const [fotoAsetCurrentIndex, setFotoAsetCurrentIndex] = useState(0);
  const [fotoAsetPhotos, setFotoAsetPhotos] = useState([]);

  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const [p, k] = await Promise.all([fetch("/data/provinsi.geojson"), fetch("/data/kabupaten_kota.geojson")]);
        setProvinsiData(await p.json());
        setKabupatenData(await k.json());
      } catch (e) { console.error(e); }
    };
    if (show) loadGeoData();
  }, [show]);

  const handlePreviewMedia = (url, isPdf = false) => {
    const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
    setPreviewMedia({ url: fullUrl, isPdf, isVideo: isVideoFile(url) });
    setShowPreviewModal(true);
  };

  // Handlers untuk Foto Aset
  const handleFotoAsetPreview = (url, index = 0, allPhotos = []) => {
    const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
    setFotoAsetPreviewMedia({ url: fullUrl, isVideo: isVideoFile(url) });
    setFotoAsetCurrentIndex(index);
    setFotoAsetPhotos(allPhotos);
    setShowFotoAsetPreviewModal(true);
  };

  const handleFotoAsetNext = () => {
    if (fotoAsetPhotos.length > 1) {
      const newIndex = (fotoAsetCurrentIndex + 1) % fotoAsetPhotos.length;
      const newUrl = fotoAsetPhotos[newIndex];
      const fullUrl = newUrl.startsWith("http") ? newUrl : `${API_URL}${newUrl}`;
      setFotoAsetPreviewMedia({ url: fullUrl, isVideo: isVideoFile(newUrl) });
      setFotoAsetCurrentIndex(newIndex);
    }
  };

  const handleFotoAsetPrev = () => {
    if (fotoAsetPhotos.length > 1) {
      const newIndex = (fotoAsetCurrentIndex - 1 + fotoAsetPhotos.length) % fotoAsetPhotos.length;
      const newUrl = fotoAsetPhotos[newIndex];
      const fullUrl = newUrl.startsWith("http") ? newUrl : `${API_URL}${newUrl}`;
      setFotoAsetPreviewMedia({ url: fullUrl, isVideo: isVideoFile(newUrl) });
      setFotoAsetCurrentIndex(newIndex);
    }
  };

  if (!asetYardip) return null;

  const locationData = parseLocation(asetYardip.lokasi);
  const hasValidLocation = locationData && locationData.type === "Polygon";
  const centroid = hasValidLocation ? getCentroid(locationData) : null;

  return (
    <Fragment>
      <Offcanvas show={show} onHide={handleClose} placement="end" className="detail-offcanvas">
        <Offcanvas.Header closeButton className="bg-primary text-white border-bottom">
          <Offcanvas.Title as="h5"><FaBuilding className="me-2" />Detail Aset Yardip</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body style={{ padding: 0 }}>
          <div className="offcanvas-map-container">
            {hasValidLocation && provinsiData && kabupatenData ? (
              <PetaAsetYardip
                assets={[{ ...asetYardip, type: "aset" }]}
                provinsiData={provinsiData}
                kabupatenData={kabupatenData}
                mode="detail"
              />
            ) : (
              <div className="d-flex justify-content-center align-items-center h-100 bg-light text-muted">
                <p>{hasValidLocation ? "Memuat peta..." : "Lokasi tidak tersedia"}</p>
              </div>
            )}
          </div>

          <div className="offcanvas-content-wrapper">
            <Card className="mb-3 shadow-sm border-0">
              <Card.Body>
                <div className="mb-3">
                  <h5 className="mb-1">{asetYardip.pengelola || "N/A"}</h5>
                  <Badge bg={getStatusBadgeVariant(asetYardip.status)} pill>{asetYardip.status || "Status N/A"}</Badge>
                  <Badge bg="info" pill className="ms-2">{asetYardip.bidang || "Bidang N/A"}</Badge>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm table-borderless mb-0">
                    <tbody>
                      <tr><td width="40%"><strong>Pengelola:</strong></td><td>{asetYardip.pengelola || "-"}</td></tr>
                      <tr><td><strong>Bidang:</strong></td><td>{asetYardip.bidang || "-"}</td></tr>
                      <tr><td><strong>Provinsi:</strong></td><td>{asetYardip.provinsi || "-"}</td></tr>
                      <tr><td><strong>Kota/Kab:</strong></td><td>{asetYardip.kabkota || "-"}</td></tr>
                      <tr><td><strong>Kecamatan:</strong></td><td>{asetYardip.kecamatan || "-"}</td></tr>
                      <tr><td><strong>Kelurahan:</strong></td><td>{asetYardip.kelurahan || "-"}</td></tr>
                      <tr><td><strong>Peruntukan:</strong></td><td>{asetYardip.peruntukan || "-"}</td></tr>
                      <tr><td><strong>Luas Area:</strong></td><td><span className="text-primary fw-bold">{asetYardip.area ? `${Number(asetYardip.area).toLocaleString("id-ID")} m²` : "-"}</span></td></tr>
                      
                      {asetYardip.bukti_pemilikan_url && (
                        <tr>
                          <td><strong>Bukti Pemilikan:</strong></td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {isImageFile(asetYardip.bukti_pemilikan_filename) && (
                                <div style={{ width: "40px", height: "40px", borderRadius: "4px", overflow: "hidden", border: "1px solid #ddd" }}>
                                  <img src={asetYardip.bukti_pemilikan_url.startsWith("http") ? asetYardip.bukti_pemilikan_url : `${API_URL}${asetYardip.bukti_pemilikan_url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="bukti" />
                                </div>
                              )}
                              <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => handlePreviewMedia(asetYardip.bukti_pemilikan_url, isPdfFile(asetYardip.bukti_pemilikan_filename))}>
                                {isPdfFile(asetYardip.bukti_pemilikan_filename) ? "Lihat PDF" : "Lihat Gambar"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr><td><strong>Sejarah:</strong></td><td style={{ whiteSpace: "pre-wrap" }}>{asetYardip.keterangan || "-"}</td></tr>
                      <tr><td><strong>Koordinat:</strong></td><td>{centroid ? `Lat: ${centroid[0].toFixed(6)}, Lng: ${centroid[1].toFixed(6)}` : "-"}</td></tr>
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>

            {/* FOTO TAMPAK ATAS */}
            {asetYardip.gambar_tampak_atas_url && (
              <Card className="mb-3 shadow-sm">
                <Card.Header className="bg-light">
                  <strong>Foto Aset Tampak Atas</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4} className="mb-3">
                      <Card
                        onClick={() => handleFotoAsetPreview(asetYardip.gambar_tampak_atas_url)}
                        className="h-100"
                        style={{ cursor: "pointer", border: "1px solid #ddd" }}
                      >
                        <Card.Img
                          variant="top"
                          src={
                            asetYardip.gambar_tampak_atas_url.startsWith("http")
                              ? asetYardip.gambar_tampak_atas_url
                              : `${API_URL}${asetYardip.gambar_tampak_atas_url}`
                          }
                          alt="Foto Aset Tampak Atas"
                          style={{ height: "150px", width: "100%", objectFit: "cover" }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* FOTO ASET */}
            {asetYardip.foto_aset && Array.isArray(asetYardip.foto_aset) && asetYardip.foto_aset.length > 0 && (
              <Card className="mb-3 shadow-sm">
                <Card.Header className="bg-light">
                  <strong>Foto Aset</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    {asetYardip.foto_aset.map((foto, index) => {
                      const fullUrl = foto.startsWith("http") ? foto : `${API_URL}${foto}`;
                      const isVideo = isVideoFile(foto);
                      return (
                        <Col key={index} md={4} className="mb-3">
                          <Card
                            onClick={() => handleFotoAsetPreview(foto, index, asetYardip.foto_aset)}
                            className="h-100"
                            style={{ cursor: "pointer", border: "1px solid #ddd" }}
                          >
                            {isVideo ? (
                              <video
                                src={fullUrl}
                                controls={false}
                                style={{ objectFit: "cover", width: "100%", height: "150px" }}
                              />
                            ) : (
                              <Card.Img
                                variant="top"
                                src={fullUrl}
                                alt={`Foto Aset ${index + 1}`}
                                style={{ height: "150px", width: "100%", objectFit: "cover" }}
                              />
                            )}
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </Card.Body>
              </Card>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Media Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="xl" centered dialogClassName={fullscreen ? 'fullscreen-modal' : ''}>
        <Modal.Header closeButton>
          <Modal.Title>Pratinjau Media</Modal.Title>
          <Button variant="outline-dark" size="sm" className="ms-auto me-2" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <FaCompress /> : <FaExpand />}
          </Button>
        </Modal.Header>
        <Modal.Body className="text-center bg-dark" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {previewMedia?.isPdf ? (
            <iframe src={previewMedia.url} style={{ width: "95%", height: "75vh", border: "none" }} title="pdf" />
          ) : previewMedia?.isVideo ? (
            <video src={previewMedia.url} controls autoPlay style={{ maxHeight: "70vh", maxWidth: "95%" }} />
          ) : (
            <img src={previewMedia?.url} alt="preview" style={{ maxHeight: "70vh", maxWidth: "95%", transform: `rotate(${rotation}deg)`, transition: "transform 0.3s" }} />
          )}

          {previewMedia && !previewMedia.isPdf && !previewMedia.isVideo && (
            <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", gap: "10px" }}>
              <Button variant="outline-light" size="sm" onClick={() => setRotation(r => r - 90)}><FaUndo /></Button>
              <Button variant="outline-light" size="sm" onClick={() => setRotation(r => r + 90)}><FaRedo /></Button>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Foto Aset Preview Modal */}
      <Modal 
        show={showFotoAsetPreviewModal} 
        onHide={() => { setShowFotoAsetPreviewModal(false); setFotoAsetPhotos([]); }} 
        size="xl" 
        centered
        dialogClassName="modal-95w"
        backdropClassName="modal-backdrop-dark"
      >
        <Modal.Header closeButton>
          <Modal.Title>Foto Aset {fotoAsetCurrentIndex + 1}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center bg-dark" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {fotoAsetPreviewMedia?.isVideo ? (
            <video src={fotoAsetPreviewMedia?.url} controls autoPlay style={{ maxHeight: "70vh", maxWidth: "95%" }} />
          ) : (
            <img src={fotoAsetPreviewMedia?.url} alt="preview" style={{ maxHeight: "70vh", maxWidth: "95%" }} />
          )}
        </Modal.Body>
        {fotoAsetPhotos.length > 1 && (
          <Modal.Footer className="justify-content-center">
            <Button variant="outline-primary" onClick={handleFotoAsetPrev}>
              <i className="fas fa-arrow-left me-2"></i>Sebelumnya
            </Button>
            <Button variant="outline-primary" onClick={handleFotoAsetNext}>
              Berikutnya<i className="fas fa-arrow-right ms-2"></i>
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </Fragment>
  );
};

export default DetailOffcanvasYardip;
