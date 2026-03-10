import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Modal, Button, Row, Col, Badge, Image, Card, Table, Spinner } from "react-bootstrap";
import { GoogleMap, useJsApiLoader, Polygon } from "@react-google-maps/api";
import { normalizeKodimName } from "../utils/kodimUtils";
import { parseLocation, getCentroid } from "../utils/locationUtils";
import { FaLandmark, FaImage, FaTimes, FaExpand, FaCompress, FaExpandArrowsAlt, FaCompressArrowsAlt, FaRedo, FaUndo } from "react-icons/fa";
import "./DetailModalAset.css";

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

const getStatusBadgeVariant = (status) => {
  if (!status) return "secondary";
  const statusLower = status.toLowerCase().trim();
  if (statusLower.includes("tidak dimiliki/dikuasai") ||
      statusLower.includes("tidak dimiliki") ||
      statusLower.includes("tidak dikuasai") ||
      statusLower.includes("belum dimiliki")) {
    return "danger";
  }
  if (statusLower.includes("dimiliki/dikuasai") ||
      statusLower.includes("dimiliki") ||
      statusLower.includes("dikuasai")) {
    return "success";
  }
  return "secondary";
};

const getImageUrl = (asset) => {
  if (!asset) return null;
  let imageUrl = asset.bukti_pemilikan_url || asset.bukti_pemilikan || asset.bukti_kepemilikan_url || asset.bukti_kepemilikan;
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (imageUrl.startsWith("/")) return `${API_URL}${imageUrl}`;
  return `${API_URL}/${imageUrl}`;
};

// ===== PREVIEW MODAL - FOTO ASET (WITH ALL FEATURES) =====
const MediaPreviewModal = ({ show, onHide, previewMedia, previewMediaTitle, currentPhotoIndex, previewAssetPhotos, onNext, onPrev, onPhotoSelect }) => {
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
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onHide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onNext, onPrev, onHide]);

  const handleImageLoad = () => {
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

  const hasMultiplePhotos = previewAssetPhotos && previewAssetPhotos.length > 1;

  // Reset loading when previewMedia changes
  useEffect(() => {
    if (previewMedia) {
      setLoading(true);
    }
  }, [previewMedia]);

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
          paddingBottom: "80px", // Space for thumbnail strip
        }}
      >
        {loading && (
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

        {/* Thumbnail Strip - Overlay at bottom of image area */}
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
                    if (index !== currentPhotoIndex && onPhotoSelect) {
                      const fullUrl = photoUrl.startsWith("http") ? photoUrl : `${API_URL}${photoUrl}`;
                      const isVideo = photoUrl.match(/\.(mp4|mov|webm|avi)$/i);
                      onPhotoSelect(fullUrl, isVideo, index);
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
            <Button variant="outline-primary" onClick={onPrev} size="lg">
              <i className="fas fa-arrow-left me-2"></i>Sebelumnya
            </Button>
            <Button variant="outline-primary" onClick={onNext} size="lg">
              Berikutnya<i className="fas fa-arrow-right ms-2"></i>
            </Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
};

// ===== PREVIEW MODAL - BUKTI PEMILIKAN =====
const BuktiPreviewModal = ({ show, onHide, buktiPreviewMedia }) => {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setLoading(true);
      setFullscreen(false);
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
            }}
            onLoad={handleLoad}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
      </Modal.Footer>
    </Modal>
  );
};

