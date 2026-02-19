import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Modal, Button, Row, Col, Badge, Image } from "react-bootstrap";
import { GoogleMap, useJsApiLoader, Polygon } from "@react-google-maps/api";
import { normalizeKodimName } from "../utils/kodimUtils";
import { parseLocation, getCentroid } from "../utils/locationUtils";

const API_URL = "http://localhost:3001";

const libraries = ["drawing", "places", "geometry"];

// ===== HELPER FUNCTIONS =====
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

// ===== PREVIEW MODAL - FOTO ASET (dengan navigasi, sama seperti DetailOffcanvasAset) =====
const MediaPreviewModal = ({
  show,
  onHide,
  previewMedia,
  previewMediaTitle,
  currentPhotoIndex,
  previewAssetPhotos,
  onNext,
  onPrev,
}) => (
  <Modal show={show} onHide={onHide} size="lg" centered dialogClassName="modal-90w">
    <Modal.Header closeButton>
      <Modal.Title>{previewMediaTitle}</Modal.Title>
    </Modal.Header>
    <Modal.Body className="text-center">
      {previewMedia?.isVideo ? (
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
      ) : null}
    </Modal.Body>
    <Modal.Footer>
      <div className="d-flex justify-content-between align-items-center w-100">
        <div>
          {previewAssetPhotos && previewAssetPhotos.length > 1 && (
            <>
              <Button variant="outline-primary" onClick={onPrev} className="me-2">
                &larr; Sebelumnya
              </Button>
              <Button variant="outline-primary" onClick={onNext}>
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
          <Button variant="secondary" onClick={onHide}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal.Footer>
  </Modal>
);

// ===== PREVIEW MODAL - BUKTI PEMILIKAN (PDF/gambar, sama seperti DetailOffcanvasAset) =====
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

// ===== MAIN COMPONENT =====
const DetailModalAset = ({
  asset,
  show,
  onHide,
  koremList,
  allKodimList,
}) => {
  const [map, setMap] = useState(null);

  // State untuk preview foto aset (dengan navigasi)
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMediaTitle, setPreviewMediaTitle] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [previewAssetPhotos, setPreviewAssetPhotos] = useState([]);

  // State untuk preview bukti pemilikan
  const [buktiPreviewMedia, setBuktiPreviewMedia] = useState(null);
  const [showBuktiPreviewModal, setShowBuktiPreviewModal] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  // ===== HANDLER PREVIEW FOTO ASET =====
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
    }
  };

  // ===== HANDLER PREVIEW BUKTI PEMILIKAN =====
  const handlePreviewBukti = (mediaUrl) => {
    const fullUrl = mediaUrl.startsWith("http") ? mediaUrl : `${API_URL}${mediaUrl}`;
    const filename = fullUrl.split("/").pop();
    setBuktiPreviewMedia({
      url: fullUrl,
      isVideo: isVideoFile(mediaUrl),
      isPdf: isPdfFile(filename),
    });
    setShowBuktiPreviewModal(true);
  };

  const handleCloseBuktiPreview = () => {
    setShowBuktiPreviewModal(false);
    setBuktiPreviewMedia(null);
  };

  // ===== KOREM & KODIM =====
  const koremName = useMemo(() => {
    if (!asset || !koremList) return "-";
    const korem = koremList.find((k) => k.id == asset.korem_id);
    return korem?.nama || "-";
  }, [asset, koremList]);

  const kodimName = useMemo(() => {
    if (!asset || !allKodimList) return "-";
    const assetKodimIdentifier = String(asset.kodim || asset.kodim_id || "").trim();
    if (!assetKodimIdentifier) return "-";
    const normalizedAssetKodim = normalizeKodimName(assetKodimIdentifier);
    if (
      normalizedAssetKodim === "Kodim 0733/Kota Semarang" ||
      assetKodimIdentifier === "Kodim 0733/Semarang (BS)"
    ) {
      return "Kodim 0733/Kota Semarang";
    }
    const kodim = allKodimList.find(
      (k) =>
        k.id === assetKodimIdentifier ||
        k.nama === assetKodimIdentifier ||
        normalizeKodimName(k.nama) === normalizedAssetKodim
    );
    return kodim ? kodim.nama : asset.kodim_nama || assetKodimIdentifier || "-";
  }, [asset, allKodimList]);

  // ===== GEOMETRY & MAP =====
  const geometry = useMemo(() => {
    if (!asset) return null;
    return parseLocation(asset.lokasi);
  }, [asset]);

  const centroid = useMemo(() => {
    if (!geometry) return null;
    return getCentroid(geometry);
  }, [geometry]);

  const mapCenter = useMemo(() => {
    if (centroid) return { lat: centroid[0], lng: centroid[1] };
    return { lat: -7.7956, lng: 110.3695 };
  }, [centroid]);

  const polygonPaths = useMemo(() => {
    if (!geometry || geometry.type !== "Polygon") return [];
    return geometry.coordinates[0].map((coord) => ({
      lat: coord[1],
      lng: coord[0],
    }));
  }, [geometry]);

  const adjustMapToPolygon = useCallback(
    (mapInstance) => {
      if (!mapInstance || !geometry) return;
      const bounds = new window.google.maps.LatLngBounds();
      geometry.coordinates[0].forEach((coord) => {
        bounds.extend({ lat: coord[1], lng: coord[0] });
      });
      if (!bounds.isEmpty()) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latDiff = Math.abs(ne.lat() - sw.lat()) * 0.2;
        const lngDiff = Math.abs(ne.lng() - sw.lng()) * 0.2;
        const extendedBounds = new window.google.maps.LatLngBounds();
        extendedBounds.extend(new window.google.maps.LatLng(ne.lat() + latDiff, ne.lng() + lngDiff));
        extendedBounds.extend(new window.google.maps.LatLng(sw.lat() - latDiff, sw.lng() - lngDiff));
        mapInstance.fitBounds(extendedBounds);
      }
    },
    [geometry]
  );

  useEffect(() => {
    if (map && geometry) adjustMapToPolygon(map);
  }, [map, geometry, adjustMapToPolygon]);

  // ===== HELPERS =====
  const getFileUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${API_URL}${url}`;
    return `${API_URL}/${url}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Dimiliki/Dikuasai": return "success";
      case "TIdak Dimiliki/Dikuasai": return "danger";
      default: return "secondary";
    }
  };

  const renderLuas = (luas) => {
    const val = parseFloat(luas) || 0;
    return val > 0 ? val.toLocaleString("id-ID") + " m²" : "-";
  };

  const getKoordinat = () => {
    if (!centroid) return "-";
    return `Lintang: ${centroid[0].toFixed(7)} , Panjang: ${centroid[1].toFixed(7)}`;
  };

  const buktiPemilikanUrl = getFileUrl(asset?.bukti_pemilikan_url || asset?.bukti_pemilikan);
  const buktiPemilikanFilename = asset?.bukti_pemilikan_filename || asset?.bukti_pemilikan_url?.split("/").pop() || "";
  const gambarTampakAtasUrl = getFileUrl(asset?.gambar_tampak_atas_url);

  if (!asset) return null;

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail Aset Tanah - {asset.nama || ""}</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <Row>
            {/* ===== KIRI: Informasi Aset ===== */}
            <Col md={6}>
              <div style={{ backgroundColor: "#0d6efd", color: "white", padding: "10px 15px", borderRadius: "6px 6px 0 0" }}>
                <strong>Informasi Aset Tanah</strong>
              </div>
              <div style={{ border: "1px solid #dee2e6", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "15px" }}>

                <Row className="mb-2">
                  <Col xs={5}><strong>NUP:</strong></Col>
                  <Col xs={7}>{asset.nama || "-"}</Col>
                </Row>

                <Row className="mb-2">
                  <Col xs={5}><strong>Wilayah Korem:</strong></Col>
                  <Col xs={7}>{koremName}</Col>
                </Row>

                <Row className="mb-2">
                  <Col xs={5}><strong>Wilayah Kodim:</strong></Col>
                  <Col xs={7}>{kodimName}</Col>
                </Row>

                <Row className="mb-2">
                  <Col xs={5}><strong>Alamat:</strong></Col>
                  <Col xs={7}>{asset.alamat || "-"}</Col>
                </Row>

                <Row className="mb-2">
                  <Col xs={5}><strong>Peruntukan:</strong></Col>
                  <Col xs={7}>{asset.peruntukan || asset.fungsi || "-"}</Col>
                </Row>

                <Row className="mb-2">
                  <Col xs={5}><strong>Status:</strong></Col>
                  <Col xs={7}>
                    <Badge bg={getStatusBadgeClass(asset.status)}>{asset.status || "-"}</Badge>
                  </Col>
                </Row>

                <Row className="mb-2">
                  <Col xs={5}><strong>Status Sertifikat:</strong></Col>
                  <Col xs={7}>
                    {asset.pemilikan_sertifikat === "Ya" ? (
                      <Badge bg="success">Bersertifikat</Badge>
                    ) : (
                      <Badge bg="danger">Tidak Bersertifikat</Badge>
                    )}
                  </Col>
                </Row>

                {asset.kib_kode_barang && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>KIB/Kode Barang:</strong></Col>
                    <Col xs={7}>{asset.kib_kode_barang}</Col>
                  </Row>
                )}

                {asset.nomor_registrasi && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Nomor Registrasi:</strong></Col>
                    <Col xs={7}>{asset.nomor_registrasi}</Col>
                  </Row>
                )}

                {asset.asal_milik && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Asal Milik:</strong></Col>
                    <Col xs={7}>{asset.asal_milik}</Col>
                  </Row>
                )}

                <Row className="mb-2">
                  <Col xs={5}><strong>Sejarah:</strong></Col>
                  <Col xs={7}>{asset.keterangan || "-"}</Col>
                </Row>

                <Row className="mb-2">
                  <Col xs={5}><strong>Luas:</strong></Col>
                  <Col xs={7}>{renderLuas(asset.luas)}</Col>
                </Row>

                {/* Data Sertifikat */}
                {asset.pemilikan_sertifikat === "Ya" && (
                  <>
                    {asset.sertifikat_bidang && (
                      <Row className="mb-2">
                        <Col xs={5}><strong>Jumlah Bidang Bersertifikat:</strong></Col>
                        <Col xs={7}>{asset.sertifikat_bidang}</Col>
                      </Row>
                    )}
                    {asset.sertifikat_luas && (
                      <Row className="mb-2">
                        <Col xs={5}><strong>Luas Bersertifikat:</strong></Col>
                        <Col xs={7}>{renderLuas(asset.sertifikat_luas)}</Col>
                      </Row>
                    )}
                    {asset.atas_nama_pemilik_sertifikat && (
                      <Row className="mb-2">
                        <Col xs={5}><strong>Atas Nama Pemilik Sertifikat:</strong></Col>
                        <Col xs={7}>{asset.atas_nama_pemilik_sertifikat}</Col>
                      </Row>
                    )}
                  </>
                )}

                {/* Data Belum Bersertifikat */}
                {asset.pemilikan_sertifikat === "Tidak" && (
                  <>
                    {asset.belum_sertifikat_bidang && (
                      <Row className="mb-2">
                        <Col xs={5}><strong>Jumlah Bidang Belum Sertifikat:</strong></Col>
                        <Col xs={7}>{asset.belum_sertifikat_bidang}</Col>
                      </Row>
                    )}
                    {asset.belum_sertifikat_luas && (
                      <Row className="mb-2">
                        <Col xs={5}><strong>Luas Belum Bersertifikat:</strong></Col>
                        <Col xs={7}>{renderLuas(asset.belum_sertifikat_luas)}</Col>
                      </Row>
                    )}
                  </>
                )}

                {/* ===== BUKTI PEMILIKAN ===== */}
                {buktiPemilikanUrl && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Bukti Pemilikan:</strong></Col>
                    <Col xs={7}>
                      <div className="d-flex align-items-center gap-2">
                        {isImageFile(buktiPemilikanFilename) && (
                          <div style={{
                            width: "40px", height: "40px",
                            border: "1px solid #ddd", borderRadius: "4px",
                            overflow: "hidden", flexShrink: 0,
                          }}>
                            <img
                              src={buktiPemilikanUrl}
                              alt="Preview"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "0.8em", wordBreak: "break-all" }}>
                            {buktiPemilikanFilename}
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            style={{ fontSize: "0.8em" }}
                            onClick={() => handlePreviewBukti(buktiPemilikanUrl)}
                          >
                            {isPdfFile(buktiPemilikanFilename) ? "Lihat PDF" : "Lihat Gambar"}
                          </Button>
                        </div>
                      </div>
                    </Col>
                  </Row>
                )}

                {/* ===== FOTO ASET ===== */}
                {asset.foto_aset && asset.foto_aset.length > 0 && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Foto Aset:</strong></Col>
                    <Col xs={7}>
                      <div className="d-flex flex-wrap gap-1">
                        {asset.foto_aset.map((mediaUrl, index) => {
                          const fullUrl = getFileUrl(mediaUrl);
                          const isVideo = isVideoFile(mediaUrl);
                          return (
                            <div
                              key={index}
                              style={{
                                width: "60px", height: "60px",
                                border: "1px solid #dee2e6", borderRadius: "4px",
                                overflow: "hidden", cursor: "pointer",
                              }}
                              onClick={() =>
                                handlePreviewMedia(
                                  mediaUrl,
                                  `Foto Aset ${index + 1}`,
                                  index,
                                  asset.foto_aset
                                )
                              }
                              title="Klik untuk memperbesar"
                            >
                              {isVideo ? (
                                <video
                                  src={fullUrl}
                                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                />
                              ) : (
                                <img
                                  src={fullUrl}
                                  alt={`Foto Aset ${index + 1}`}
                                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Col>
                  </Row>
                )}

                {/* Keterangan Bukti Pemilikan */}
                {asset.keterangan_bukti_pemilikan && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Keterangan Bukti Pemilikan:</strong></Col>
                    <Col xs={7}>{asset.keterangan_bukti_pemilikan}</Col>
                  </Row>
                )}

                {/* ===== FOTO TAMPAK ATAS ===== */}
                {gambarTampakAtasUrl && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Foto Aset Tampak Atas:</strong></Col>
                    <Col xs={7}>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: "40px", height: "40px",
                            border: "1px solid #ddd", borderRadius: "4px",
                            overflow: "hidden", cursor: "pointer", flexShrink: 0,
                          }}
                          onClick={() =>
                            handlePreviewMedia(asset.gambar_tampak_atas_url, "Foto Aset Tampak Atas")
                          }
                          title="Klik untuk memperbesar"
                        >
                          <img
                            src={gambarTampakAtasUrl}
                            alt="Tampak Atas"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0"
                          style={{ fontSize: "0.8em" }}
                          onClick={() =>
                            handlePreviewMedia(asset.gambar_tampak_atas_url, "Foto Aset Tampak Atas")
                          }
                        >
                          Lihat Aset Tampak Atas
                        </Button>
                      </div>
                    </Col>
                  </Row>
                )}

                {/* Koordinat */}
                <Row className="mb-2">
                  <Col xs={5}><strong>Koordinat:</strong></Col>
                  <Col xs={7}><small>{getKoordinat()}</small></Col>
                </Row>
              </div>

              {/* Informasi Geografis */}
              <div style={{ backgroundColor: "#ffc107", color: "#333", padding: "10px 15px", borderRadius: "6px 6px 0 0", marginTop: "15px" }}>
                <strong>Informasi Geografis</strong>
              </div>
              <div style={{ border: "1px solid #dee2e6", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "15px" }}>
                <Row className="mb-2">
                  <Col xs={5}><strong>Luas Total:</strong></Col>
                  <Col xs={7}>{renderLuas(asset.luas)}</Col>
                </Row>
                {asset.pemilikan_sertifikat === "Ya" && asset.sertifikat_luas && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Luas Bersertifikat:</strong></Col>
                    <Col xs={7}>{renderLuas(asset.sertifikat_luas)}</Col>
                  </Row>
                )}
                {asset.pemilikan_sertifikat === "Tidak" && asset.belum_sertifikat_luas && (
                  <Row className="mb-2">
                    <Col xs={5}><strong>Luas Belum Bersertifikat:</strong></Col>
                    <Col xs={7}>{renderLuas(asset.belum_sertifikat_luas)}</Col>
                  </Row>
                )}
              </div>
            </Col>

            {/* ===== KANAN: Peta ===== */}
            <Col md={6}>
              <div style={{ backgroundColor: "#0dcaf0", color: "white", padding: "10px 15px", borderRadius: "6px 6px 0 0" }}>
                <strong>Lokasi di Peta</strong>
              </div>
              <div style={{ border: "1px solid #dee2e6", borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
                {isLoaded ? (
                  <div style={{ position: "relative" }}>
                    <GoogleMap
                      mapContainerStyle={{ height: "65vh", width: "100%" }}
                      center={mapCenter}
                      zoom={geometry ? 15 : 10}
                      onLoad={(mapInstance) => {
                        setMap(mapInstance);
                        if (geometry) adjustMapToPolygon(mapInstance);
                      }}
                      options={{
                        streetViewControl: false,
                        fullscreenControl: false,
                        mapTypeControl: false,
                        zoomControl: false,
                        panControl: false,
                        scaleControl: false,
                        rotateControl: false,
                        clickableIcons: false,
                        drawingControl: false,
                        keyboardShortcuts: false,
                        scrollwheel: true,
                        disableDoubleClickZoom: false,
                        gestureHandling: "greedy",
                        disableDefaultUI: true,
                      }}
                    >
                      {polygonPaths.length > 0 && (
                        <Polygon
                          paths={polygonPaths}
                          options={{
                            fillColor: "#00aa00",
                            fillOpacity: 0.4,
                            strokeColor: "#007700",
                            strokeWeight: 2,
                            editable: false,
                            draggable: false,
                          }}
                        />
                      )}
                    </GoogleMap>

                    {/* Dropdown tipe peta */}
                    <div style={{ position: "absolute", top: "15px", right: "15px", zIndex: 10 }}>
                      <select
                        style={{
                          backgroundColor: "white", border: "1px solid #d1d5db",
                          borderRadius: "8px", padding: "8px 12px", fontSize: "13px",
                          fontWeight: "600", cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)", minWidth: "80px", color: "#374151",
                        }}
                        onChange={(e) => { if (map) map.setMapTypeId(e.target.value); }}
                        defaultValue="roadmap"
                      >
                        <option value="roadmap">Peta</option>
                        <option value="satellite">Satelit</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="terrain">Terrain</option>
                      </select>
                    </div>

                    {/* Zoom controls */}
                    <div style={{ position: "absolute", bottom: "15px", right: "15px", display: "flex", flexDirection: "column", gap: "5px", zIndex: 10 }}>
                      <button
                        style={{
                          backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "8px",
                          width: "36px", height: "36px", fontSize: "18px", fontWeight: "bold",
                          cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        onClick={() => map && map.setZoom(map.getZoom() + 1)}
                        title="Zoom In"
                      >+</button>
                      <button
                        style={{
                          backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "8px",
                          width: "36px", height: "36px", fontSize: "18px", fontWeight: "bold",
                          cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        onClick={() => map && map.setZoom(map.getZoom() - 1)}
                        title="Zoom Out"
                      >−</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: "65vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa" }}>
                    <p className="text-muted">Memuat peta...</p>
                  </div>
                )}
                {!geometry && (
                  <div className="p-3 text-center text-muted">
                    <small><i className="fas fa-map-marker-alt me-1"></i>Lokasi aset belum ditentukan</small>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Tutup</Button>
        </Modal.Footer>
      </Modal>

      {/* ===== PREVIEW MODAL FOTO ASET (dengan navigasi) ===== */}
      <MediaPreviewModal
        show={showPreviewModal}
        onHide={handleClosePreview}
        previewMedia={previewMedia}
        previewMediaTitle={previewMediaTitle}
        currentPhotoIndex={currentPhotoIndex}
        previewAssetPhotos={previewAssetPhotos}
        onNext={handleNextPhoto}
        onPrev={handlePrevPhoto}
      />

      {/* ===== PREVIEW MODAL BUKTI PEMILIKAN (PDF/gambar) ===== */}
      <BuktiPreviewModal
        show={showBuktiPreviewModal}
        onHide={handleCloseBuktiPreview}
        buktiPreviewMedia={buktiPreviewMedia}
      />
    </>
  );
};

export default DetailModalAset;