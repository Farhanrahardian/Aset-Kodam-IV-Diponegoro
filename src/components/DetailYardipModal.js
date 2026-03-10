import React, { useState, useEffect, Fragment } from "react";
import { Modal, Button, Row, Col, Card, Table, Image, Spinner } from "react-bootstrap";
import { parseLocation } from "../utils/locationUtils";
import PetaAsetYardip from "./PetaAsetYardip";
import { FaExpand, FaCompress, FaUndo, FaRedo } from "react-icons/fa";
import "./YardipModal.css";

const API_URL = "http://localhost:3001";

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

// ===== PREVIEW MODAL BUKTI PEMILIKAN (WITH FULLSCREEN & ROTATION) =====
const BuktiPreviewModal = ({ show, onHide, buktiPreviewMedia }) => {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setLoading(true);
      setFullscreen(false);
      setRotation(0);
    }
  }, [show]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onHide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  const handleLoad = () => {
    setLoading(false);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const rotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const rotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      dialogClassName={`modal-95w ${fullscreen ? 'fullscreen-modal' : ''}`}
      backdropClassName="modal-backdrop-dark"
    >
      <Modal.Header closeButton>
        <Modal.Title>Bukti Kepemilikan</Modal.Title>
        <div className="ms-auto">
          <Button
            variant="outline-light"
            size="sm"
            className="me-2"
            onClick={toggleFullscreen}
            title={fullscreen ? "Keluar Fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <FaCompress /> : <FaExpand />}
          </Button>
        </div>
      </Modal.Header>
      <Modal.Body
        className="text-center preview-body"
        style={{
          minHeight: "60vh",
          maxHeight: "75vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: "#000",
        }}
      >
        {loading && (
          <div className="loading-spinner" style={{ position: "absolute", zIndex: 10 }}>
            <Spinner animation="border" variant="light" size="xl" />
            <p className="text-light mt-2 mb-0">Memuat...</p>
          </div>
        )}

        {buktiPreviewMedia?.isPdf ? (
          <iframe
            src={buktiPreviewMedia.url}
            style={{ width: "95%", height: "70vh", border: "none" }}
            title="Preview PDF"
            onLoad={handleLoad}
          />
        ) : buktiPreviewMedia?.isVideo ? (
          <video
            src={buktiPreviewMedia.url}
            controls
            className="img-fluid"
            style={{
              maxHeight: "70vh",
              maxWidth: "95%",
              objectFit: "contain",
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.3s ease",
            }}
            autoPlay
            muted
            loop
            onLoadedData={handleLoad}
          >
            Browser Anda tidak mendukung elemen video.
          </video>
        ) : (
          <img
            src={buktiPreviewMedia?.url}
            alt="Preview Bukti Pemilikan"
            className="img-fluid"
            style={{
              maxHeight: "70vh",
              maxWidth: "95%",
              objectFit: "contain",
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.3s ease",
            }}
            onLoad={handleLoad}
          />
        )}

        {/* Rotation Controls (only for images) */}
        {!buktiPreviewMedia?.isPdf && !buktiPreviewMedia?.isVideo && (
          <div className="rotation-controls" style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 20,
            display: "flex",
            gap: "8px",
          }}>
            <Button
              variant="outline-light"
              size="sm"
              onClick={rotateLeft}
              title="Putar Kiri"
            >
              <FaUndo />
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={rotateRight}
              title="Putar Kanan"
            >
              <FaRedo />
            </Button>
          </div>
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
};

const DetailYardipModal = ({ show, onHide, asset }) => {
  const [buktiPreviewMedia, setBuktiPreviewMedia] = useState(null);
  const [showBuktiPreviewModal, setShowBuktiPreviewModal] = useState(false);
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);
  
  // State untuk Foto Aset
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMediaTitle, setPreviewMediaTitle] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [previewAssetPhotos, setPreviewAssetPhotos] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [previewRotation, setPreviewRotation] = useState(0);

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

  // Reset preview state when modal closes
  useEffect(() => {
    if (!showPreviewModal) {
      setPreviewLoading(true);
      setPreviewFullscreen(false);
      setPreviewRotation(0);
    }
  }, [showPreviewModal]);

  // Keyboard navigation for photo preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showPreviewModal) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPhoto();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreviewModal, currentPhotoIndex, previewAssetPhotos]);

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

  // ===== HANDLERS UNTUK FOTO ASET =====
  const handlePreviewMedia = (mediaUrl, title = "Preview Media Aset", index = 0, allPhotos = []) => {
    const fullUrl = mediaUrl.startsWith("http") ? mediaUrl : `${API_URL}${mediaUrl}`;
    setPreviewMedia({ url: fullUrl, isVideo: isVideoFile(mediaUrl) });
    setPreviewMediaTitle(title);
    setCurrentPhotoIndex(index);
    setPreviewAssetPhotos(allPhotos);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewMedia(null);
    setPreviewAssetPhotos([]);
    setCurrentPhotoIndex(0);
  };

  const handleNextPhoto = () => {
    if (previewAssetPhotos && previewAssetPhotos.length > 1) {
      const newIndex = (currentPhotoIndex + 1) % previewAssetPhotos.length;
      const newMediaUrl = previewAssetPhotos[newIndex];
      const fullUrl = newMediaUrl.startsWith("http") ? newMediaUrl : `${API_URL}${newMediaUrl}`;
      setPreviewMedia({ url: fullUrl, isVideo: isVideoFile(newMediaUrl) });
      setCurrentPhotoIndex(newIndex);
      setPreviewMediaTitle(`Foto Aset ${newIndex + 1}`);
      setPreviewLoading(true);
    }
  };

  const handlePrevPhoto = () => {
    if (previewAssetPhotos && previewAssetPhotos.length > 1) {
      const newIndex = (currentPhotoIndex - 1 + previewAssetPhotos.length) % previewAssetPhotos.length;
      const newMediaUrl = previewAssetPhotos[newIndex];
      const fullUrl = newMediaUrl.startsWith("http") ? newMediaUrl : `${API_URL}${newMediaUrl}`;
      setPreviewMedia({ url: fullUrl, isVideo: isVideoFile(newMediaUrl) });
      setCurrentPhotoIndex(newIndex);
      setPreviewMediaTitle(`Foto Aset ${newIndex + 1}`);
      setPreviewLoading(true);
    }
  };

  const handleImageLoad = () => {
    setPreviewLoading(false);
  };

  const togglePreviewFullscreen = () => {
    setPreviewFullscreen(!previewFullscreen);
  };

  const rotateLeft = () => {
    setPreviewRotation((prev) => prev - 90);
  };

  const rotateRight = () => {
    setPreviewRotation((prev) => prev + 90);
  };

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
    <Fragment>
      <Modal
        show={show}
        onHide={onHide}
        size="lg"
        centered
        className="yardip-modal detail-modal"
        dialogClassName="modal-65vw"
        contentClassName="modal-content-65vw"
        scrollable={false}
      >
        <Modal.Header closeButton className="bg-primary text-white border-bottom">
          <Modal.Title>
            <i className="fas fa-home me-2"></i>
            Detail Aset Yardip: {asset.pengelola}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Row className="g-0">
            <Col md={7} className="modal-info-wrapper">
              <div className="modal-info-scrollable">
                <Card className="shadow-sm border-0 mb-3">
                  <Card.Body>
                    <Table responsive borderless size="sm">
                      <tbody>
                        <tr>
                          <td width="40%"><strong>Pengelola:</strong></td>
                          <td>{asset.pengelola || "-"}</td>
                        </tr>
                        <tr>
                          <td><strong>Bidang:</strong></td>
                          <td><span className="badge bg-info">{asset.bidang || "-"}</span></td>
                        </tr>
                        <tr>
                          <td><strong>Provinsi:</strong></td>
                          <td>{asset.provinsi || "-"}</td>
                        </tr>
                        <tr>
                          <td><strong>Kabupaten/Kota:</strong></td>
                          <td>{asset.kabkota || "-"}</td>
                        </tr>
                        <tr>
                          <td><strong>Kecamatan:</strong></td>
                          <td>{asset.kecamatan || "-"}</td>
                        </tr>
                        <tr>
                          <td><strong>Kelurahan/Desa:</strong></td>
                          <td>{asset.kelurahan || "-"}</td>
                        </tr>
                        <tr>
                          <td><strong>Peruntukan:</strong></td>
                          <td>{asset.peruntukan || "-"}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                              {asset.status || "-"}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Luas Area:</strong></td>
                          <td>
                            <span className="fw-bold text-primary">
                              {asset.area ? `${Number(asset.area).toLocaleString("id-ID")} m²` : "-"}
                            </span>
                          </td>
                        </tr>
                        {/* BUKTI PEMILIKAN */}
                        {asset.bukti_pemilikan_url && (
                          <tr>
                            <td><strong>Bukti Pemilikan:</strong></td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                {isImageFile(asset.bukti_pemilikan_filename) && (
                                  <div style={{ width: "40px", height: "40px", border: "1px solid #ddd", borderRadius: "4px", overflow: "hidden" }}>
                                    <img src={getFileUrl(asset.bukti_pemilikan_url)} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontSize: "0.8em" }}>{asset.bukti_pemilikan_filename}</div>
                                  <Button variant="link" size="sm" onClick={() => handlePreviewBukti(asset.bukti_pemilikan_url, asset.bukti_pemilikan_filename)} className="p-0" style={{ fontSize: "0.7em" }}>
                                    {isPdfFile(asset.bukti_pemilikan_filename) ? "Lihat PDF" : "Lihat Gambar"}
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {asset.keterangan_bukti_pemilikan && (
                          <tr>
                            <td><strong>Keterangan Bukti:</strong></td>
                            <td>{asset.keterangan_bukti_pemilikan}</td>
                          </tr>
                        )}
                        <tr>
                          <td><strong>Keterangan:</strong></td>
                          <td style={{ whiteSpace: "pre-wrap" }}>{asset.keterangan || "-"}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>

                {/* FOTO TAMPAK ATAS */}
                {asset.gambar_tampak_atas_url && (
                  <Card className="mb-3 shadow-sm">
                    <Card.Header className="bg-light">
                      <strong>Foto Aset Tampak Atas</strong>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={4} className="mb-3">
                          <Card
                            onClick={() =>
                              handlePreviewMedia(
                                asset.gambar_tampak_atas_url,
                                "Foto Aset Tampak Atas"
                              )
                            }
                            className="h-100"
                            style={{
                              cursor: "pointer",
                              border: "1px solid #ddd",
                            }}
                          >
                            <Card.Img
                              variant="top"
                              src={
                                asset.gambar_tampak_atas_url.startsWith("http")
                                  ? asset.gambar_tampak_atas_url
                                  : `${API_URL}${asset.gambar_tampak_atas_url}`
                              }
                              alt="Foto Aset Tampak Atas"
                              style={{
                                height: "150px",
                                width: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </Card>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {/* FOTO ASET */}
                {asset.foto_aset && Array.isArray(asset.foto_aset) && asset.foto_aset.length > 0 && (
                  <Card className="mb-3 shadow-sm">
                    <Card.Header className="bg-light">
                      <strong>Foto Aset</strong>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        {asset.foto_aset.map((foto, index) => {
                          const fullUrl = foto.startsWith("http")
                            ? foto
                            : `${API_URL}${foto}`;
                          const isVideo = isVideoFile(foto);
                          return (
                            <Col key={index} md={4} className="mb-3">
                              <Card
                                onClick={() =>
                                  handlePreviewMedia(
                                    foto,
                                    `Foto Aset ${index + 1}`,
                                    index,
                                    asset.foto_aset
                                  )
                                }
                                className="h-100"
                                style={{
                                  cursor: "pointer",
                                  border: "1px solid #ddd",
                                }}
                              >
                                {isVideo ? (
                                  <video
                                    src={fullUrl}
                                    controls={false}
                                    style={{
                                      objectFit: "cover",
                                      width: "100%",
                                      height: "150px",
                                    }}
                                    title="Klik untuk lihat preview"
                                  />
                                ) : (
                                  <Card.Img
                                    variant="top"
                                    src={fullUrl}
                                    alt={`Foto Aset ${index + 1}`}
                                    style={{
                                      height: "150px",
                                      width: "100%",
                                      objectFit: "cover",
                                    }}
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
            </Col>
            <Col md={5} className="modal-map-wrapper">
              <div className="modal-map-fixed">
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
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>

    {/* ===== PREVIEW MODAL BUKTI PEMILIKAN ===== */}
    <BuktiPreviewModal
      show={showBuktiPreviewModal}
      onHide={handleCloseBuktiPreview}
      buktiPreviewMedia={buktiPreviewMedia}
    />

    {/* ===== PREVIEW MODAL FOTO ASET ===== */}
    {showPreviewModal && (
      <Modal
        show={showPreviewModal}
        onHide={handleClosePreview}
        size="xl"
        centered
        dialogClassName={`modal-95w ${previewFullscreen ? 'fullscreen-modal' : ''}`}
        backdropClassName="modal-backdrop-dark"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {previewMediaTitle}
          </Modal.Title>
          <div className="ms-auto">
            <Button
              variant="outline-light"
              size="sm"
              className="me-2"
              onClick={togglePreviewFullscreen}
              title={previewFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
            >
              {previewFullscreen ? <FaCompress /> : <FaExpand />}
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body
          className="text-center preview-body"
          style={{
            minHeight: "60vh",
            maxHeight: "75vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            backgroundColor: "#000",
            paddingBottom: previewAssetPhotos && previewAssetPhotos.length > 1 ? "80px" : "0",
          }}
        >
          {previewLoading && (
            <div className="loading-spinner" style={{ position: "absolute", zIndex: 10 }}>
              <Spinner animation="border" variant="light" size="xl" />
              <p className="text-light mt-2 mb-0">Memuat gambar...</p>
            </div>
          )}

          {previewMedia?.isVideo ? (
            <video
              src={previewMedia.url}
              controls
              className="img-fluid"
              style={{
                maxHeight: "70vh",
                maxWidth: "95%",
                objectFit: "contain",
                transform: `rotate(${previewRotation}deg)`,
                transition: "transform 0.3s ease",
              }}
              autoPlay
              muted
              loop
              onLoadedData={handleImageLoad}
            >
              Browser Anda tidak mendukung elemen video.
            </video>
          ) : previewMedia ? (
            <img
              src={previewMedia.url}
              alt="Preview"
              className="img-fluid"
              style={{
                maxHeight: "70vh",
                maxWidth: "95%",
                objectFit: "contain",
                transform: `rotate(${previewRotation}deg)`,
                transition: "transform 0.3s ease",
              }}
              onLoad={handleImageLoad}
            />
          ) : null}

          {/* Rotation Controls */}
          {!previewMedia?.isVideo && (
            <div className="rotation-controls" style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 20,
              display: "flex",
              gap: "8px",
            }}>
              <Button
                variant="outline-light"
                size="sm"
                onClick={rotateLeft}
                title="Putar Kiri"
              >
                <FaUndo />
              </Button>
              <Button
                variant="outline-light"
                size="sm"
                onClick={rotateRight}
                title="Putar Kanan"
              >
                <FaRedo />
              </Button>
            </div>
          )}

          {/* Thumbnail Strip */}
          {previewAssetPhotos && previewAssetPhotos.length > 1 && (
            <div className="thumbnail-strip" style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(0,0,0,0.8)",
              padding: "8px 12px",
              borderRadius: "8px",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              justifyContent: "flex-start",
              zIndex: 50,
              maxWidth: "90%",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>
              {previewAssetPhotos.map((photoUrl, index) => {
                const fullUrl = photoUrl.startsWith("http") ? photoUrl : `${API_URL}${photoUrl}`;
                const isVideo = isVideoFile(photoUrl);
                return (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (index !== currentPhotoIndex) {
                        const fullUrl = photoUrl.startsWith("http") ? photoUrl : `${API_URL}${photoUrl}`;
                        const isVideo = isVideoFile(photoUrl);
                        setPreviewMedia({ url: fullUrl, isVideo: isVideo });
                        setCurrentPhotoIndex(index);
                        setPreviewMediaTitle(`Foto Aset ${index + 1}`);
                        setPreviewLoading(true);
                      }
                    }}
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "4px",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: index === currentPhotoIndex ? "2px solid #fff" : "2px solid transparent",
                      opacity: index === currentPhotoIndex ? 1 : 0.6,
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                    }}
                  >
                    {isVideo ? (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        background: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <i className="fas fa-video text-white"></i>
                      </div>
                    ) : (
                      <img
                        src={fullUrl}
                        alt={`Thumbnail ${index + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center" style={{ paddingTop: "0" }}>
          {previewAssetPhotos && previewAssetPhotos.length > 1 && (
            <div className="d-flex gap-2">
              <Button variant="outline-primary" onClick={handlePrevPhoto} size="lg">
                <i className="fas fa-arrow-left me-2"></i>Sebelumnya
              </Button>
              <Button variant="outline-primary" onClick={handleNextPhoto} size="lg">
                Berikutnya<i className="fas fa-arrow-right ms-2"></i>
              </Button>
            </div>
          )}
        </Modal.Footer>
      </Modal>
    )}
    </Fragment>
  );
};

export default DetailYardipModal;
