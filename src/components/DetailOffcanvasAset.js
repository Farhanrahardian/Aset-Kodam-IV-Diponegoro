import { useNavigate } from "react-router-dom";
import React, { useState, Fragment } from "react";
import {
  Offcanvas,
  Badge,
  Card,
  Row,
  Col,
  Button,
  Image,
  Modal,
} from "react-bootstrap";
import {
  FaMapMarkerAlt,
  FaRulerCombined,
  FaTag,
  FaInfoCircle,
  FaLandmark,
  FaBuilding,
  FaFileAlt,
  FaIdCard,
  FaUser,
  FaCertificate,
  FaGlobe,
  FaLayerGroup,
  FaImage,
} from "react-icons/fa";
import PetaAset from "./PetaAset";
import { getCentroid } from "../utils/locationUtils";

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

  const [buktiPreviewMedia, setBuktiPreviewMedia] = useState(null);
  const [showBuktiPreviewModal, setShowBuktiPreviewModal] = useState(false);

  const navigate = useNavigate();

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
        style={{ width: "600px" }}
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
          {/* Mini Map Preview */}
          {aset.lokasi && (
            <div style={{ height: "200px", width: "100%" }}>
              <PetaAset
                key={`detail-${aset.id}`}
                assets={assetForMap}
                mode="detail"
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
              <Card.Header className="bg-primary text-white">
                <FaLandmark className="me-2" /> Informasi Aset BMN
              </Card.Header>
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
                  <Card.Header className="bg-success text-white">
                    <FaFileAlt className="me-2" /> Foto Aset
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
                <Card.Header className="bg-info text-white">
                  <FaImage className="me-2" /> Foto Aset Tampak Atas
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


            {/* Additional Information */}
            {aset.keterangan && (
              <Card className="mb-3 shadow-sm">
                <Card.Header className="bg-secondary text-white">
                  <FaInfoCircle className="me-2" /> Keterangan Tambahan
                </Card.Header>
                <Card.Body>
                  <p className="mb-0">{aset.keterangan}</p>
                </Card.Body>
              </Card>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Preview Modal for Media - updated to match DetailModalAset */}
      {showPreviewModal && (
        <Modal
          show={showPreviewModal}
          onHide={handleClosePreview}
          size="lg"
          centered
          dialogClassName="modal-90w"
        >
          <Modal.Header closeButton>
            <Modal.Title>{previewMediaTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            {previewMedia && previewMedia.isVideo ? (
              <video
                src={previewMedia.url}
                controls
                className="img-fluid"
                style={{ maxHeight: "70vh", objectFit: "contain" }}
                autoPlay
              >
                Browser Anda tidak mendukung elemen video.
              </video>
            ) : previewMedia ? (
              <img
                src={previewMedia.url}
                alt="Preview"
                className="img-fluid"
                style={{ maxHeight: "70vh", objectFit: "contain" }}
              />
            ) : (
              <div>
                <p>Preview tidak tersedia untuk file ini.</p>
                <Button
                  variant="primary"
                  onClick={() => window.open(previewMedia?.url, "_blank")}
                >
                  Buka File
                </Button>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex justify-content-between align-items-center w-100">
              <div>
                {previewAssetPhotos && previewAssetPhotos.length > 1 && (
                  <>
                    <Button
                      variant="outline-primary"
                      onClick={handlePrevPhoto}
                      className="me-2"
                    >
                      &larr; Sebelumnya
                    </Button>
                    <Button variant="outline-primary" onClick={handleNextPhoto}>
                      Berikutnya &rarr;
                    </Button>
                  </>
                )}
              </div>
              <div className="d-flex align-items-center">
                {previewAssetPhotos && previewAssetPhotos.length > 1 && (
                  <span className="me-3">
                    {currentPhotoIndex + 1} dari {previewAssetPhotos.length}
                  </span>
                )}
                {previewMedia && (
                  <Button
                    variant="info"
                    onClick={() => window.open(previewMedia.url, "_blank")}
                    className="me-2"
                  >
                    Buka di Tab Baru
                  </Button>
                )}
                <Button variant="secondary" onClick={handleClosePreview}>
                  Tutup
                </Button>
              </div>
            </div>
          </Modal.Footer>
        </Modal>
      )}

      {/* Preview Modal for Bukti Pemilikan */}
      {showBuktiPreviewModal && (
        <Modal
          show={showBuktiPreviewModal}
          onHide={handleCloseBuktiPreview}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Bukti Kepemilikan</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            {buktiPreviewMedia?.isPdf ? (
              <iframe
                src={buktiPreviewMedia.url}
                style={{
                  width: "100%",
                  height: "70vh",
                  border: "none",
                }}
                title="Preview PDF"
              ></iframe>
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
            <Button variant="secondary" onClick={handleCloseBuktiPreview}>
              Tutup
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default DetailOffcanvasAset;
