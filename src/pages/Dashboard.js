import React, { useState, useEffect, useCallback, useRef } from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./Dashboard.css";

import AsetByKoremChart from "../components/AsetByKoremChart";
import DetailOffcanvasAset from "../components/DetailOffcanvasAset";
import PetaAset from "../components/PetaAset";

const API_URL = "http://localhost:3001";

const Dashboard = () => {
  const [totalAset, setTotalAset] = useState(0);
  const [totalLuas, setTotalLuas] = useState(0);
  const [asetByKodim, setAsetByKodim] = useState([]);
  const [asetList, setAsetList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [selectedAset, setSelectedAset] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // State baru untuk mengontrol tampilan peta
  const [selectedKoremId, setSelectedKoremId] = useState(null);
  const [resetMapTrigger, setResetMapTrigger] = useState(false);

  // Fungsi untuk mengambil dan menggabungkan data dari kedua endpoint
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, yarsipRes] = await Promise.all([
        axios.get(`${API_URL}/assets`),
        axios.get(`${API_URL}/yarsip_assets`),
      ]);

      // Menambahkan properti 'type' dan memastikan struktur data konsisten
      const asetTanah = assetsRes.data.map((asset) => ({
        ...asset,
        type: "tanah",
        nama: asset.nama,
        lokasi: asset.lokasi,
        luas: asset.luas,
      }));

      const asetYardip = yarsipRes.data.map((asset) => ({
        ...asset,
        type: "yardip",
        nama: asset.pengelola,
        lokasi: asset.lokasi,
        luas: asset.area,
      }));

      const combinedAssets = [...asetTanah, ...asetYardip];
      setAsetList(combinedAssets);
      setTotalAset(combinedAssets.length);

      setTotalLuas(
        combinedAssets.reduce((acc, item) => acc + (item.luas || 0), 0)
      );

      const counts = asetTanah.reduce((acc, curr) => {
        const kodim = curr.kodim || "Lainnya";
        acc[kodim] = (acc[kodim] || 0) + 1;
        return acc;
      }, {});
      setAsetByKodim(
        Object.entries(counts)
          .map(([name, jumlah]) => ({ name, jumlah }))
          .sort((a, b) => b.jumlah - a.jumlah)
      );

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching combined data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hapus komentar pada useEffect ini jika Anda ingin data diperbarui secara berkala
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchData();
  //   }, 15000);
  //
  //   return () => clearInterval(interval);
  // }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleAssetClick = (asset) => {
    setSelectedAset(asset);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedAset(null);
  };

  // Fungsi untuk menangani klik pada Korem
  const handleKoremClick = (koremId) => {
    setSelectedKoremId(koremId);
  };

  // Fungsi untuk mereset tampilan peta
  const handleResetMap = () => {
    setSelectedKoremId(null);
    setResetMapTrigger((prev) => !prev);
  };

  return (
    <Container fluid className="dashboard-container p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="dashboard-title">Aset Provinsi Jawa Tengah & DIY</h2>
        <div className="d-flex align-items-center gap-2">
          <small className="text-muted">
            Update: {lastUpdated.toLocaleTimeString()}
          </small>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                Loading...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row>
        <Col md={6} className="mb-4">
          <Card className="summary-card h-100">
            <Card.Body>
              <Card.Title>Jumlah Aset</Card.Title>
              <Card.Text className="display-4">{totalAset}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card className="summary-card h-100">
            <Card.Body>
              <Card.Title>Jumlah Luas Aset (m²)</Card.Title>
              <Card.Text className="display-4">
                {totalLuas.toLocaleString()}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Peta */}
      <Row className="mb-4">
        <Col>
          <Card className="map-card">
            <Card.Body>
              <Card.Title>Peta Sebaran Aset</Card.Title>
              <div
                style={{ height: "500px", width: "100%", position: "relative" }}
              >
                <PetaAset
                  assets={asetList}
                  onAssetClick={handleAssetClick}
                  asetPilihan={selectedAset}
                  // --- PERBAIKAN: Tambahkan props di bawah ini ---
                  onKoremClick={handleKoremClick}
                  selectedKoremId={selectedKoremId}
                  resetMapTrigger={resetMapTrigger}
                />
                <Button
                  variant="secondary"
                  onClick={handleResetMap}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 1000,
                  }}
                >
                  Kembali
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Chart */}
      <Row>
        <Col md={6} className="mb-4">
          <AsetByKoremChart />
        </Col>
        <Col md={6} className="mb-4">
          <Card className="chart-card h-100">
            <Card.Body>
              <Card.Title>Jumlah Aset Tiap Kodim</Card.Title>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={asetByKodim} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickFormatter={(value) => Math.floor(value)}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={180}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value) => Math.floor(value)} />
                  <Bar dataKey="jumlah" fill="#8884d8" name="Jumlah Aset" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Offcanvas Detail */}
      <DetailOffcanvasAset
        show={showDetail}
        handleClose={handleCloseDetail}
        aset={selectedAset}
      />
    </Container>
  );
};

export default Dashboard;
