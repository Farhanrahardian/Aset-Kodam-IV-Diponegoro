import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Table,
  Button,
  Modal,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

import FormYardip from "../components/FormYardip"; // Updated form import
import PetaAset from "../components/PetaAset";
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

// Table component for Yarsip assets
const TabelAsetYardip = ({ assets, onEdit, onDelete, onViewDetail }) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Tidak ada data aset yarsip yang ditemukan.</p>
      </div>
    );
  }

  return (
    <Table striped bordered hover responsive>
      <thead className="table-dark">
        <tr>
          <th style={{ width: "20%" }}>Pengelola</th>
          <th style={{ width: "15%" }}>Bidang</th>
          <th style={{ width: "25%" }}>Lokasi</th>
          <th style={{ width: "15%" }}>Status</th>
          <th style={{ width: "25%" }}>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.pengelola || "-"}</td>
            <td>
              <span className="badge bg-info">{asset.bidang || "-"}</span>
            </td>
            <td>
              <div>
                <strong>{asset.kabkota || "-"}</strong>
                <br />
                <small className="text-muted">
                  {asset.kecamatan || "-"}, {asset.kelurahan || "-"}
                </small>
              </div>
            </td>
            <td>
              <span 
                className={`badge ${
                  asset.status === 'Aktif' ? 'bg-success' : 
                  asset.status === 'Tidak Aktif' ? 'bg-danger' : 
                  asset.status === 'Cadangan' ? 'bg-warning' :
                  asset.status === 'Dalam Proses' ? 'bg-info' :
                  'bg-secondary'
                }`}
              >
                {asset.status || "-"}
              </span>
            </td>
            <td>
              <div className="d-flex gap-1">
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => onViewDetail(asset)}
                  title="Lihat Detail"
                >
                  Detail
                </Button>
                {onEdit && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => onEdit(asset)}
                    title="Edit Aset"
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(asset.id)}
                    title="Hapus Aset"
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

