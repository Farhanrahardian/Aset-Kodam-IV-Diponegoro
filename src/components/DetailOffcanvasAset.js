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
  FaLandmark,
  FaInfoCircle,
  FaFileAlt,
  FaImage,
  FaExpand,
  FaCompress,
  FaRedo,
  FaUndo,
  FaTimes,
} from "react-icons/fa";
import PetaAset from "./PetaAset";
import { getCentroid } from "../utils/locationUtils";
import "./DetailOffcanvasAset.css";

const API_URL = "http://localhost:3001";

// Helper untuk mendapatkan warna badge berdasarkan status
const getStatusBadgeVariant = (status) => {
  if (!status) {
    return "secondary";
  }

  const statusLower = status.toLowerCase().trim();

  // Status Tidak Dimiliki/Dikuasai = Merah (cek dulu agar tidak tertangkap oleh kondisi positif)
  if (statusLower.includes("tidak dimiliki/dikuasai") ||
      statusLower.includes("tidak dimiliki") ||
      statusLower.includes("tidak dikuasai") ||
      statusLower.includes("belum dimiliki")) {
    return "danger";
  }

  // Status Dimiliki/Dikuasai = Hijau
  if (statusLower.includes("dimiliki/dikuasai") ||
      statusLower.includes("dimiliki") ||
      statusLower.includes("dikuasai")) {
    return "success";
  }

  // Default jika tidak ada match
  return "secondary";
};

// Helper function untuk memperbaiki path gambar
const getImageUrl = (asset) => {
  if (!asset) return null;

  let imageUrl =
    asset.bukti_pemilikan_url ||
    asset.bukti_pemilikan ||
    asset.bukti_kepemilikan_url ||
    asset.bukti_kepemilikan;

  if (!imageUrl) return null;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `${API_URL}${imageUrl}`;
  }

  return `${API_URL}/${imageUrl}`;
};

// Helper function untuk cek apakah file gambar
const isImageFile = (filename) => {
  if (!filename) return false;
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

// Helper function untuk cek apakah file PDF
const isPdfFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".pdf");
};

