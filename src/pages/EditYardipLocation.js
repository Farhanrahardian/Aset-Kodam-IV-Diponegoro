import React from "react";
import { Col, Button, Alert } from "react-bootstrap";
import PetaAsetYardip from "../components/PetaAsetYardip";
import MapErrorBoundary from "../components/MapErrorBoundary";

const EditYardipLocation = ({
  editingAsset,
  isEditingLocation,
  onDrawingCreated,
  onCancelEditLocation,
  editCityBounds,
  editSelectedCity,
  editSelectedProvince,
  kotaData,
  jatengBoundary,
  diyBoundary,
  prepareEditAssetForMap,
  editedLocationData,
}) => {
  if (!editingAsset || !isEditingLocation) return null;

  // Validasi dan parsing lokasi dari asset yang sedang diedit
  const validateAndParseLocation = (locationData) => {
    if (!locationData) {
      console.log("No location data provided for editing");
      return null;
    }

    let lokasi = locationData;

    // Parse string JSON jika perlu
    if (typeof lokasi === "string") {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        console.error("Failed to parse location JSON:", e);
        return null;
      }
    }

    // Handle different location data formats
    if (Array.isArray(lokasi)) {
      // Format: [[[lng, lat], ...]]
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        typeof lokasi[0][0] === "number"
      ) {
        return [lokasi];
      }
      // Format: [[[[lng, lat], ...]]]
      if (
        lokasi.length > 0 &&
        Array.isArray(lokasi[0]) &&
        Array.isArray(lokasi[0][0])
      ) {
        return lokasi;
      }
    }

    // Handle GeoJSON format
    if (lokasi.type === "Polygon" && lokasi.coordinates) {
      return lokasi.coordinates;
    }

    // Handle coordinates property
    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }

    console.warn("Unrecognized location format for editing:", lokasi);
    return null;
  };

  // Prepare current asset data untuk peta
  const prepareCurrentAssetForMap = () => {
    if (typeof prepareEditAssetForMap === "function") {
      return prepareEditAssetForMap();
    }

    // Fallback: prepare asset data manually
    if (!editingAsset) return [];

    const validatedLocation = validateAndParseLocation(editingAsset.lokasi);
    if (!validatedLocation) return [];

    return [
      {
        id: editingAsset.id || `temp-${Date.now()}`,
        nama: editingAsset.pengelola || "Unknown",
        kodim: editingAsset.bidang || "",
        lokasi: validatedLocation,
        luas: Number(editingAsset.area) || 0,
        status: editingAsset.status || "",
        kabkota: editingAsset.kabkota || "",
        kecamatan: editingAsset.kecamatan || "",
        kelurahan: editingAsset.kelurahan || "",
        type: "yardip",
        isCurrentLocation: true, // Flag untuk styling
      },
    ];
  };

  const editAssetData = prepareCurrentAssetForMap();

  // Get selected city name for display
  const getSelectedCityName = () => {
    if (
      !editSelectedProvince ||
      !editSelectedCity ||
      !kotaData[editSelectedProvince]
    ) {
      return "Belum dipilih";
    }
    const cityData = kotaData[editSelectedProvince].find(
      (c) => c.id === editSelectedCity
    );
    return cityData ? cityData.name : "Tidak ditemukan";
  };

  // Handle drawing creation with proper area formatting
  const handleDrawingCreated = (data) => {
    console.log("Raw drawing data:", data);

    if (data && data.area) {
      // Format area dengan 2 decimal places untuk menghindari precision issues
      const formattedArea = Math.round(data.area * 100) / 100;

      const formattedData = {
        ...data,
        area: formattedArea,
        originalDrawnArea: data.area, // Keep original for reference
        isManuallyAdjusted: false,
      };

      console.log("Formatted drawing data:", formattedData);
      onDrawingCreated(formattedData);
    } else {
      console.warn("Drawing data missing area information");
      onDrawingCreated(data);
    }
  };

  const selectedCityName = getSelectedCityName();

  return (
    <Col md={12} className="mt-3">
      <div className="card shadow-sm">
        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0">
              <i className="fas fa-edit me-2"></i>
              Edit Lokasi Aset Yardip - {editingAsset.pengelola}
            </h6>
            <small>
              {editAssetData.length > 0
                ? "Polygon hijau menunjukkan lokasi saat ini. Gambar polygon baru untuk mengubah lokasi."
                : "Belum ada lokasi sebelumnya. Silakan gambar polygon baru."}
            </small>
          </div>
          <Button
            variant="outline-dark"
            size="sm"
            onClick={onCancelEditLocation}
          >
            <i className="fas fa-times me-1"></i>
            Selesai Edit Lokasi
          </Button>
        </div>

        {/* Alert untuk status drawing yang baru */}
        {editedLocationData && (
          <Alert variant="success" className="mx-3 mt-3 mb-0">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <i className="fas fa-check-circle me-2"></i>
                <strong>Polygon Baru Berhasil Digambar!</strong>
                <br />
                <small>
                  Luas:{" "}
                  {Number(editedLocationData.area).toLocaleString("id-ID")} m²
                  {editingAsset.area && (
                    <span>
                      {" "}
                      (sebelumnya:{" "}
                      {Number(editingAsset.area).toLocaleString("id-ID")} m²)
                    </span>
                  )}
                </small>
              </div>
            </div>
          </Alert>
        )}

        <div className="card-body p-2">
          <div style={{ height: "600px", width: "100%" }}>
            <MapErrorBoundary height="600px">
              <PetaAsetYardip
                key={`edit-map-${
                  editingAsset.id
                }-${isEditingLocation}-${Date.now()}`}
                assets={editAssetData}
                isDrawing={true}
                onDrawingCreated={handleDrawingCreated}
                jatengBoundary={jatengBoundary}
                diyBoundary={diyBoundary}
                cityBounds={editCityBounds}
                selectedCity={
                  selectedCityName !== "Belum dipilih" ? selectedCityName : null
                }
                fitBounds={true}
                editMode={true}
                displayMode="polygon" // Ensure polygon display for editing
              />
            </MapErrorBoundary>
          </div>

          {/* Info Panel */}
          <div className="mt-3 p-3 bg-light rounded">
            <div className="row">
              <div className="col-md-4">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  <strong>Cara edit lokasi:</strong>
                </small>
                <ul className="small text-muted mt-1 mb-0">
                  <li>Polygon hijau adalah lokasi saat ini (jika ada)</li>
                  <li>Gunakan tool drawing untuk membuat polygon baru</li>
                  <li>Polygon baru akan mengganti lokasi yang lama</li>
                  <li>Klik "Selesai Edit Lokasi" setelah selesai</li>
                </ul>
              </div>

              <div className="col-md-4">
                <small className="text-muted">
                  <i className="fas fa-map me-1"></i>
                  <strong>Status lokasi:</strong>
                </small>
                <div className="small mt-1">
                  <div className="mb-1">
                    <span className="text-muted">Lokasi saat ini: </span>
                    <span
                      className={`badge ${
                        editAssetData.length > 0 ? "bg-success" : "bg-warning"
                      }`}
                    >
                      {editAssetData.length > 0 ? "Ada lokasi" : "Tidak ada"}
                    </span>
                  </div>
                  <div className="mb-1">
                    <span className="text-muted">Target kota: </span>
                    <span className="badge bg-info">{selectedCityName}</span>
                  </div>
                  {editedLocationData && (
                    <div>
                      <span className="text-muted">Polygon baru: </span>
                      <span className="badge bg-success">
                        Siap (
                        {Number(editedLocationData.area).toLocaleString(
                          "id-ID"
                        )}{" "}
                        m²)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-4">
                <small className="text-muted">
                  <i className="fas fa-ruler me-1"></i>
                  <strong>Informasi area:</strong>
                </small>
                <div className="small mt-1">
                  {editingAsset.area && (
                    <div className="mb-1">
                      <span className="text-muted">Luas saat ini: </span>
                      <span className="text-primary fw-bold">
                        {Number(editingAsset.area).toLocaleString("id-ID")} m²
                      </span>
                    </div>
                  )}
                  {editedLocationData && (
                    <div>
                      <span className="text-muted">Luas baru: </span>
                      <span className="text-success fw-bold">
                        {Number(editedLocationData.area).toLocaleString(
                          "id-ID"
                        )}{" "}
                        m²
                      </span>
                      {editingAsset.area && (
                        <div className="mt-1">
                          <small
                            className={`${
                              editedLocationData.area > editingAsset.area
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {editedLocationData.area > editingAsset.area
                              ? "+"
                              : ""}
                            {(
                              editedLocationData.area - editingAsset.area
                            ).toLocaleString("id-ID")}{" "}
                            m²
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Helper */}
          <div className="mt-2 p-2 bg-info bg-opacity-10 rounded">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-info">
                <i className="fas fa-lightbulb me-1"></i>
                <strong>Tips:</strong> Jika peta tidak otomatis zoom ke kota
                target, pastikan Anda sudah memilih provinsi dan kota di form
                edit.
              </small>
              <div>
                {editSelectedProvince && editSelectedCity && (
                  <small className="badge bg-info">
                    Auto-zoom:{" "}
                    {editSelectedProvince === "jateng"
                      ? "Jawa Tengah"
                      : "DI Yogyakarta"}{" "}
                    - {selectedCityName}
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Col>
  );
};

export default EditYardipLocation;
