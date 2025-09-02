import React, { useState } from "react";
import { Container, Row, Col, Button, Alert } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PetaAset from "../components/PetaAset";
import FormYardip from "../components/FormYardip"; // Import FormYardip untuk yarsip
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

const TambahAsetYarsipPage = () => {
  const navigate = useNavigate();
  const [isDrawing, setIsDrawing] = useState(false);
  const [newAssetData, setNewAssetData] = useState(null); // { geometry, area }
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [error, setError] = useState(null);

  const handleDrawingCreated = (data) => {
    setNewAssetData(data);
    setIsDrawing(false);
    setIsFormEnabled(true);
  };

  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading("Menyimpan data aset yarsip...");
    try {
      // PENTING: Menggunakan endpoint yarsip_assets untuk penyimpanan yarsip
      await axios.post(`${API_URL}/yarsip_assets`, {
        ...assetData,
        id: `Y${Date.now()}`, // Prefix Y untuk Yarsip
        lokasi: newAssetData.geometry,
        area: newAssetData.area,
        type: 'yarsip', // Identifier type
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      toast.success("Aset Yarsip berhasil ditambahkan!", { id: toastId });
      setTimeout(() => {
        navigate("/data-aset-yarsip"); // Redirect ke halaman list yarsip
      }, 1500);
    } catch (err) {
      toast.error("Gagal menyimpan aset yarsip.", { id: toastId });
      console.error("Gagal menyimpan aset yarsip", err);
      setError("Gagal menyimpan aset yarsip.");
    }
  };

  const handleCancel = () => {
    if (isFormEnabled) {
      setIsFormEnabled(false);
      setNewAssetData(null);
    } else {
      navigate(-1);
    }
  };

  return (
    <Container fluid className="mt-4">
      <h3>Tambah Aset Yarsip Baru</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Debug info untuk development */}
      {process.env.NODE_ENV === "development" && (
        <Alert variant="info" className="mb-3">
          <small>
            <strong>Storage Info:</strong>
            <br />- Collection: yarsip_assets
            <br />- Endpoint: POST /yarsip_assets
            <br />- ID Prefix: Y (Yarsip)
            <br />- Form Component: FormYardip
          </small>
        </Alert>
      )}

      <Row>
        <Col md={7}>
          <div className="mb-3">
            <Button
              onClick={() => setIsDrawing(!isDrawing)}
              variant={isDrawing ? "danger" : "primary"}
            >
              {isDrawing ? "Batalkan Menggambar" : "📍 Gambar Lokasi Aset di Peta"}
            </Button>
          </div>
          <div style={{ height: "70vh", width: "100%" }}>
            <PetaAset
              assets={[]}
              isDrawing={isDrawing}
              onDrawingCreated={handleDrawingCreated}
              jatengBoundary={jatengBoundary}
              diyBoundary={diyBoundary}
            />
          </div>
        </Col>
        <Col md={5}>
          <FormYardip
            onSave={handleSaveAsset}
            onCancel={handleCancel}
            initialGeometry={newAssetData ? newAssetData.geometry : null}
            initialArea={newAssetData ? newAssetData.area : null}
            isEnabled={isFormEnabled}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetYarsipPage;