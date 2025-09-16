import React from "react";
import {
  Offcanvas,
  Badge,
  Card,
  Row,
  Col,
  Button,
  Image,
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
} from "react-icons/fa";
import PetaAset from "./PetaAset";

const API_URL = "http://localhost:3001";

// Helper untuk mendapatkan warna badge berdasarkan status
const getStatusBadgeVariant = (status) => {
  switch (status) {
    case "Dimiliki/Dikuasai":
      return "success";
    case "Tidak Dimiliki/Tidak Dikuasai":
      return "danger";
    case "Lain-lain":
      return "warning";
    case "Aktif":
      return "success";
    case "Sengketa":
      return "danger";
    case "Dalam Proses":
      return "warning";
    case "Tidak Aktif":
      return "secondary";
    default:
      return "light";
  }
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

const DetailOffcanvasAset = ({
  show,
  handleClose,
  aset,
  koremList = [],
  allKodimList = [],
}) => {
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

  // Helper function to determine which area to display based on certificate status
  const renderLuasInfo = (asset) => {
    const hasSertifikat = asset.pemilikan_sertifikat === "Ya";
    const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
    const belumSertifikatLuas = parseFloat(asset.belum_sertifikat_luas) || 0;
    const petaLuas = parseFloat(asset.luas) || 0;

    if (hasSertifikat && sertifikatLuas > 0) {
      return {
        label: "Luas Bersertifikat",
        value: `${sertifikatLuas.toLocaleString("id-ID")} m²`,
        className: "text-success",
      };
    } else if (!hasSertifikat && belumSertifikatLuas > 0) {
      return {
        label: "Luas Tidak Bersertifikat",
        value: `${belumSertifikatLuas.toLocaleString("id-ID")} m²`,
        className: "text-warning",
      };
    } else if (petaLuas > 0) {
      return {
        label: "Luas",
        value: `${petaLuas.toLocaleString("id-ID")} m²`,
        className: "text-muted",
      };
    }

    return {
      label: "Luas",
      value: "-",
      className: "text-muted",
    };
  };

  const luasInfo = renderLuasInfo(aset);

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
        className="bg-primary text-white border-bottom"
      >
        <Offcanvas.Title as="h5">
          <FaLandmark className="me-2" />
          Detail Aset Tanah
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body style={{ padding: 0 }}>
        {/* Mini Map Preview */}
        {aset.lokasi && (
          <div style={{ height: "200px", width: "100%" }}>
            <PetaAset
              key={`detail-${aset.id}-${aset.updated_at || Date.now()}`}
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
              <FaLandmark className="me-2" /> Informasi Aset Tanah
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <h5 className="mb-1">{aset.nama || "N/A"}</h5>
                <small className="text-muted">
                  NUP (Nomor Urut Pendaftaran)
                </small>
                <div className="mt-2">
                  <Badge bg={getStatusBadgeVariant(aset.status)} pill>
                    {aset.status || "Status Tidak Diketahui"}
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
                        <strong>Status:</strong>
                      </td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(aset.status)}>
                          {aset.status || "-"}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>KIB/Kode Barang:</strong>
                      </td>
                      <td>{aset.kib_kode_barang || aset.kode_barang || "-"}</td>
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
                                  cursor: "pointer",
                                }}
                                onClick={() => window.open(imageUrl, "_blank")}
                                title="Klik untuk lihat gambar penuh"
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
                                onClick={() => window.open(imageUrl, "_blank")}
                                className="p-0"
                                style={{ fontSize: "0.7em" }}
                              >
                                Buka File
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
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>

          {/* Image Preview Card - Bukti Pemilikan */}
          {hasValidImage && (
            <Card className="mb-3 shadow-sm">
              <Card.Header className="bg-info text-white">
                <FaFileAlt className="me-2" /> Preview Bukti Pemilikan
              </Card.Header>
              <Card.Body className="text-center">
                <Image
                  src={imageUrl}
                  alt="Bukti Pemilikan"
                  fluid
                  rounded
                  style={{
                    maxHeight: "200px",
                    cursor: "pointer",
                    border: "1px solid #ddd",
                  }}
                  onClick={() => window.open(imageUrl, "_blank")}
                />
                <div className="mt-2">
                  <small className="text-muted">
                    Klik gambar untuk melihat ukuran penuh
                  </small>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Asset Photos Card */}
          {aset.foto_aset && Array.isArray(aset.foto_aset) && aset.foto_aset.length > 0 && (
            <Card className="mb-3 shadow-sm">
              <Card.Header className="bg-success text-white">
                <FaFileAlt className="me-2" /> Foto Aset
              </Card.Header>
              <Card.Body>
                <Row>
                  {aset.foto_aset.map((foto, index) => (
                    <Col key={index} md={4} className="mb-3">
                      <Image
                        src={`${API_URL}${foto}`}
                        alt={`Foto Aset ${index + 1}`}
                        fluid
                        rounded
                        style={{
                          height: "100px",
                          width: "100%",
                          objectFit: "cover",
                          cursor: "pointer",
                          border: "1px solid #ddd",
                        }}
                        onClick={() => window.open(`${API_URL}${foto}`, "_blank")}
                      />
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          )}

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
                      <strong>Status Sertifikat:</strong>
                      <br />
                      <span
                        className={
                          aset.pemilikan_sertifikat === "Ya"
                            ? "text-success"
                            : "text-warning"
                        }
                      >
                        {aset.pemilikan_sertifikat === "Ya"
                          ? "Bersertifikat"
                          : "Tidak Bersertifikat"}
                      </span>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

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
  );
};

export default DetailOffcanvasAset;
