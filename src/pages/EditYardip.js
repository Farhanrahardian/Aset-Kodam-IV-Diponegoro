import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button, Alert } from "react-bootstrap";
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
  // State untuk area yang dihitung dari lokasi yang sudah ada
  const [currentArea, setCurrentArea] = useState(0);
  const [hasDrawnArea, setHasDrawnArea] = useState(false);

  // Initialize area dari asset yang sedang diedit
  useEffect(() => {
    if (editingAsset?.area) {
      setCurrentArea(Number(editingAsset.area));
      setHasDrawnArea(true);
    }
    
    // Update area jika ada lokasi baru yang digambar
    if (editedLocationData?.area) {
      setCurrentArea(Number(editedLocationData.area));
      setHasDrawnArea(true);
    }
  }, [editingAsset, editedLocationData]);

  // Get selected city name for display
  const getSelectedCityName = () => {
    if (!editSelectedProvince || !editSelectedCity || !kotaData[editSelectedProvince]) {
      return null;
    }
    const cityData = kotaData[editSelectedProvince].find(c => c.id === editSelectedCity);
    return cityData ? cityData.name : null;
  };

  const selectedCityName = getSelectedCityName();

  // Prepare geometry data for form
  const getGeometryData = () => {
    if (editedLocationData) {
      return editedLocationData.geometry || editedLocationData.coordinates;
    }
    return editingAsset?.lokasi;
  };

  // Handle area change from form
  const handleAreaChange = (newArea) => {
    setCurrentArea(newArea);
  };

  if (!editingAsset) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <Card className="mb-3">
        <Card.Header className="bg-warning text-dark">
          <div className="d-flex justify-content-between align-items-center">
            <span>
              <i className="fas fa-edit me-2"></i>
              Edit Aset Yardip: {editingAsset.pengelola}
            </span>
            <Button variant="outline-dark" size="sm" onClick={onCancel}>
              <i className="fas fa-times me-1"></i>
              Batal Edit
            </Button>
          </div>
        </Card.Header>
      </Card>

      <Row>
        {/* Form Edit */}
        <Col md={12}>
          {/* Location Edit Status */}
          {editedLocationData && (
            <Alert variant="success" className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Lokasi Baru Sudah Digambar!</strong>
                  <br />
                  <small>
                    Luas baru: {editedLocationData.area?.toFixed(2)} m² 
                    (sebelumnya: {editingAsset.area ? Number(editingAsset.area).toFixed(2) : 0} m²)
                  </small>
                </div>
              </div>
            </Alert>
          )}

          {/* Current Location Info */}
          <Card className="mb-3">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">Informasi Lokasi Saat Ini</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <strong>Lokasi Target:</strong>
                  <br />
                  <span className="text-muted">
                    {selectedCityName || editingAsset.kota || "Belum dipilih"}
                    {editSelectedProvince && (
                      <span>
                        {" "}({editSelectedProvince === "jateng" ? "Jawa Tengah" : "DI Yogyakarta"})
                      </span>
                    )}
                  </span>
                </Col>
                <Col md={6}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Status Lokasi:</strong>
                      <br />
                      <span className={`badge ${hasDrawnArea ? 'bg-success' : 'bg-warning'}`}>
                        {hasDrawnArea ? 'Ada Gambar' : 'Belum Ada Gambar'}
                      </span>
                    </div>
                    {hasDrawnArea && (
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={onEditLocation}
                        disabled={isEditingLocation}
                      >
                        <i className="fas fa-map-marker-alt me-1"></i>
                        {isEditingLocation ? 'Sedang Edit...' : 'Edit Lokasi'}
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Form */}
          <FormYardip
            onSave={onSave}
            onCancel={onCancel}
            initialGeometry={getGeometryData()}
            initialArea={currentArea}
            isEnabled={!isEditingLocation}
            assetToEdit={editingAsset}
            kotaData={kotaData}
            onLocationChange={onLocationChange}
            hasDrawnArea={hasDrawnArea}
            onAreaChange={handleAreaChange}
          />
        </Col>
      </Row>
    </div>
  );
};

export default EditYardip;