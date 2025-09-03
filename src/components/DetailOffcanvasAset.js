import React from "react";
import { Offcanvas, Badge, ListGroup, Card } from "react-bootstrap";
import {
  FaMapMarkerAlt,
  FaRulerCombined,
  FaTag,
  FaInfoCircle,
  FaLandmark,
  FaBuilding,
} from "react-icons/fa";
import PetaAset from "./PetaAset"; // Impor PetaAset untuk mini-map

// Helper untuk mendapatkan warna badge berdasarkan status
const getStatusBadgeVariant = (status) => {
  switch (status) {
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

const DetailOffcanvasAset = ({ show, handleClose, aset }) => {
  if (!aset) return null;

  // Siapkan data untuk mini-map
  const assetForMap = aset.lokasi ? [{ ...aset }] : [];

  return (
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="end"
      backdrop={true}
      style={{ width: "500px" }} // Lebarkan sedikit untuk konten
    >
      <Offcanvas.Header closeButton className="bg-light border-bottom">
        <Offcanvas.Title as="h5">Detail Aset Tanah</Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body style={{ padding: 0 }}>
        {/* Mini Map Preview */}
        {aset.lokasi && (
          <div style={{ height: "200px", width: "100%" }}>
            <PetaAset
              assets={assetForMap}
              tampilan="poligon" // Selalu poligon di detail
              asetPilihan={aset} // Highlight aset ini
            />
          </div>
        )}

        <div style={{ padding: "1.25rem" }}>
          {/* Main Info Card */}
          <Card className="mb-3 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <FaLandmark className="me-2" /> Info Utama
            </Card.Header>
            <Card.Body>
              <h4 className="mb-1">{aset.nama || "N/A"}</h4>
              <p className="text-muted mb-2">NUP (Nomor Urut Pendaftaran)</p>
              <Badge bg={getStatusBadgeVariant(aset.status)} pill>
                {aset.status || "Status Tidak Diketahui"}
              </Badge>
            </Card.Body>
          </Card>

          {/* Details List */}
          <ListGroup variant="flush">
            <ListGroup.Item className="d-flex align-items-start">
              <FaRulerCombined size={20} className="text-muted me-3 mt-1" />
              <div>
                <strong>Luas Tanah</strong>
                <div className="text-success">
                  {aset.luas ? `${aset.luas.toLocaleString()} m²` : "-"}
                </div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="d-flex align-items-start">
              <FaMapMarkerAlt size={20} className="text-muted me-3 mt-1" />
              <div>
                <strong>Alamat</strong>
                <div>{aset.alamat || "-"}</div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="d-flex align-items-start">
              <FaBuilding size={20} className="text-muted me-3 mt-1" />
              <div>
                <strong>Wilayah</strong>
                <div>
                  Korem: {aset.korem_id || "-"} / Kodim:{" "}
                  {aset.kodim || aset.kodim_id || "-"}
                </div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="d-flex align-items-start">
              <FaTag size={20} className="text-muted me-3 mt-1" />
              <div>
                <strong>Peruntukan</strong>
                <div>{aset.peruntukan || aset.fungsi || "-"}</div>
              </div>
            </ListGroup.Item>

            <ListGroup.Item className="d-flex align-items-start">
              <FaInfoCircle size={20} className="text-muted me-3 mt-1" />
              <div>
                <strong>Keterangan</strong>
                <div>{aset.keterangan || "-"}</div>
              </div>
            </ListGroup.Item>
          </ListGroup>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default DetailOffcanvasAset;
