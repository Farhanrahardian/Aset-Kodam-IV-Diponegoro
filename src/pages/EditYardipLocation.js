import React from "react";
import { Col, Button } from "react-bootstrap";
import PetaAsetYardip from "../components/PetaAsetYardip";

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
  editedLocationData
}) => {
  if (!editingAsset || !isEditingLocation) return null;

  // Fallback function jika prepareEditAssetForMap tidak dikirim sebagai prop
  const safelyPrepareEditAssetForMap = () => {
    if (typeof prepareEditAssetForMap === 'function') {
      return prepareEditAssetForMap();
    }
    
    // Fallback: buat array berisi editing asset dengan lokasi jika ada
    if (editingAsset && editingAsset.lokasi_polygon) {
      try {
        const polygon = typeof editingAsset.lokasi_polygon === 'string' 
          ? JSON.parse(editingAsset.lokasi_polygon) 
          : editingAsset.lokasi_polygon;
        
        return [{
          ...editingAsset,
          lokasi_polygon: polygon,
          isCurrentLocation: true // Flag untuk styling di peta
        }];
      } catch (error) {
        console.error('Error parsing polygon:', error);
        return [];
      }
    }
    
    return [];
  };

  const editAssetData = safelyPrepareEditAssetForMap();

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
        <div className="card-body p-2">
          <div style={{ height: "600px", width: "100%" }}>
            <PetaAsetYardip
              key={`edit-map-${editingAsset.id}-${isEditingLocation}`}
              assets={editAssetData}
              isDrawing={true}
              onDrawingCreated={onDrawingCreated}
              jatengBoundary={jatengBoundary}
              diyBoundary={diyBoundary}
              cityBounds={editCityBounds}
              selectedCity={editSelectedCity && editSelectedProvince ? 
                kotaData[editSelectedProvince]?.find(c => c.id === editSelectedCity)?.name : null
              }
              fitBounds={true}
              editMode={true}
            />
          </div>

          <div className="mt-3 p-2 bg-light rounded">
            <div className="row">
              <div className="col-md-6">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  <strong>Cara edit lokasi:</strong>
                </small>
                <ul className="small text-muted mt-1 mb-0">
                  <li>Polygon hijau adalah lokasi saat ini (jika ada)</li>
                  <li>Gunakan tool drawing untuk membuat polygon baru</li>
                  <li>Polygon baru akan mengganti lokasi yang lama</li>
                  <li>Pilih lokasi target di form untuk auto-zoom peta</li>
                </ul>
              </div>
              <div className="col-md-6">
                <small className="text-muted">
                  <i className="fas fa-map me-1"></i>
                  <strong>Status lokasi:</strong>
                </small>
                <div className="small text-muted mt-1">
                  Current:{" "}
                  {editAssetData.length > 0
                    ? "Ada lokasi"
                    : "Tidak ada"}
                  <br />
                  Target: {editSelectedProvince && editSelectedCity ? 
                    kotaData[editSelectedProvince]?.find(c => c.id === editSelectedCity)?.name : 
                    "Belum dipilih"
                  }
                  <br />
                  {editedLocationData && (
                    <span className="text-success">
                      New: Polygon baru siap (
                      {editedLocationData.area?.toFixed(2)} m²)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Col>
  );
};

export default EditYardipLocation;