// Helper function untuk cek apakah file video
const isVideoFile = (filename) => {
  if (!filename) return false;
  const videoExtensions = [".mp4", ".mov", ".webm", ".avi"];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const DetailOffcanvasAset = ({
  show,
  handleClose,
  aset,
  koremList = [],
  allKodimList = [],
}) => {
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMediaTitle, setPreviewMediaTitle] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [previewAssetPhotos, setPreviewAssetPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);

  const [buktiPreviewMedia, setBuktiPreviewMedia] = useState(null);
  const [showBuktiPreviewModal, setShowBuktiPreviewModal] = useState(false);
  const [buktiLoading, setBuktiLoading] = useState(true);
  const [buktiFullscreen, setBuktiFullscreen] = useState(false);

  const navigate = useNavigate();

  // Reset state when modal closes
  useEffect(() => {
    if (!showPreviewModal) {
      setLoading(true);
      setFullscreen(false);
      setRotation(0);
    }
  }, [showPreviewModal]);

  useEffect(() => {
    if (!showBuktiPreviewModal) {
      setBuktiLoading(true);
      setBuktiFullscreen(false);
    }
  }, [showBuktiPreviewModal]);

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

  // Keyboard navigation for bukti preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showBuktiPreviewModal) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseBuktiPreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBuktiPreviewModal]);

  const handleViewFile = (url) => {
    if (!url) return;
    const relativePath = url.replace(`${API_URL}/`, "");
    navigate(`/view-file/${relativePath}`);
  };

  const handlePreviewBukti = (mediaUrl) => {
    const fullUrl = mediaUrl.startsWith("http")
      ? mediaUrl
      : `${API_URL}${mediaUrl}`;
    setBuktiPreviewMedia({
      url: fullUrl,
      isVideo: isVideoFile(mediaUrl),
      isPdf: isPdfFile(mediaUrl),
    });
    setShowBuktiPreviewModal(true);
  };

  const handleCloseBuktiPreview = () => {
    setShowBuktiPreviewModal(false);
    setBuktiPreviewMedia(null);
  };

  const handlePreviewMedia = (
    mediaUrl,
    title = "Preview Media Aset",
    index = 0,
    allPhotos = []
  ) => {
    const fullUrl = mediaUrl.startsWith("http")
      ? mediaUrl
      : `${API_URL}${mediaUrl}`;
    setPreviewMedia({
      url: fullUrl,
      isVideo: isVideoFile(mediaUrl),
    });
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

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleBuktiLoad = () => {
    setBuktiLoading(false);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const toggleBuktiFullscreen = () => {
    setBuktiFullscreen(!buktiFullscreen);
  };

  const rotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const rotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  const hasMultiplePhotos = previewAssetPhotos && previewAssetPhotos.length > 1;

  // Reset loading when previewMedia changes
  useEffect(() => {
    if (previewMedia) {
      setLoading(true);
    }
  }, [previewMedia]);

  // ===== HANDLER PHOTO SELECT FROM THUMBNAIL =====
  const handlePhotoSelect = (fullUrl, isVideo, index) => {
    setPreviewMedia({ url: fullUrl, isVideo: isVideo });
    setCurrentPhotoIndex(index);
    setPreviewMediaTitle(`Foto Aset ${index + 1}`);
  };

  const handleNextPhoto = () => {
    if (previewAssetPhotos && previewAssetPhotos.length > 1) {
      const newIndex = (currentPhotoIndex + 1) % previewAssetPhotos.length;
      const newMediaUrl = previewAssetPhotos[newIndex];
      const fullUrl = newMediaUrl.startsWith("http")
        ? newMediaUrl
        : `${API_URL}${newMediaUrl}`;

      setPreviewMedia({
        url: fullUrl,
        isVideo: isVideoFile(fullUrl),
      });
      setCurrentPhotoIndex(newIndex);
      setPreviewMediaTitle(`Foto Aset ${newIndex + 1}`);
      setLoading(true);
    }
  };

  const handlePrevPhoto = () => {
    if (previewAssetPhotos && previewAssetPhotos.length > 1) {
      const newIndex =
        (currentPhotoIndex - 1 + previewAssetPhotos.length) %
        previewAssetPhotos.length;
      const newMediaUrl = previewAssetPhotos[newIndex];
      const fullUrl = newMediaUrl.startsWith("http")
        ? newMediaUrl
        : `${API_URL}${newMediaUrl}`;

      setPreviewMedia({
        url: fullUrl,
        isVideo: isVideoFile(fullUrl),
      });
      setCurrentPhotoIndex(newIndex);
      setPreviewMediaTitle(`Foto Aset ${newIndex + 1}`);
      setLoading(true);
    }
  };

  if (!aset) return null;

  // Siapkan data untuk mini-map
  const assetForMap = aset.lokasi ? [{ ...aset }] : [];

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

  const validatedLocation = validateLocationData(aset);
  const hasValidLocation = validatedLocation !== null;

  // Get centroid for display
  const geometryForCentroid = hasValidLocation ? { type: 'Polygon', coordinates: validatedLocation } : null;
  const centroid = geometryForCentroid ? getCentroid(geometryForCentroid) : null;
  const centroidLat = centroid ? centroid[0].toFixed(6) : "N/A";
  const centroidLng = centroid ? centroid[1].toFixed(6) : "N/A";

  // Get korem and kodim info
  const korem = koremList.find((k) => k.id == aset.korem_id);
  const kodim = allKodimList.find(
    (k) => k.id === aset.kodim || k.nama === aset.kodim
  );

  // Image handling
  const imageUrl = getImageUrl(aset);
  const filename =
    aset.bukti_pemilikan_filename || aset.bukti_kepemilikan_filename || "File";
  const hasValidImage = imageUrl && isImageFile(filename);
  const hasPdf = imageUrl && isPdfFile(filename);

  // Helper function to determine which area to display based on certificate status (for compatibility)
  const renderLuasInfo = (asset) => {
    const hasSertifikat = asset.pemilikan_sertifikat === "Ya";
    const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
    const belumSertifikatLuas = parseFloat(asset.belum_sertifikat_luas) || 0;
    const petaLuas = parseFloat(asset.luas) || 0;

    if (hasSertifikat && sertifikatLuas > 0) {
      return {
        label: "Luas Bersertifikat",
        value: `${sertifikatLuas.toLocaleString("id-ID")} m²`,
        className: "text-dark",
      };
    } else if (!hasSertifikat && belumSertifikatLuas > 0) {
      return {
        label: "Luas Tidak Bersertifikat",
        value: `${belumSertifikatLuas.toLocaleString("id-ID")} m²`,
        className: "text-dark",
      };
    } else if (petaLuas > 0) {
      return {
        label: "Luas Total",
        value: `${petaLuas.toLocaleString("id-ID")} m²`,
        className: "text-dark",
      };
    }

    return {
      label: "Luas Total",
      value: "-",
      className: "text-dark",
    };
  };

  const luasInfo = renderLuasInfo(aset);

  // Status umum (dimiliki/dikuasai atau tidak)
  const statusUmum = aset.status || "Status Tidak Diketahui";

  // Status sertifikat berdasarkan field pemilikan_sertifikat
  const sertifikatStatus = aset.pemilikan_sertifikat === "Ya"
    ? "Bersertifikat"
    : aset.pemilikan_sertifikat === "Tidak"
      ? "Tidak Bersertifikat"
      : "Status Sertifikat Tidak Diketahui";

  // Warna badge untuk status umum
  const statusUmumColor = getStatusBadgeVariant(aset.status);

  // Warna badge untuk status sertifikat
  const sertifikatColor = aset.pemilikan_sertifikat === "Ya" ? "success" :
                         aset.pemilikan_sertifikat === "Tidak" ? "danger" : "secondary";

  return (
    <>
      <Offcanvas
        show={show}
        onHide={handleClose}
        placement="end"
        backdrop={true}
        className="detail-offcanvas"
      >
        <Offcanvas.Header
          closeButton
          className="bg-primary text-white border-bottom"
        >
          <Offcanvas.Title as="h5">
            <FaLandmark className="me-2" />
            Detail Aset BMN
          </Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body style={{ padding: 0 }}>
          {/* Mini Map Preview - LARGER */}
          {aset.lokasi && (
            <div className="offcanvas-map-container">
              <PetaAset
                key={`detail-${aset.id}`}
                assets={assetForMap}
                mode="detail"
              />
            </div>
          )}

          <div className="offcanvas-content-wrapper">
            {/* Main Info Card */}
            <Card className="mb-3 shadow-sm">
              <Card.Body>
                <div className="mb-3">
                  <h5 className="mb-1">{aset.nama || "N/A"}</h5>
                  <small className="text-muted">
                    NUP (Nomor Urut Pendaftaran)
                  </small>
                  <div className="mt-2">
                    <Badge bg={statusUmumColor} pill className="me-2">
                      {statusUmum}
                    </Badge>
                    <Badge bg={sertifikatColor} pill>
                      {sertifikatStatus}
                    </Badge>
                  </div>
                </div>

                {/* Detailed Information Table */}
                <div className="table-responsive">
                  <table className="table table-sm table-borderless mb-0">
                    <tbody>
                      <tr>
                        <td width="40%">
                          <strong>NUP:</strong>
                        </td>
                        <td>{aset.nama || "-"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Wilayah Korem:</strong>
                        </td>
                        <td>{korem?.nama || aset.korem_id || "-"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Wilayah Kodim:</strong>
                        </td>
                        <td>{kodim?.nama || aset.kodim || "-"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Alamat:</strong>
                        </td>
                        <td>{aset.alamat || "-"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Peruntukan:</strong>
                        </td>
                        <td>{aset.peruntukan || aset.fungsi || "-"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>KIB/Kode Barang:</strong>
                        </td>
                        <td>
                          {aset.kib_kode_barang || aset.kode_barang || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Nomor Registrasi:</strong>
                        </td>
                        <td>
                          {aset.nomor_registrasi || aset.no_registrasi || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Asal Milik:</strong>
                        </td>
                        <td>{aset.asal_milik || "-"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>{luasInfo.label}:</strong>
                        </td>
                        <td>
                          <span className={luasInfo.className}>
                            {luasInfo.value}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Bukti Pemilikan:</strong>
                        </td>
                        <td>
                          {imageUrl ? (
                            <div className="d-flex align-items-center gap-2">
                              {hasValidImage && (
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
                                    src={imageUrl}
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
                                  {filename}
                                </div>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => handlePreviewBukti(imageUrl)}
                                  className="p-0"
                                  style={{ fontSize: "0.7em" }}
                                  disabled={!hasPdf && !hasValidImage}
                                >
                                  {hasPdf ? "Lihat PDF" : "Lihat Gambar"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Tidak ada file</span>
                          )}
                        </td>
                      </tr>
                      {aset.keterangan_bukti_pemilikan && (
                        <tr>
                          <td>
                            <strong>Keterangan Bukti Pemilikan:</strong>
                          </td>
                          <td>{aset.keterangan_bukti_pemilikan}</td>
                        </tr>
                      )}
                      {aset.atas_nama_pemilik_sertifikat && (
                        <tr>
                          <td>
                            <strong>Atas Nama Pemilik Sertifikat:</strong>
                          </td>
                          <td>{aset.atas_nama_pemilik_sertifikat}</td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          <strong>Koordinat:</strong>
                        </td>
                        <td>
                          {hasValidLocation && centroid ? (
                            <div>
                              Lat: {centroidLat}, Lng: {centroidLng}
                            </div>
                          ) : (
                            <span className="text-muted">Tidak tersedia</span>
                          )}
                        </td>
                      </tr>
                      {aset.keterangan && (
                        <tr>
                          <td>
                            <strong>Sejarah:</strong>
                          </td>
                          <td>{aset.keterangan}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>

            {/* Asset Photos Card */}
            {aset.foto_aset &&
              Array.isArray(aset.foto_aset) &&
              aset.foto_aset.length > 0 && (
                <Card className="mb-3 shadow-sm">
                  <Card.Header className="bg-light">
                    Foto Aset
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      {aset.foto_aset.map((foto, index) => {
                        const fullUrl = foto.startsWith("http")
                          ? foto
                          : `${API_URL}${foto}`;
                        const isVideo = isVideoFile(fullUrl);
                        return (
                          <Col key={index} md={4} className="mb-3">
                            <Card
                              onClick={() =>
                                handlePreviewMedia(
                                  foto,
                                  `Foto Aset ${index + 1}`,
                                  index,
                                  aset.foto_aset
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
                                    height: "100px",
                                  }}
                                  title="Klik untuk lihat preview"
                                />
                              ) : (
                                <Card.Img
                                  variant="top"
                                  src={fullUrl}
                                  alt={`Foto Aset ${index + 1}`}
                                  style={{
                                    height: "100px",
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

            {/* Tampak Atas Card */}
            {aset.gambar_tampak_atas_url && (
              <Card className="mb-3 shadow-sm">
                <Card.Header className="bg-light">
                  Foto Aset Tampak Atas
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4} className="mb-3">
                      <Card
                        onClick={() =>
                          handlePreviewMedia(
                            aset.gambar_tampak_atas_url,
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
                            aset.gambar_tampak_atas_url.startsWith("http")
                              ? aset.gambar_tampak_atas_url
                              : `${API_URL}${aset.gambar_tampak_atas_url}`
                          }
                          alt="Foto Aset Tampak Atas"
                          style={{
                            height: "100px",
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

            {/* Geographic Information Card */}


            {/* Additional Information - REMOVED, sudah ada di tabel Informasi Aset BMN */}

          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Preview Modal for Media - WITH ALL FEATURES */}
      {showPreviewModal && (
        <Modal
          show={showPreviewModal}
          onHide={handleClosePreview}
          size="xl"
          centered
          dialogClassName={`modal-95w ${fullscreen ? 'fullscreen-modal' : ''}`}
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
              paddingBottom: hasMultiplePhotos ? "80px" : "0",
            }}
          >
            {loading && (
              <div className="loading-spinner" style={{ position: "absolute", zIndex: 10 }}>
                <Spinner animation="border" variant="light" size="xl" />
                <p className="text-light mt-2 mb-0">Memuat gambar...</p>
              </div>
            )}

            {previewMedia && previewMedia.isVideo ? (
              <video
                src={previewMedia.url}
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
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.3s ease",
                }}
                onLoad={handleImageLoad}
              />
            ) : null}

            {/* Rotation Controls */}
            {previewMedia && !previewMedia.isVideo && (
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
            {hasMultiplePhotos && (
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
                  const isVideo = photoUrl.match(/\.(mp4|mov|webm|avi)$/i);
                  return (
                    <div
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Direct navigation to the selected photo
                        if (index !== currentPhotoIndex && handlePhotoSelect) {
                          const newMediaUrl = fullUrl;
                          handlePhotoSelect(newMediaUrl, isVideo, index);
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
                      onMouseEnter={(e) => {
                        if (index !== currentPhotoIndex) {
                          e.currentTarget.style.opacity = "0.8";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== currentPhotoIndex) {
                          e.currentTarget.style.opacity = "0.6";
                        }
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
                          <FaImage size={16} color="#fff" />
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
            {hasMultiplePhotos && (
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

      {/* Preview Modal for Bukti Pemilikan - WITH ALL FEATURES */}
      {showBuktiPreviewModal && (
        <Modal
          show={showBuktiPreviewModal}
          onHide={handleCloseBuktiPreview}
          size="xl"
          centered
          dialogClassName={`modal-95w ${buktiFullscreen ? 'fullscreen-modal' : ''}`}
          backdropClassName="modal-backdrop-dark"
        >
          <Modal.Header closeButton>
            <Modal.Title>Bukti Kepemilikan</Modal.Title>
            <div className="ms-auto">
              <Button
                variant="outline-light"
                size="sm"
                className="me-2"
                onClick={toggleBuktiFullscreen}
                title={buktiFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
              >
                {buktiFullscreen ? <FaCompress /> : <FaExpand />}
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
            {buktiLoading && (
              <div className="loading-spinner" style={{ position: "absolute", zIndex: 10 }}>
                <Spinner animation="border" variant="light" size="xl" />
                <p className="text-light mt-2 mb-0">Memuat...</p>
              </div>
            )}

            {buktiPreviewMedia?.isPdf ? (
              <iframe
                src={buktiPreviewMedia.url}
                style={{
                  width: "95%",
                  height: "70vh",
                  border: "none",
                }}
                title="Preview PDF"
                onLoad={handleBuktiLoad}
              ></iframe>
            ) : buktiPreviewMedia?.isVideo ? (
              <video
                src={buktiPreviewMedia.url}
                controls
                className="img-fluid"
                style={{
                  maxHeight: "70vh",
                  maxWidth: "95%",
                  objectFit: "contain",
                }}
                autoPlay
                muted
                loop
                onLoadedData={handleBuktiLoad}
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
                }}
                onLoad={handleBuktiLoad}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default DetailOffcanvasAset;
