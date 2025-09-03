import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "leaflet/dist/leaflet.css";
import "./Dashboard.css";

import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";
import AsetByKoremChart from "../components/AsetByKoremChart";
import DetailOffcanvasAset from "../components/DetailOffcanvasAset";
import PetaAset from "../components/PetaAset"; // Import PetaAset

const Dashboard = () => {
  const [totalAset, setTotalAset] = useState(0);
  const [totalLuas, setTotalLuas] = useState(0);
  const [asetByKodim, setAsetByKodim] = useState([]);
  const [asetList, setAsetList] = useState([]);

  const [selectedAset, setSelectedAset] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3001/assets")
      .then((res) => res.json())
      .then((data) => {
        console.log("Data aset dari API:", data);
        setAsetList(data);
        setTotalAset(data.length);
        setTotalLuas(data.reduce((acc, item) => acc + (item.luas || 0), 0));

        const counts = data.reduce((acc, curr) => {
          const kodim = curr.kodim || "Lainnya";
          acc[kodim] = (acc[kodim] || 0) + 1;
          return acc;
        }, {});
        setAsetByKodim(
          Object.entries(counts)
            .map(([name, jumlah]) => ({ name, jumlah }))
            .sort((a, b) => b.jumlah - a.jumlah)
        );
      });
  }, []);

  // Handler for when an asset polygon is clicked on the map
  const handleAssetClick = (asset) => {
    setSelectedAset(asset);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedAset(null);
  };

  return (
    <Container fluid className="dashboard-container p-4">
      <h2 className="dashboard-title mb-4">Aset Provinsi Jawa Tengah & DIY</h2>

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
              <div style={{ height: "500px", width: "100%" }}>
                <PetaAset
                  assets={asetList}
                  jatengBoundary={jatengBoundary}
                  diyBoundary={diyBoundary}
                  onAssetClick={handleAssetClick}
                />
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
