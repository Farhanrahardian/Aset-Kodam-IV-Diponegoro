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
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./Dashboard.css";

import jatengBoundary from "../data/indonesia_jawatengah.json";
import diyBoundary from "../data/indonesia_yogyakarta.json";
import AsetByKoremChart from "../components/AsetByKoremChart";

const Dashboard = () => {
  const [totalAset, setTotalAset] = useState(0);
  const [totalLuas, setTotalLuas] = useState(0);
  const [asetByKodim, setAsetByKodim] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/assets")
      .then((res) => res.json())
      .then((data) => {
        setTotalAset(data.length);
        setTotalLuas(data.reduce((acc, item) => acc + item.luas, 0));

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

  const mapCenter = [-7.5, 110.0];
  const mapZoom = 7;

  const styleJateng = {
    color: "#ff7800",
    weight: 2,
    fill: false,
  };

  const styleDIY = {
    color: "#006400",
    weight: 2,
    dashArray: "4",
    fill: false,
  };

  return (
    <Container fluid className="dashboard-container p-4">
      <h2 className="dashboard-title mb-4">Aset Provinsi Jawa Tengah & DIY</h2>

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

      <Row className="mb-4">
        <Col>
          <Card className="map-card">
            <Card.Body>
              <Card.Title>Peta Batas Administrasi</Card.Title>
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "500px", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <GeoJSON data={jatengBoundary} style={styleJateng} />
                <GeoJSON data={diyBoundary} style={styleDIY} />
              </MapContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
    </Container>
  );
};

export default Dashboard;