// Enhanced Modal Detail Component with Map for Yarsip
const DetailModalYardip = ({ asset, show, onHide }) => {
  if (!asset) return null;

  console.log('Yarsip Asset data in modal:', asset);
  console.log('Yarsip Asset lokasi:', asset.lokasi);

  // Validasi dan sanitasi data lokasi untuk Yarsip
  const validateLocationData = (asset) => {
    if (!asset.lokasi) {
      console.log('No lokasi data found');
      return null;
    }
    
    let lokasi = asset.lokasi;
    
    // Jika lokasi adalah string, coba parse JSON
    if (typeof lokasi === 'string') {
      try {
        lokasi = JSON.parse(lokasi);
      } catch (e) {
        console.error('Failed to parse location JSON:', e);
        return null;
      }
    }
    
    // Handle jika lokasi berupa array koordinat langsung (format yarsip)
    if (Array.isArray(lokasi) && lokasi.length > 0) {
      // Check if it's nested array [[coords]]
      if (Array.isArray(lokasi[0])) {
        return lokasi;
      }
    }
    
    // Handle jika lokasi sudah berupa geometry object
    if (lokasi.type === 'Polygon' && lokasi.coordinates) {
      return lokasi.coordinates;
    }
    
    // Handle jika dalam format geometry wrapper
    if (lokasi.coordinates) {
      if (Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
    }
    
    console.warn('Unrecognized location format:', lokasi);
    return null;
  };

  const validatedLocation = validateLocationData(asset);
  const hasValidLocation = validatedLocation !== null;

  // Prepare asset data untuk PetaAset component
  const prepareAssetForMap = (asset) => {
    if (!hasValidLocation) return null;
    
    return {
      id: asset.id || `temp-${Date.now()}`,
      nama: asset.pengelola || 'Unknown', // Map pengelola ke nama
      kodim: asset.bidang || '', // Map bidang ke kodim  
      lokasi: validatedLocation, // Koordinat langsung
      luas: Number(asset.area) || 0, // Map area ke luas
      status: asset.status || '',
      kabkota: asset.kabkota || '',
      kecamatan: asset.kecamatan || '',
      kelurahan: asset.kelurahan || '',
      keterangan: asset.keterangan || '',
      type: 'yarsip' // Mark as yarsip asset
    };
  };

  const assetForMap = prepareAssetForMap(asset);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Detail Aset Yarsip - {asset.pengelola || 'Unknown'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          {/* Detail Informasi */}
          <Col md={6}>
            <div className="card h-100">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Informasi Aset Yarsip</h5>
              </div>
              <div className="card-body">
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <td><strong>ID:</strong></td>
                      <td>{asset.id || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Pengelola:</strong></td>
                      <td>{asset.pengelola || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Bidang:</strong></td>
                      <td>
                        <span className="badge bg-info">{asset.bidang || "-"}</span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Kabupaten/Kota:</strong></td>
                      <td>{asset.kabkota || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Kecamatan:</strong></td>
                      <td>{asset.kecamatan || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Kelurahan/Desa:</strong></td>
                      <td>{asset.kelurahan || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Peruntukan:</strong></td>
                      <td>{asset.peruntukan || "-"}</td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td>
                        <span 
                          className={`badge ${
                            asset.status === 'Aktif' ? 'bg-success' : 
                            asset.status === 'Tidak Aktif' ? 'bg-danger' : 
                            asset.status === 'Cadangan' ? 'bg-warning' :
                            asset.status === 'Dalam Proses' ? 'bg-info' :
                            'bg-secondary'
                          }`}
                        >
                          {asset.status || "-"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Keterangan:</strong></td>
                      <td>{asset.keterangan || "-"}</td>
                    </tr>
                    {asset.area && (
                      <tr>
                        <td><strong>Luas Area:</strong></td>
                        <td>{Number(asset.area).toFixed(2)} m²</td>
                      </tr>
                    )}
                    <tr>
                      <td><strong>Koordinat:</strong></td>
                      <td>
                        {hasValidLocation && validatedLocation ? (
                          <div>
                            <small className="text-muted">
                              Polygon dengan {Array.isArray(validatedLocation) ? validatedLocation[0]?.length || 0 : 0} titik
                            </small>
                            <details className="mt-1">
                              <summary style={{ cursor: 'pointer', fontSize: '0.85em' }}>
                                Lihat koordinat
                              </summary>
                              <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.8em' }}>
                                {Array.isArray(validatedLocation) && validatedLocation[0] ? 
                                  validatedLocation[0].map((coord, idx) => (
                                    <div key={idx}>
                                      {idx + 1}: [{coord[0]?.toFixed(6) || 'N/A'}, {coord[1]?.toFixed(6) || 'N/A'}]
                                    </div>
                                  )) : 
                                  <span className="text-muted">Format koordinat tidak valid</span>
                                }
                              </div>
                            </details>
                          </div>
                        ) : (
                          <span className="text-muted">Tidak tersedia</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Tanggal Dibuat:</strong></td>
                      <td>
                        {asset.created_at 
                          ? (() => {
                              try {
                                const date = new Date(asset.created_at);
                                return isNaN(date.getTime()) ? asset.created_at : date.toLocaleString('id-ID');
                              } catch (e) {
                                return String(asset.created_at);
                              }
                            })()
                          : "-"
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Col>

          {/* Peta dengan polygon/shape yang sudah digambar */}
          <Col md={6}>
            <div className="card h-100">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">Lokasi di Peta</h5>
              </div>
              <div className="card-body p-0">
                <div style={{ height: "500px", width: "100%" }}>
                  {hasValidLocation && assetForMap ? (
                    <PetaAset
                      assets={[assetForMap]}
                      isDrawing={false} // Disable drawing mode untuk detail view
                      onDrawingCreated={() => {}} // Empty handler karena tidak digunakan
                      jatengBoundary={jatengBoundary}
                      diyBoundary={diyBoundary}
                      fitBounds={true} // Auto fit ke lokasi aset
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                      <div className="text-center">
                        <i className="fas fa-map-marker-alt fa-3x mb-3"></i>
                        <p>Lokasi tidak tersedia</p>
                        <small>Belum ada data koordinat untuk aset ini</small>
                        {asset.lokasi && (
                          <div className="mt-2">
                            <small className="text-danger">
                              Data lokasi tidak valid atau rusak
                            </small>
                            <br/>
                            <small className="text-muted">
                              Format: {typeof asset.lokasi}
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Info tambahan tentang lokasi */}
              {hasValidLocation && assetForMap && (
                <div className="card-footer bg-light">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Peta menampilkan area yang telah digambar untuk aset ini
                  </small>
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Additional Information Row */}
        {hasValidLocation && assetForMap && (
          <Row className="mt-3">
            <Col md={12}>
              <div className="card">
                <div className="card-header bg-warning text-dark">
                  <h6 className="mb-0">Informasi Geografis</h6>
                </div>
                <div className="card-body">
                  <Row>
                    <Col md={4}>
                      <strong>Tipe Geometri:</strong><br/>
                      <span className="text-muted">
                        Polygon
                      </span>
                    </Col>
                    <Col md={4}>
                      <strong>Jumlah Koordinat:</strong><br/>
                      <span className="text-muted">
                        {Array.isArray(validatedLocation) && validatedLocation[0] ? 
                          validatedLocation[0].length : 0} titik
                      </span>
                    </Col>
                    <Col md={4}>
                      <strong>Luas Kalkulasi:</strong><br/>
                      <span className="text-muted">
                        {asset.area ? `${Number(asset.area).toFixed(2)} m²` : "Tidak tersedia"}
                      </span>
                    </Col>
                  </Row>
                </div>
              </div>
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

const DataAsetYardipPage = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedBidang, setSelectedBidang] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingAsset, setEditingAsset] = useState(null);
  // State untuk modal detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  
  // State untuk edit mode dengan peta
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedLocationData, setEditedLocationData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch specifically yarsip_assets endpoint
      const res = await axios.get(`${API_URL}/yarsip_assets`);
      setAssets(res.data || []);
      setFilteredAssets(res.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data aset yarsip.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter berdasarkan bidang
  useEffect(() => {
    if (!selectedBidang) {
      setFilteredAssets(assets);
    } else {
      setFilteredAssets(assets.filter((a) => a.bidang === selectedBidang));
    }
  }, [selectedBidang, assets]);

  // Get unique bidang options from assets
  const bidangOptions = [...new Set(assets.map(asset => asset.bidang).filter(Boolean))];

  const handleDeleteAsset = async (id) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const toastId = toast.loading("Menghapus aset...");
        try {
          await axios.delete(`${API_URL}/yarsip_assets/${id}`);
          setAssets(assets.filter((a) => a.id !== id));
          toast.success("Aset berhasil dihapus.", { id: toastId });
        } catch (err) {
          toast.error("Gagal menghapus aset.", { id: toastId });
          console.error(err);
        }
      }
    });
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsEditingLocation(false);
    setEditedLocationData(null);
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setIsEditingLocation(false);
    setEditedLocationData(null);
  };

  // Handler untuk edit lokasi
  const handleEditLocation = () => {
    setIsEditingLocation(true);
  };

  const handleCancelEditLocation = () => {
    setIsEditingLocation(false);
    setEditedLocationData(null);
  };

  const handleLocationDrawingCreated = (data) => {
    setEditedLocationData(data);
    setIsEditingLocation(false);
  };

  const handleSaveAsset = async (updatedData) => {
    if (!editingAsset) return;
    
    // Gabungkan data form dengan data lokasi yang baru jika ada
    const finalData = {
      ...updatedData,
      ...(editedLocationData && {
        lokasi: editedLocationData.geometry || editedLocationData.coordinates,
        area: editedLocationData.area
      })
    };
    
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      const response = await axios.put(
        `${API_URL}/yarsip_assets/${editingAsset.id}`,
        finalData
      );
      setAssets(
        assets.map((a) => (a.id === editingAsset.id ? response.data : a))
      );
      toast.success("Aset berhasil diperbarui!", { id: toastId });
      setEditingAsset(null);
      setIsEditingLocation(false);
      setEditedLocationData(null);
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error(err);
    }
  };

  // Handler untuk tombol detail
  const handleViewDetail = (asset) => {
    console.log('Yarsip Asset data for detail:', asset);
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAssetDetail(null);
  };

  // Prepare current asset for map display during editing
  const prepareEditAssetForMap = () => {
    if (!editingAsset) return [];
    
    const validateLocationData = (asset) => {
      if (!asset.lokasi) return null;
      
      let lokasi = asset.lokasi;
      
      if (typeof lokasi === 'string') {
        try {
          lokasi = JSON.parse(lokasi);
        } catch (e) {
          return null;
        }
      }
      
      // Handle yarsip format - array of coordinates
      if (Array.isArray(lokasi) && lokasi.length > 0) {
        return lokasi;
      }
      
      if (lokasi.type === 'Polygon' && lokasi.coordinates) {
        return lokasi.coordinates;
      }
      
      if (lokasi.coordinates && Array.isArray(lokasi.coordinates)) {
        return lokasi.coordinates;
      }
      
      return null;
    };

    const validatedLocation = validateLocationData(editingAsset);
    if (!validatedLocation) return [];

    return [{
      id: editingAsset.id,
      nama: editingAsset.pengelola || 'Unknown',
      kodim: editingAsset.bidang || '',
      lokasi: validatedLocation,
      luas: Number(editingAsset.area) || 0,
      status: editingAsset.status || '',
      type: 'yarsip'
    }];
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  // Main view
  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Yarsip</h3>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === "development" && (
        <Alert variant="success" className="mb-3">
          <small>
            <strong>Debug Info Yarsip:</strong>
            <br />- Total Assets: {assets.length} items
            <br />- Filtered Assets: {filteredAssets.length} items  
            <br />- Selected Bidang: {selectedBidang || "All"}
            <br />- Available Bidang Options: {bidangOptions.join(', ') || "None"}
            <br />- Editing Asset: {editingAsset?.id || "None"}
            <br />- API Endpoint: {API_URL}/yarsip_assets
            <br />- Asset Type: Yarsip Assets Only
          </small>
        </Alert>
      )}

      <Row>
        <Col md={editingAsset ? 8 : 12}>
          <div className="mb-3">
            <Row>
              <Col md={6}>
                <label>Filter Bidang:</label>
                <select
                  className="form-select"
                  value={selectedBidang}
                  onChange={(e) => setSelectedBidang(e.target.value)}
                >
                  <option value="">-- Semua Bidang --</option>
                  {bidangOptions.map((bidang) => (
                    <option key={bidang} value={bidang}>
                      {bidang}
                    </option>
                  ))}
                </select>
              </Col>
              <Col md={6} className="d-flex align-items-end">
                <div className="text-muted">
                  <small>
                    Menampilkan {filteredAssets.length} dari {assets.length} aset yarsip
                  </small>
                </div>
              </Col>
            </Row>
          </div>

          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {assets.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-muted">
                  <i className="fas fa-folder-open fa-3x mb-3"></i>
                  <h5>Belum Ada Data Aset Yarsip</h5>
                  <p>Silakan tambah aset yarsip baru di halaman Tambah Aset Yarsip.</p>
                </div>
              </div>
            ) : (
              <TabelAsetYardip
                assets={filteredAssets}
                onEdit={user ? handleEditAsset : null}
                onDelete={user ? handleDeleteAsset : null}
                onViewDetail={handleViewDetail}
              />
            )}
          </div>
        </Col>

        {editingAsset && (
          <Col md={4}>
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <span>Edit Aset Yarsip - {editingAsset.pengelola}</span>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleEditLocation}
                  disabled={isEditingLocation}
                >
                  {isEditingLocation ? "Sedang Edit Lokasi..." : "Edit Lokasi"}
                </Button>
              </div>
              <div className="card-body">
                <FormYardip
                  onSave={handleSaveAsset}
                  onCancel={handleCancelEdit}
                  assetToEdit={editingAsset}
                  isEnabled={true}
                  initialGeometry={editedLocationData ? editedLocationData.geometry : null}
                  initialArea={editedLocationData ? editedLocationData.area : null}
                />
                
                {/* Status edit lokasi */}
                {editedLocationData && (
                  <div className="alert alert-info mt-2">
                    <small>
                      <i className="fas fa-map-marked-alt me-1"></i>
                      Lokasi baru telah digambar (Luas: {editedLocationData.area?.toFixed(2)} m²)
                      <br/>
                      <button 
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={handleCancelEditLocation}
                      >
                        Batalkan perubahan lokasi
                      </button>
                    </small>
                  </div>
                )}
              </div>
            </div>
          </Col>
        )}

        {/* Peta Edit - Tampil di bawah ketika sedang edit lokasi */}
        {editingAsset && isEditingLocation && (
          <Col md={12} className="mt-3">
            <div className="card shadow-sm">
              <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0">Edit Lokasi Aset Yarsip - {editingAsset.pengelola}</h6>
                  <small>Gambar ulang polygon untuk lokasi aset ini</small>
                </div>
                <Button
                  variant="outline-dark"
                  size="sm"
                  onClick={handleCancelEditLocation}
                >
                  Selesai Edit Lokasi
                </Button>
              </div>
              <div className="card-body p-2">
                <div style={{ height: "60vh", width: "100%" }}>
                  <PetaAset
                    assets={prepareEditAssetForMap()} // Tampilkan asset yang sedang diedit
                    isDrawing={true} // Enable drawing mode
                    onDrawingCreated={handleLocationDrawingCreated}
                    jatengBoundary={jatengBoundary}
                    diyBoundary={diyBoundary}
                    fitBounds={true} // Auto fit ke lokasi existing
                  />
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Polygon hijau menunjukkan lokasi saat ini. Gambar polygon baru untuk mengubah lokasi.
                  </small>
                </div>
              </div>
            </div>
          </Col>
        )}
      </Row>

      {/* Enhanced Modal Detail Aset with Map */}
      <DetailModalYardip
        asset={selectedAssetDetail}
        show={showDetailModal}
        onHide={handleCloseDetailModal}
      />
    </Container>
  );
};

export default DataAsetYardipPage;