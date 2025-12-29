import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Table,
  Button,
  Modal,
  Card,
  Form,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import PetaAsetYardip from "../components/PetaAsetYardip";
import MapErrorBoundary from "../components/MapErrorBoundary";
import EditYardipModal from "../components/EditYardipModal";
import DetailOffcanvasYardip from "../components/DetailOffcanvasYardip";
import DetailYardipModal from "../components/DetailYardipModal"; // Import the new detail modal

const API_URL = "http://localhost:3001";

// FilterPanelTop component remains the same
const FilterPanelTop = ({
  provinsiOptions,
  kotaOptions,
  selectedProvinsi,
  selectedKota,
  onSelectProvinsi,
  onSelectKota,
  onShowAll,
  totalAssets,
  filteredAssetsCount,
}) => {
  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Filter Data Aset Yardip</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Provinsi</Form.Label>
              <Form.Select
                value={selectedProvinsi}
                onChange={(e) => onSelectProvinsi(e.target.value)}
              >
                <option value="">Semua Provinsi</option>
                {provinsiOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Kota/Kabupaten</Form.Label>
              <Form.Select
                value={selectedKota}
                onChange={(e) => onSelectKota(e.target.value)}
                disabled={!selectedProvinsi}
              >
                <option value="">
                  {selectedProvinsi
                    ? "Semua Kota/Kabupaten"
                    : "Pilih Provinsi Dulu"}
                </option>
                {kotaOptions.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex align-items-end">
            <Button
              variant="outline-secondary"
              onClick={onShowAll}
              className="w-100 mb-3"
            >
              Reset Filter & Peta
            </Button>
          </Col>
        </Row>
        <Row>
          <Col>
            <div className="bg-light p-2 rounded">
              <small className="text-muted">
                <strong>Menampilkan:</strong> {filteredAssetsCount} dari{" "}
                {totalAssets} aset yardip
              </small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// TabelAsetYardip component remains mostly the same
const TabelAsetYardip = ({
  assets,
  onEdit,
  onDelete,
  onViewDetail,
  userRole,
}) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">
          Tidak ada data aset yardip yang cocok dengan filter Anda.
        </p>
      </div>
    );
  }
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Dimiliki/Dikuasai":
        return "bg-success";
      case "Tidak Dimiliki/Tidak Dikuasai":
        return "bg-danger";
      default:
        return "bg-info";
    }
  };
  const getBidangBadgeClass = (bidang) => {
    switch (bidang?.toLowerCase()) {
      case "tanah":
        return "bg-warning"; // kuning
      case "tanah gudang kantor":
        return "bg-primary"; // biru tua
      case "tanah bangunan":
        return "bg-info"; // biru muda
      case "ruko":
        return "bg-success"; // hijau
      default:
        return "bg-secondary";
    }
  };

  return (
    <Table striped bordered hover responsive style={{ minWidth: "1200px" }}>
      <thead className="table-dark">
        <tr>
          <th>Pengelola</th>
          <th>Bidang</th>
          <th>Provinsi</th>
          <th>Kota/Kab.</th>
          <th>Status</th>
          <th>Luas</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id}>
            <td>{asset.pengelola || "-"}</td>
            <td>
              <span className={`badge ${getBidangBadgeClass(asset.bidang)}`}>
                {asset.bidang || "-"}
              </span>
            </td>
            <td>{asset.provinsi || "-"}</td>
            <td>{asset.kabkota || "-"}</td>
            <td>
              <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                {asset.status || "-"}
              </span>
            </td>
            <td>
              {asset.area
                ? `${Number(asset.area).toLocaleString("id-ID")} m²`
                : "-"}
            </td>
            <td>
              <Button
                variant="info"
                size="sm"
                onClick={() => onViewDetail(asset)}
                className="me-1"
              >
                Detail
              </Button>
              {userRole === "admin" && onEdit && (
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => onEdit(asset)}
                  className="me-1"
                >
                  Edit
                </Button>
              )}
              {userRole === "admin" && onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(asset.id)}
                >
                  Hapus
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const DataAsetYardipPage = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [provinsiData, setProvinsiData] = useState(null);
  const [kabupatenData, setKabupatenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk filter dan view peta
  const [view, setView] = useState({ provinsi: "", kabupaten: "" });

  // State untuk modal dan offcanvas
  const [editingAsset, setEditingAsset] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assetForOffcanvas, setAssetForOffcanvas] = useState(null);
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, provRes, kabRes] = await Promise.all([
        axios.get(`${API_URL}/yardip_assets`),
        axios.get("/data/provinsi.geojson"),
        axios.get("/data/kabupaten_kota.geojson"),
      ]);
      setAssets(res.data || []);
      setProvinsiData(provRes.data);
      setKabupatenData(kabRes.data);
    } catch (err) {
      setError("Gagal memuat data aset yardip.");
      toast.error("Gagal memuat data aset yardip.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Opsi untuk Filter ---
  const provinsiOptions = useMemo(
    () => [
      { value: "Jawa Tengah", label: "Jawa Tengah" },
      {
        value: "Daerah Istimewa Yogyakarta",
        label: "Daerah Istimewa Yogyakarta",
      },
    ],
    []
  );

  const kotaOptions = useMemo(() => {
    if (!view.provinsi || !kabupatenData) return [];
    const kotaInProvinsi = kabupatenData.features
      .filter((f) => f.properties.PROVINCE === view.provinsi)
      .map((f) => f.properties.Kabupaten);
    const uniqueKota = new Set(kotaInProvinsi);
    return Array.from(uniqueKota)
      .map((k) => ({ value: k, label: k }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [kabupatenData, view.provinsi]);

  // --- Logika Filtering untuk Tabel ---
  const filteredTableAssets = useMemo(() => {
    return assets.filter((asset) => {
      const provMatch = !view.provinsi || asset.provinsi === view.provinsi;
      const kabMatch = !view.kabupaten || asset.kabkota === view.kabupaten;
      return provMatch && kabMatch;
    });
  }, [assets, view]);

  // --- Handlers ---
  const handleSelectProvinsi = (prov) => {
    setView({ provinsi: prov, kabupaten: "" });
  };

  const handleSelectKota = (kab) => {
    setView((prev) => ({ ...prev, kabupaten: kab }));
  };

  const handleShowAll = () => {
    setView({ provinsi: "", kabupaten: "" });
  };

  const handleMapViewChange = (newView) => {
    setView({
      provinsi: newView.provinsi || "",
      kabupaten: newView.kabupaten || "",
    });
  };

  const handleViewDetail = useCallback((asset) => {
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  }, []);

  const handleMarkerClick = useCallback((asset) => {
    setAssetForOffcanvas(asset);
    setShowOffcanvas(true);
  }, []);

  const handleDeleteAsset = async (id) => {
    const assetToDelete = assets.find((a) => String(a.id) === String(id));
    if (!assetToDelete) return;

    const result = await Swal.fire({
      title: "Hapus Aset Yardip?",
      html: `Yakin ingin menghapus: <strong>"${assetToDelete.pengelola}"</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus!",
    });

    if (result.isConfirmed) {
      const toastId = toast.loading("Menghapus aset...");
      try {
        await axios.delete(`${API_URL}/yardip_assets/${id}`);
        toast.success("Aset berhasil dihapus!", { id: toastId });
        fetchData(); // Refresh data
      } catch (err) {
        toast.error("Gagal menghapus aset.", { id: toastId });
      }
    }
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setShowEditModal(true);
  };

  const handleSaveYardip = async (formData) => {
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      await axios.put(`${API_URL}/yardip_assets/${formData.id}`, formData);
      toast.success("Aset Yardip berhasil diperbarui!", { id: toastId });
      // setShowEditModal(false);  // <-- COMMENT ATAU HAPUS BARIS INI
      // setEditingAsset(null);    // <-- COMMENT ATAU HAPUS BARIS INI

      // Refresh data aset yang sedang di-edit agar modal menampilkan data terbaru
      const refreshedAsset = await axios.get(
        `${API_URL}/yardip_assets/${formData.id}`
      );
      setEditingAsset(refreshedAsset.data);

      fetchData(); // Refresh semua data di background
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error("Error updating yardip asset:", err);
    }
  };
  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset Yardip</h3>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header as="h5">Peta Aset Yardip Interaktif</Card.Header>
            <Card.Body style={{ height: "55vh", padding: 0 }}>
              <MapErrorBoundary height="55vh">
                <PetaAsetYardip
                  provinsiData={provinsiData}
                  kabupatenData={kabupatenData}
                  assets={filteredTableAssets} // Pass filtered assets
                  onAssetClick={handleMarkerClick} // Open offcanvas on marker click
                  filter={view} // Pass current view as filter
                  onViewChange={handleMapViewChange} // Handle view changes from map
                />
              </MapErrorBoundary>
            </Card.Body>
          </Card>

          <FilterPanelTop
            provinsiOptions={provinsiOptions}
            kotaOptions={kotaOptions}
            selectedProvinsi={view.provinsi}
            selectedKota={view.kabupaten}
            onSelectProvinsi={handleSelectProvinsi}
            onSelectKota={handleSelectKota}
            onShowAll={handleShowAll}
            totalAssets={assets.length}
            filteredAssetsCount={filteredTableAssets.length}
          />

          <Card>
            <Card.Header>
              <h5 className="mb-0">Daftar Aset Yardip</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <TabelAsetYardip
                assets={filteredTableAssets}
                onEdit={user ? handleEditAsset : null}
                onDelete={user ? handleDeleteAsset : null}
                onViewDetail={handleViewDetail} // Open modal on table button click
                userRole={user?.role}
              />
            </Card.Body>
          </Card>

          {filteredTableAssets.length > 0 && (
            <Card className="mt-3">
              <Card.Body>
                <Row className="text-center">
                  <Col md={4}>
                    <div className="border-end">
                      <h5 className="text-primary">
                        {filteredTableAssets.length}
                      </h5>
                      <small className="text-muted">Total Aset</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="border-end">
                      <h5 className="text-success">
                        {
                          filteredTableAssets.filter(
                            (a) => a.status === "Dimiliki/Dikuasai"
                          ).length
                        }
                      </h5>
                      <small className="text-muted">Dimiliki/Dikuasai</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <h5 className="text-danger">
                      {
                        filteredTableAssets.filter(
                          (a) => a.status === "Tidak Dimiliki/Tidak Dikuasai"
                        ).length
                      }
                    </h5>
                    <small className="text-muted">
                      Tidak Dimiliki/Tidak Dikuasai
                    </small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <DetailOffcanvasYardip
        show={showOffcanvas}
        handleClose={() => setShowOffcanvas(false)}
        asetYardip={assetForOffcanvas}
      />

      {showDetailModal && (
        <DetailYardipModal
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          asset={selectedAssetDetail}
        />
      )}

      {showEditModal && (
        <EditYardipModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          asset={editingAsset}
          onSave={handleSaveYardip}
          provinsiData={provinsiData}
          kabupatenData={kabupatenData}
        />
      )}
    </Container>
  );
};

export default DataAsetYardipPage;
