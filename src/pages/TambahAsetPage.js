import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';

import PetaAset from "../components/PetaAset";
import FormAset from "../components/FormAset";
import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";

const API_URL = "http://localhost:3001";

const TambahAsetPage = () => {
  const navigate = useNavigate();
  const [koremList, setKoremList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [newAssetData, setNewAssetData] = useState(null); // { geometry, area }
  const [isFormEnabled, setIsFormEnabled] = useState(false);

  const fetchKorem = useCallback(async () => {
    setLoading(true);
    try {
      const koremRes = await axios.get(`${API_URL}/korem`);
      setKoremList(koremRes.data);
      setError(null);
    } catch (err) {
      setError("Gagal memuat data Korem.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKorem();
  }, [fetchKorem]);

  const handleDrawingCreated = (data) => {
    // data now contains { geometry, area }
    setNewAssetData(data);
    setIsDrawing(false);
    setIsFormEnabled(true);
  };

  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading('Menyimpan data aset...');
    try {
      await axios.post(`${API_URL}/assets`, {
        ...assetData,
        id: `T${Date.now()}`,
        lokasi: newAssetData.geometry,
      });
      toast.success('Aset berhasil ditambahkan!', { id: toastId });
      setTimeout(() => {
        navigate("/data-aset-tanah"); // Redirect after saving
      }, 1500); // Delay for toast to be seen
    } catch (err) {
      toast.error('Gagal menyimpan aset.', { id: toastId });
      console.error("Gagal menyimpan aset", err);
      setError("Gagal menyimpan aset.");
    }
  };

  const handleCancel = () => {
    // Navigate back or reset the state
    if (isFormEnabled) {
      setIsFormEnabled(false);
      setNewAssetData(null);
    } else {
      navigate(-1); // Go back to previous page if nothing has been drawn
    }
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container fluid className="mt-4">
      <h3>Tambah Aset Tanah Baru</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row>
        <Col md={7}>
          <div className="mb-3">
            <Button
              onClick={() => setIsDrawing(!isDrawing)}
              variant={isDrawing ? "danger" : "primary"}
            >
              {isDrawing
                ? "Batalkan Menggambar"
                : " Gambar Lokasi Aset di Peta"}
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
          <h5></h5>
          <FormAset
            onSave={handleSaveAsset}
            onCancel={handleCancel}
            koremList={koremList}
            initialGeometry={newAssetData ? newAssetData.geometry : null}
            initialArea={newAssetData ? newAssetData.area : null}
            isEnabled={isFormEnabled}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default TambahAsetPage;
