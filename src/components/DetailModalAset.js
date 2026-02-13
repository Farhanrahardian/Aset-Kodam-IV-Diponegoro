import React, { useMemo } from "react";
import { Modal, Button, Row, Col, Badge, Image } from "react-bootstrap";
import { normalizeKodimName } from "../utils/kodimUtils";

const API_URL = "http://localhost:3001";

const DetailModalAset = ({ 
  asset, 
  show, 
  onHide, 
  koremList, 
  allKodimList,
  koremGeoJSON,
  kodimGeoJSON 
}) => {
  // Get Korem name
  const koremName = useMemo(() => {
    if (!asset || !koremList) return "-";
    const korem = koremList.find((k) => k.id == asset.korem_id);
    return korem?.nama || "-";
  }, [asset, koremList]);

  // Get Kodim name
  const kodimName = useMemo(() => {
    if (!asset || !allKodimList) return "-";
    
    const assetKodimIdentifier = String(asset.kodim || asset.kodim_id || "").trim();
    if (!assetKodimIdentifier) return "-";

    const normalizedAssetKodim = normalizeKodimName(assetKodimIdentifier);

    // Special case for Semarang
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

  // Get image URL
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

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Dimiliki/Dikuasai":
        return "success";
      case "TIdak Dimiliki/Dikuasai":
        return "danger";
      default:
        return "secondary";
    }
  };

  // Render luas
  const renderLuas = (asset) => {
    if (!asset) return "-";
    const totalLuas = parseFloat(asset.luas) || 0;
    return totalLuas > 0 ? totalLuas.toLocaleString("id-ID") + " m²" : "-";
  };

  if (!asset) return null;

  const imageUrl = getImageUrl(asset);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Detail Aset BMN</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Row>
          {/* Left Column - Basic Info */}
          <Col md={6}>
            <h6 className="text-primary mb-3">Informasi Dasar</h6>
            
            <div className="mb-3">
              <small className="text-muted">NUP</small>
              <p className="mb-0 fw-bold">{asset.nama || "-"}</p>
            </div>

            <div className="mb-3">
              <small className="text-muted">Wilayah Korem</small>
              <p className="mb-0">{koremName}</p>
            </div>

            <div className="mb-3">
              <small className="text-muted">Wilayah Kodim</small>
              <p className="mb-0">{kodimName}</p>
            </div>

            <div className="mb-3">
              <small className="text-muted">Alamat</small>
              <p className="mb-0">{asset.alamat || "-"}</p>
            </div>

            <div className="mb-3">
              <small className="text-muted">Status</small>
              <div>
                <Badge bg={getStatusBadgeClass(asset.status)}>
                  {asset.status || "-"}
                </Badge>
              </div>
            </div>
          </Col>

          {/* Right Column - Details */}
          <Col md={6}>
            <h6 className="text-primary mb-3">Detail Aset</h6>

            <div className="mb-3">
              <small className="text-muted">Peruntukan/Fungsi</small>
              <p className="mb-0">{asset.peruntukan || asset.fungsi || "-"}</p>
            </div>

            <div className="mb-3">
              <small className="text-muted">Luas Tanah</small>
              <p className="mb-0">{renderLuas(asset)}</p>
            </div>

            <div className="mb-3">
              <small className="text-muted">Sertifikat</small>
              <div>
                {asset.pemilikan_sertifikat === "Ya" ? (
                  <Badge bg="success">Ya</Badge>
                ) : (
                  <Badge bg="danger">Tidak</Badge>
                )}
              </div>
            </div>

            {asset.nomor_sertifikat && (
              <div className="mb-3">
                <small className="text-muted">Nomor Sertifikat</small>
                <p className="mb-0">{asset.nomor_sertifikat}</p>
              </div>
            )}

            {asset.tahun_perolehan && (
              <div className="mb-3">
                <small className="text-muted">Tahun Perolehan</small>
                <p className="mb-0">{asset.tahun_perolehan}</p>
              </div>
            )}
          </Col>
        </Row>

        {/* Bukti Pemilikan Section */}
        {imageUrl && (
          <Row className="mt-4">
            <Col>
              <h6 className="text-primary mb-3">Bukti Pemilikan</h6>
              <div className="text-center">
                <Image 
                  src={imageUrl} 
                  alt="Bukti Pemilikan" 
                  fluid 
                  rounded
                  style={{ maxHeight: "300px", objectFit: "contain" }}
                />
              </div>
            </Col>
          </Row>
        )}

        {/* Additional Notes */}
        {asset.keterangan && (
          <Row className="mt-4">
            <Col>
              <h6 className="text-primary mb-3">Keterangan</h6>
              <p className="text-muted">{asset.keterangan}</p>
            </Col>
          </Row>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DetailModalAset;