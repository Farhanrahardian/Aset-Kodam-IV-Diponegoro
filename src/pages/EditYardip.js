import React from "react";
import { Row, Col, Button } from "react-bootstrap";
import FormYardip from "../components/FormYardip";

const EditYardip = ({
  editingAsset,
  editedLocationData,
  editSelectedProvince,
  editSelectedCity,
  kotaData,
  onSave,
  onCancel,
  onLocationChange,
  onEditLocation,
  onCancelEditLocation,
  isEditingLocation
}) => {
  if (!editingAsset) return null;

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
        <span>Edit Aset Yardip - {editingAsset.pengelola}</span>
        <div className="d-flex gap-2">
          <Button
            variant={isEditingLocation ? "outline-light" : "light"}
            size="sm"
            onClick={onEditLocation}
            disabled={isEditingLocation}
          >
            {isEditingLocation
              ? "Sedang Edit Lokasi..."
              : "Edit Lokasi"}
          </Button>
          <Button
            variant="outline-light"
            size="sm"
            onClick={onCancel}
          >
            Batal Edit
          </Button>
        </div>
      </div>
      <div className="card-body">
        <Row>
          <Col md={6}>
            <FormYardip
              onSave={onSave}
              onCancel={onCancel}
              assetToEdit={editingAsset}
              isEnabled={true}
              initialGeometry={
                editedLocationData ? editedLocationData.geometry : null
              }
              initialArea={
                editedLocationData ? editedLocationData.area : null
              }
              kotaData={kotaData}
              onLocationChange={onLocationChange}
              hasDrawnArea={!!editingAsset.lokasi}
            />

            {/* Status edit lokasi */}
            {editedLocationData && (
              <div className="alert alert-success mt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="fas fa-check-circle me-2"></i>
                    <strong>Lokasi Baru Siap!</strong>
                    <br />
                    <small className="text-muted">
                      Luas: {editedLocationData.area?.toFixed(2)} m²
                    </small>
                  </div>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={onCancelEditLocation}
                  >
                    Batalkan
                  </button>
                </div>
              </div>
            )}
          </Col>
          <Col md={6}>
            {/* Preview area atau informasi tambahan */}
            <div className="bg-light p-3 rounded">
              <h6 className="text-muted mb-3">Preview Data</h6>
              <small>
                <strong>ID:</strong> {editingAsset.id}
                <br />
                <strong>Status Saat Ini:</strong>{" "}
                <span
                  className={`badge ${
                    editingAsset.status === "Dimiliki/Dikuasai"
                      ? "bg-success"
                      : editingAsset.status ===
                        "Tidak Dimiliki/Tidak Dikuasai"
                      ? "bg-danger"
                      : editingAsset.status === "Lain-lain"
                      ? "bg-warning"
                      : "bg-secondary"
                  }`}
                >
                  {editingAsset.status}
                </span>
                <br />
                <strong>Lokasi:</strong> {editingAsset.kabkota},{" "}
                {editingAsset.kecamatan}
                <br />
                <strong>Lokasi Edit:</strong> {editSelectedProvince && editSelectedCity ? 
                  `${kotaData[editSelectedProvince]?.find(c => c.id === editSelectedCity)?.name || editSelectedCity} (${editSelectedProvince === "jateng" ? "Jawa Tengah" : "DI Yogyakarta"})` : 
                  "Belum dipilih"
                }
                <br />
                {editingAsset.area && (
                  <>
                    <strong>Luas Area Saat Ini:</strong>{" "}
                    {Number(editingAsset.area).toFixed(2)} m²
                    <br />
                  </>
                )}
                {editedLocationData && editedLocationData.area && (
                  <>
                    <strong>Luas Area Baru:</strong>{" "}
                    <span className="text-success fw-bold">
                      {editedLocationData.area.toFixed(2)} m²
                    </span>
                    <br />
                  </>
                )}
                <strong>Terakhir Diupdate:</strong>{" "}
                {editingAsset.updated_at
                  ? new Date(editingAsset.updated_at).toLocaleString(
                      "id-ID"
                    )
                  : "-"}
              </small>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default EditYardip;