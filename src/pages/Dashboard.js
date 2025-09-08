import React, { useState, useEffect, useCallback } from "react";
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
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";

const API_URL = "http://localhost:3001";

const Dashboard = () => {
  const navigate = useNavigate();
  const [asetTanahData, setAsetTanahData] = useState([]);
  const [asetYardipData, setAsetYardipData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slider images
  const slides = [
    { src: "/uploads/slide1.png", alt: "Slide 1" },
    { src: "/uploads/slide2.png", alt: "Slide 2" },
    { src: "/uploads/slide3.png", alt: "Slide 3" },
  ];

  // Fetch data for charts
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tanahRes, yardipRes] = await Promise.all([
        axios.get(`${API_URL}/assets`),
        axios.get(`${API_URL}/yarsip_assets`),
      ]);

      // Process tanah data by kodim - simple horizontal bar chart
      const tanahByKodim = tanahRes.data.reduce((acc, asset) => {
        const kodim = asset.kodim || "Lainnya";
        if (!acc[kodim]) {
          acc[kodim] = { name: kodim, jumlah: 0 };
        }
        acc[kodim].jumlah += 1;
        return acc;
      }, {});

      setAsetTanahData(
        Object.values(tanahByKodim).sort((a, b) => b.jumlah - a.jumlah)
      );

      // Process yardip data by bidang - simple horizontal bar chart
      const yardipByBidang = yardipRes.data.reduce((acc, asset) => {
        const bidang = asset.bidang || "Lainnya";
        if (!acc[bidang]) {
          acc[bidang] = { name: bidang, jumlah: 0 };
        }
        acc[bidang].jumlah += 1;
        return acc;
      }, {});

      setAsetYardipData(
        Object.values(yardipByBidang).sort((a, b) => b.jumlah - a.jumlah)
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto slide functionality
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // 5 seconds

    return () => clearInterval(slideInterval);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const handleNavigateToTanah = () => {
    navigate("/data-aset-tanah");
  };

  const handleNavigateToYardip = () => {
    navigate("/data-aset-yardip");
  };

  const totalAsetTanah = asetTanahData.reduce(
    (sum, item) => sum + item.jumlah,
    0
  );
  const totalAsetYardip = asetYardipData.reduce(
    (sum, item) => sum + item.jumlah,
    0
  );

  return (
    <Container fluid className="dashboard-container p-4">
      {/* Hero Slider - No arrows, only dots */}
      <Row className="mb-4">
        <Col>
          <div className="hero-slider">
            <div className="slider-container">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`slide ${index === currentSlide ? "active" : ""}`}
                >
                  <img src={slide.src} alt={slide.alt} />
                  <div className="slide-overlay">
                    {/* <h3>Sistem Informasi Aset</h3>
                    <p>Provinsi Jawa Tengah & DIY</p> */}
                  </div>
                </div>
              ))}

              {/* Only Dots Indicator - No Arrows */}
              <div className="slider-dots">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === currentSlide ? "active" : ""}`}
                    onClick={() => goToSlide(index)}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Summary Cards - Removed for simplicity */}

      {/* Chart Section - Multiple bars like SIMANTAB */}
      <Row>
        <Col md={6} className="mb-4">
          <Card className="chart-card h-100 border-0 shadow-sm">
            <Card.Header className="bg-primary text-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Data Aset Tanah KODAM</h5>
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleNavigateToTanah}
              >
                Lihat Detail
              </Button>
            </Card.Header>
            <Card.Body>
              {/* Legend */}
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-3 justify-content-center">
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#4285f4",
                        width: "20px",
                        height: "15px",
                      }}
                    ></div>
                    <small>
                      Sudah (
                      {asetTanahData.reduce(
                        (sum, item) => sum + (item.sudah || 0),
                        0
                      )}
                      )
                    </small>
                  </div>
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#ea4335",
                        width: "20px",
                        height: "15px",
                      }}
                    ></div>
                    <small>
                      Belum (
                      {asetTanahData.reduce(
                        (sum, item) => sum + (item.belum || 0),
                        0
                      )}
                      )
                    </small>
                  </div>
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#34a853",
                        width: "20px",
                        height: "15px",
                      }}
                    ></div>
                    <small>
                      Total (
                      {asetTanahData.reduce(
                        (sum, item) => sum + (item.total || 0),
                        0
                      )}
                      )
                    </small>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={asetTanahData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#666" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#666" }}
                    axisLine={{ stroke: "#ddd" }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value}`,
                      name === "sudah"
                        ? "Sudah Sertifikat"
                        : name === "belum"
                        ? "Belum Sertifikat"
                        : "Total",
                    ]}
                    labelStyle={{ color: "#333", fontWeight: "bold" }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="sudah" fill="#4285f4" name="sudah" />
                  <Bar dataKey="belum" fill="#ea4335" name="belum" />
                  <Bar dataKey="total" fill="#34a853" name="total" />
                </BarChart>
              </ResponsiveContainer>

              <div className="text-center mt-3">
                <Button
                  variant="primary"
                  onClick={handleNavigateToTanah}
                  className="btn-chart-action"
                >
                  Lihat Semua Data Aset Tanah
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="chart-card h-100 border-0 shadow-sm">
            <Card.Header className="bg-success text-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Data Aset Yardip KODAM</h5>
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleNavigateToYardip}
              >
                Lihat Detail
              </Button>
            </Card.Header>
            <Card.Body>
              {/* Legend */}
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-3 justify-content-center">
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#34a853",
                        width: "20px",
                        height: "15px",
                      }}
                    ></div>
                    <small>
                      Aktif (
                      {asetYardipData.reduce(
                        (sum, item) => sum + (item.aman || 0),
                        0
                      )}
                      )
                    </small>
                  </div>
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#fbbc04",
                        width: "20px",
                        height: "15px",
                      }}
                    ></div>
                    <small>
                      Cadangan (
                      {asetYardipData.reduce(
                        (sum, item) => sum + (item.proses || 0),
                        0
                      )}
                      )
                    </small>
                  </div>
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#ea4335",
                        width: "20px",
                        height: "15px",
                      }}
                    ></div>
                    <small>
                      Tidak Aktif (
                      {asetYardipData.reduce(
                        (sum, item) => sum + (item.masalah || 0),
                        0
                      )}
                      )
                    </small>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={asetYardipData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#666" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#666" }}
                    axisLine={{ stroke: "#ddd" }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value}`,
                      name === "aman"
                        ? "Aman"
                        : name === "proses"
                        ? "Proses"
                        : "Masalah",
                    ]}
                    labelStyle={{ color: "#333", fontWeight: "bold" }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="aman" fill="#34a853" name="aman" />
                  <Bar dataKey="proses" fill="#fbbc04" name="proses" />
                  <Bar dataKey="masalah" fill="#ea4335" name="masalah" />
                </BarChart>
              </ResponsiveContainer>

              <div className="text-center mt-3">
                <Button
                  variant="success"
                  onClick={handleNavigateToYardip}
                  className="btn-chart-action"
                >
                  Lihat Semua Data Aset Yardip
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