// ===== PREVIEW MODAL - FOTO TAMPAK ATAS =====
const PreviewMediaModal = ({ show, onHide, previewMedia, previewMediaTitle }) => {
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

  const handleImageLoad = () => {
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
        <Modal.Title>{previewMediaTitle}</Modal.Title>
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
        
        {previewMedia?.isVideo ? (
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
      </Modal.Body>
      <Modal.Footer>
      </Modal.Footer>
    </Modal>
  );
};

// ===== MAIN COMPONENT =====
const DetailModalAset = ({ asset, show, onHide, koremList, allKodimList }) => {
  const [map, setMap] = useState(null);
  const mapContainerRef = useRef(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMediaTitle, setPreviewMediaTitle] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [previewAssetPhotos, setPreviewAssetPhotos] = useState([]);
  const [buktiPreviewMedia, setBuktiPreviewMedia] = useState(null);
  const [showBuktiPreviewModal, setShowBuktiPreviewModal] = useState(false);
  const [tampakAtasPreviewMedia, setTampakAtasPreviewMedia] = useState(null);
  const [showTampakAtasPreviewModal, setShowTampakAtasPreviewModal] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  // ===== HANDLER FULLSCREEN PETA =====
  const toggleMapFullscreen = () => {
    if (!mapContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

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

  // ===== HANDLER PHOTO SELECT FROM THUMBNAIL =====
  const handlePhotoSelect = (fullUrl, isVideo, index) => {
    setPreviewMedia({ url: fullUrl, isVideo: isVideo });
    setCurrentPhotoIndex(index);
    setPreviewMediaTitle(`Foto Aset ${index + 1}`);
  };

  // ===== HANDLER PREVIEW BUKTI PEMILIKAN =====
  const handlePreviewBukti = (mediaUrl) => {
    const fullUrl = mediaUrl.startsWith("http") ? mediaUrl : `${API_URL}${mediaUrl}`;
    const filename = fullUrl.split("/").pop();
    setBuktiPreviewMedia({ url: fullUrl, isVideo: isVideoFile(mediaUrl), isPdf: isPdfFile(filename) });
    setShowBuktiPreviewModal(true);
  };

  const handleCloseBuktiPreview = () => {
    setShowBuktiPreviewModal(false);
    setBuktiPreviewMedia(null);
  };

  // ===== HANDLER PREVIEW TAMPAK ATAS =====
  const handlePreviewTampakAtas = (mediaUrl) => {
    const fullUrl = mediaUrl.startsWith("http") ? mediaUrl : `${API_URL}${mediaUrl}`;
    setTampakAtasPreviewMedia({ url: fullUrl, isVideo: isVideoFile(mediaUrl) });
    setPreviewMediaTitle("Foto Aset Tampak Atas");
    setShowTampakAtasPreviewModal(true);
  };

  const handleCloseTampakAtasPreview = () => {
    setShowTampakAtasPreviewModal(false);
    setTampakAtasPreviewMedia(null);
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
    if (normalizedAssetKodim === "Kodim 0733/Kota Semarang" || assetKodimIdentifier === "Kodim 0733/Semarang (BS)") {
      return "Kodim 0733/Kota Semarang";
    }
    const kodim = allKodimList.find((k) =>
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
    return geometry.coordinates[0].map((coord) => ({ lat: coord[1], lng: coord[0] }));
  }, [geometry]);

  const adjustMapToPolygon = useCallback((mapInstance) => {
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
  }, [geometry]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
      // Trigger resize to ensure map fits new container size
      if (map) {
        window.google.maps.event.trigger(map, "resize");
        
        // Use fitBounds to restore correct view if geometry exists
        if (geometry) {
          adjustMapToPolygon(map);
        } else {
          const bounds = map.getBounds();
          if (bounds) map.fitBounds(bounds);
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [map, geometry, adjustMapToPolygon]);

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

  const renderLuasInfo = (asset) => {
    if (!asset) return { label: "Luas Total", value: "-" };
    const hasSertifikat = asset.pemilikan_sertifikat === "Ya";
    const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
    const belumSertifikatLuas = parseFloat(asset.belum_sertifikat_luas) || 0;
    const petaLuas = parseFloat(asset.luas) || 0;

    if (hasSertifikat && sertifikatLuas > 0) {
      return { label: "Luas Bersertifikat", value: `${sertifikatLuas.toLocaleString("id-ID")} m` };
    } else if (!hasSertifikat && belumSertifikatLuas > 0) {
      return { label: "Luas Tidak Bersertifikat", value: `${belumSertifikatLuas.toLocaleString("id-ID")} m` };
    } else if (petaLuas > 0) {
      return { label: "Luas Total", value: `${petaLuas.toLocaleString("id-ID")} m` };
    }
    return { label: "Luas Total", value: "-" };
  };

  if (!asset) return null;

  const imageUrl = getImageUrl(asset);
  const filename = asset.bukti_pemilikan_filename || asset.bukti_kepemilikan_filename || "File";
  const hasValidImage = imageUrl && isImageFile(filename);
  const hasPdf = imageUrl && isPdfFile(filename);
  const luasInfo = renderLuasInfo(asset);
  const statusUmum = asset.status || "Status Tidak Diketahui";
  const statusUmumColor = getStatusBadgeVariant(asset.status);
  const sertifikatStatus = asset.pemilikan_sertifikat === "Ya" ? "Bersertifikat" : asset.pemilikan_sertifikat === "Tidak" ? "Tidak Bersertifikat" : "Status Sertifikat Tidak Diketahui";
  const sertifikatColor = asset.pemilikan_sertifikat === "Ya" ? "success" : asset.pemilikan_sertifikat === "Tidak" ? "danger" : "secondary";

  return (
    <>
      <Modal 
        show={show} 
        onHide={onHide} 
        size="lg" 
        centered 
        className="detail-modal" 
        dialogClassName="modal-65vw" 
        contentClassName="modal-content-65vw"
        scrollable={false}
      >
        <Modal.Header closeButton className="bg-primary text-white border-bottom">
          <Modal.Title><FaLandmark className="me-2" />Detail Aset BMN</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-0">
          <Row className="g-0">
            {/* ===== KIRI: INFORMASI (SCROLLABLE) ===== */}
            <Col md={7} className="modal-info-wrapper">
              <div className="modal-info-scrollable">
                <Card className="shadow-sm border-0 mb-3">
                  <Card.Body>
                    <Table responsive borderless size="sm">
                  <tbody>
                    <tr>
                      <td width="35%"><strong>NUP / Nama Aset:</strong></td>
                      <td>{asset.nama || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Wilayah Korem:</strong></td>
                      <td>{koremName}</td>
                    </tr>
                    <tr>
                      <td><strong>Wilayah Kodim:</strong></td>
                      <td>{kodimName}</td>
                    </tr>
                    <tr>
                      <td><strong>Alamat:</strong></td>
                      <td>{asset.alamat || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Peruntukan:</strong></td>
                      <td>{asset.peruntukan || asset.fungsi || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>KIB/Kode Barang:</strong></td>
                      <td>{asset.kib_kode_barang || asset.kode_barang || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Nomor Registrasi:</strong></td>
                      <td>{asset.nomor_registrasi || asset.no_registrasi || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Asal Milik:</strong></td>
                      <td>{asset.asal_milik || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td><Badge bg={statusUmumColor}>{statusUmum}</Badge></td>
                    </tr>
                    <tr>
                      <td><strong>Status Sertifikat:</strong></td>
                      <td><Badge bg={sertifikatColor}>{sertifikatStatus}</Badge></td>
                    </tr>
                    <tr>
                      <td><strong>{luasInfo.label}:</strong></td>
                      <td><span className="fw-bold text-primary">{luasInfo.value}</span></td>
                    </tr>
                    {asset.pemilikan_sertifikat === "Ya" && asset.sertifikat_bidang && (
                      <tr>
                        <td><strong>Jumlah Bidang:</strong></td>
                        <td>{asset.sertifikat_bidang}</td>
                      </tr>
                    )}
                    {asset.pemilikan_sertifikat === "Ya" && asset.atas_nama_pemilik_sertifikat && (
                      <tr>
                        <td><strong>Atas Nama Pemilik Sertifikat:</strong></td>
                        <td>{asset.atas_nama_pemilik_sertifikat}</td>
                      </tr>
                    )}
                    {asset.pemilikan_sertifikat === "Tidak" && asset.belum_sertifikat_bidang && (
                      <tr>
                        <td><strong>Bidang Belum Sertifikat:</strong></td>
                        <td>{asset.belum_sertifikat_bidang}</td>
                      </tr>
                    )}
                    <tr>
                      <td><strong>Bukti Pemilikan:</strong></td>
                      <td>
                        {imageUrl ? (
                          <div className="d-flex align-items-center gap-2">
                            {hasValidImage && (
                              <div style={{ width: "40px", height: "40px", border: "1px solid #ddd", borderRadius: "4px", overflow: "hidden" }}>
                                <img src={imageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: "0.8em" }}>{filename}</div>
                              <Button variant="link" size="sm" onClick={() => handlePreviewBukti(imageUrl)} className="p-0" style={{ fontSize: "0.7em" }} disabled={!hasPdf && !hasValidImage}>
                                {hasPdf ? "Lihat PDF" : "Lihat Gambar"}
                              </Button>
                            </div>
                          </div>
                        ) : <span className="text-muted">Tidak ada file</span>}
                      </td>
                    </tr>
                    {asset.keterangan_bukti_pemilikan && (
                      <tr>
                        <td><strong>Keterangan Bukti Pemilikan:</strong></td>
                        <td>{asset.keterangan_bukti_pemilikan}</td>
                      </tr>
                    )}
                    {asset.keterangan && (
                      <tr>
                        <td><strong>Sejarah:</strong></td>
                        <td>{asset.keterangan}</td>
                      </tr>
                    )}
                    <tr>
                      <td><strong>Koordinat:</strong></td>
                      <td>Lat: {centroid ? centroid[0].toFixed(6) : "N/A"}, Lng: {centroid ? centroid[1].toFixed(6) : "N/A"}</td>
                    </tr>
                  </tbody>
                </Table>

                {/* Foto Aset */}
                {asset.foto_aset && Array.isArray(asset.foto_aset) && asset.foto_aset.length > 0 && (
                  <Card className="mt-3 shadow-sm">
                    <Card.Header className="bg-light">Foto Aset</Card.Header>
                    <Card.Body>
                      <Row>
                        {asset.foto_aset.map((foto, index) => {
                          const fullUrl = foto.startsWith("http") ? foto : `${API_URL}${foto}`;
                          const isVideo = isVideoFile(fullUrl);
                          return (
                            <Col key={index} md={4} className="mb-3">
                              <Card onClick={() => handlePreviewMedia(foto, `Foto Aset ${index + 1}`, index, asset.foto_aset)} className="h-100" style={{ cursor: "pointer", border: "1px solid #ddd" }}>
                                {isVideo ? (
                                  <div style={{ height: "100px", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <FaImage size={30} color="#fff" />
                                  </div>
                                ) : (
                                  <Card.Img variant="top" src={fullUrl} alt={`Foto Aset ${index + 1}`} style={{ height: "100px", width: "100%", objectFit: "cover" }} />
                                )}
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {/* Foto Tampak Atas */}
                {asset.gambar_tampak_atas_url && (
                  <Card className="mt-3 shadow-sm">
                    <Card.Header className="bg-light">Foto Aset Tampak Atas</Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={4}>
                          <Card onClick={() => handlePreviewTampakAtas(asset.gambar_tampak_atas_url)} className="h-100" style={{ cursor: "pointer", border: "1px solid #ddd" }}>
                            <Card.Img variant="top" src={getFileUrl(asset.gambar_tampak_atas_url)} alt="Tampak Atas" style={{ height: "100px", width: "100%", objectFit: "cover" }} />
                          </Card>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>
          </div>
            </Col>

            {/* ===== KANAN: PETA (FIXED) ===== */}
            <Col md={5} className="modal-map-wrapper" style={{ height: '100%', minHeight: '500px' }}>
              {asset.lokasi && isLoaded ? (
                <div ref={mapContainerRef} className="modal-map-fixed" style={{ height: '100%', width: '100%', position: 'relative' }}>
                  <GoogleMap
                    mapContainerStyle={{ height: "100%", width: "100%" }}
                    center={mapCenter}
                    zoom={geometry ? 15 : 10}
                    onLoad={(mapInstance) => { setMap(mapInstance); if (geometry) adjustMapToPolygon(mapInstance); }}
                    options={{
                      streetViewControl: false,
                      fullscreenControl: false, // Nonaktifkan bawaan agar tidak tertutup menu tipe peta
                      mapTypeControl: false,
                      zoomControl: false,
                      gestureHandling: "greedy",
                      disableDefaultUI: true,
                    }}
                  >
                    {polygonPaths.length > 0 && (
                      <Polygon
                        paths={polygonPaths}
                        options={{
                          fillColor: "#11998e",
                          fillOpacity: 0.4,
                          strokeColor: "#0f8a80",
                          strokeWeight: 3,
                        }}
                      />
                    )}
                  </GoogleMap>

                  {/* Floating Controls Overlay */}
                  <div style={{ position: "absolute", top: "15px", left: "15px", zIndex: 10 }}>
                    <button 
                      type="button"
                      className="shadow border-0 d-flex align-items-center justify-content-center map-control-btn" 
                      style={{ 
                        width: "40px", 
                        height: "40px", 
                        backgroundColor: "#ffffff", 
                        borderRadius: "4px",
                        padding: 0,
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                      }} 
                      onClick={toggleMapFullscreen}
                      title={isMapFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
                    >
                      {isMapFullscreen ? 
                        <FaCompress size={22} style={{ color: "#000000", display: "block" }} /> : 
                        <FaExpand size={22} style={{ color: "#000000", display: "block" }} />
                      }
                    </button>
                  </div>

                  <div style={{ position: "absolute", top: "15px", right: "15px", zIndex: 10 }}>
                    <select className="form-select form-select-sm shadow fw-bold border-0" 
                      style={{ 
                        minWidth: "120px",
                        backgroundColor: "#ffffff",
                        color: "#333",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                      }}
                      onChange={(e) => map?.setMapTypeId(e.target.value)} defaultValue="roadmap"
                    >
                      <option value="roadmap">Tampilan Peta</option>
                      <option value="satellite">Citra Satelit</option>
                      <option value="hybrid">Hybrid (Campuran)</option>
                    </select>
                  </div>

                  <div style={{ position: "absolute", bottom: "15px", right: "15px", zIndex: 10, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Button 
                      variant="white" 
                      size="sm" 
                      className="shadow border-0 d-flex align-items-center justify-content-center map-control-btn" 
                      style={{ 
                        width: "40px", 
                        height: "40px", 
                        fontSize: "1.2rem",
                        backgroundColor: "#ffffff"
                      }} 
                      onClick={() => map?.setZoom(map.getZoom() + 1)}
                    >
                      +
                    </Button>
                    <Button 
                      variant="white" 
                      size="sm" 
                      className="shadow border-0 d-flex align-items-center justify-content-center map-control-btn" 
                      style={{ 
                        width: "40px", 
                        height: "40px", 
                        fontSize: "1.2rem",
                        backgroundColor: "#ffffff"
                      }} 
                      onClick={() => map?.setZoom(map.getZoom() - 1)}
                    >
                      -
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="modal-map-fixed">
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                    <div className="text-center">
                      <div className="spinner-border text-primary mb-2" role="status"></div>
                      <p className="text-muted small">Menyiapkan Peta...</p>
                    </div>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Tutup</Button>
        </Modal.Footer>
      </Modal>

      {/* ===== PREVIEW MODAL FOTO ASET ===== */}
      <MediaPreviewModal show={showPreviewModal} onHide={handleClosePreview} previewMedia={previewMedia} previewMediaTitle={previewMediaTitle} currentPhotoIndex={currentPhotoIndex} previewAssetPhotos={previewAssetPhotos} onNext={handleNextPhoto} onPrev={handlePrevPhoto} onPhotoSelect={handlePhotoSelect} />

      {/* ===== PREVIEW MODAL BUKTI PEMILIKAN ===== */}
      <BuktiPreviewModal show={showBuktiPreviewModal} onHide={handleCloseBuktiPreview} buktiPreviewMedia={buktiPreviewMedia} />

      {/* ===== PREVIEW MODAL TAMPAK ATAS ===== */}
      <PreviewMediaModal show={showTampakAtasPreviewModal} onHide={handleCloseTampakAtasPreview} previewMedia={tampakAtasPreviewMedia} previewMediaTitle={previewMediaTitle} />
    </>
  );
};

export default DetailModalAset;
