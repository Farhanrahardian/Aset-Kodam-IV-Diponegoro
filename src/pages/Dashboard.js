import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Button, Form } from "react-bootstrap";
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
  const [koremList, setKoremList] = useState([]);
  const [selectedKorem, setSelectedKorem] = useState(""); // Filter state
  const [rawAssetsData, setRawAssetsData] = useState([]); // Store raw data for filtering
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slider images
  const slides = [
    { src: "/uploads/slide1.png", alt: "Slide 1" },
    { src: "/uploads/slide2.png", alt: "Slide 2" },
    { src: "/uploads/slide3.png", alt: "Slide 3" },
  ];

  // Process data by Korem (default view)
  const processDataByKorem = useCallback((assetsData, koremData) => {
    const koremStats = {};

    // Initialize korem stats
    koremData.forEach((korem) => {
      koremStats[korem.id] = {
        id: korem.id,
        name: korem.nama,
        bersertifikat: 0,
        tidakBersertifikat: 0,
        total: 0,
        kodimList: korem.kodim || [],
      };
    });

    // Count assets by korem
    assetsData.forEach((asset) => {
      const koremId = asset.korem_id;
      if (koremStats[koremId]) {
        const hasSertifikat = asset.pemilikan_sertifikat === "Ya";

        if (hasSertifikat) {
          koremStats[koremId].bersertifikat += 1;
        } else {
          koremStats[koremId].tidakBersertifikat += 1;
        }

        koremStats[koremId].total += 1;
      }
    });

    return Object.values(koremStats)
      .filter((korem) => korem.total > 0)
      .sort((a, b) => b.total - a.total);
  }, []);

  // Process data by Kodim (filtered view)
  const processDataByKodim = useCallback(
    (assetsData, koremData, selectedKoremId) => {
      const selectedKoremData = koremData.find(
        (k) => k.id.toString() === selectedKoremId.toString()
      );

      if (!selectedKoremData) return [];

      const kodimStats = {};

      // Initialize kodim stats for selected korem
      selectedKoremData.kodim.forEach((kodimName) => {
        kodimStats[kodimName] = {
          name: kodimName,
          korem: selectedKoremData.nama,
          bersertifikat: 0,
          tidakBersertifikat: 0,
          total: 0,
        };
      });

      // Count assets by kodim for selected korem
      assetsData
        .filter(
          (asset) => asset.korem_id.toString() === selectedKoremId.toString()
        )
        .forEach((asset) => {
          const kodimName = asset.kodim;
          if (kodimStats[kodimName]) {
            const hasSertifikat = asset.pemilikan_sertifikat === "Ya";

            if (hasSertifikat) {
              kodimStats[kodimName].bersertifikat += 1;
            } else {
              kodimStats[kodimName].tidakBersertifikat += 1;
            }

            kodimStats[kodimName].total += 1;
          }
        });

      return Object.values(kodimStats)
        .filter((kodim) => kodim.total > 0)
        .sort((a, b) => b.total - a.total);
    },
    []
  );

  // Fetch data for charts
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tanahRes, yardipRes, koremRes] = await Promise.all([
        axios.get(`${API_URL}/assets`),
        axios.get(`${API_URL}/yardip_assets`),
        axios.get(`${API_URL}/korem`),
      ]);

      const assetsData = tanahRes.data;
      const koremData = koremRes.data;

      setRawAssetsData(assetsData);
      setKoremList(koremData);

      // Default view: by Korem
      const tanahByKorem = processDataByKorem(assetsData, koremData);
      setAsetTanahData(tanahByKorem);

      // Process yardip data by bidang - keep existing logic
      const yardipByBidang = yardipRes.data.reduce((acc, asset) => {
        const bidang = asset.bidang || "Lainnya";
        if (!acc[bidang]) {
          acc[bidang] = {
            name: bidang,
            aktif: 0,
            cadangan: 0,
            tidakAktif: 0,
            total: 0,
          };
        }

        const status = asset.status || "";
        if (status === "Aktif") {
          acc[bidang].aktif += 1;
        } else if (status === "Cadangan" || status === "Dalam Proses") {
          acc[bidang].cadangan += 1;
        } else if (status === "Tidak Aktif" || status === "Sengketa") {
          acc[bidang].tidakAktif += 1;
        }

        acc[bidang].total += 1;
        return acc;
      }, {});

      const sortedYardipData = Object.values(yardipByBidang)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setAsetYardipData(sortedYardipData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [processDataByKorem]);

  // Handle filter change
  const handleKoremFilterChange = useCallback(
    (koremId) => {
      setSelectedKorem(koremId);

      if (koremId) {
        // Show kodim data for selected korem
        const kodimData = processDataByKodim(rawAssetsData, koremList, koremId);
        setAsetTanahData(kodimData);
      } else {
        // Show korem data (default)
        const koremData = processDataByKorem(rawAssetsData, koremList);
        setAsetTanahData(koremData);
      }
    },
    [rawAssetsData, koremList, processDataByKorem, processDataByKodim]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto slide functionality
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

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

  // Calculate totals for tanah
  const totalBersertifikat = asetTanahData.reduce(
    (sum, item) => sum + item.bersertifikat,
    0
  );
  const totalTidakBersertifikat = asetTanahData.reduce(
    (sum, item) => sum + item.tidakBersertifikat,
    0
  );
  const totalAsetTanah = asetTanahData.reduce(
    (sum, item) => sum + item.total,
    0
  );

  // Calculate grand totals (all data, not filtered)
  const grandTotalBersertifikat = rawAssetsData.filter(
    (asset) => asset.pemilikan_sertifikat === "Ya"
  ).length;
  const grandTotalTidakBersertifikat = rawAssetsData.filter(
    (asset) => asset.pemilikan_sertifikat !== "Ya"
  ).length;
  const grandTotalAsetTanah = rawAssetsData.length;

  // Calculate totals for yardip
  const totalAktif = asetYardipData.reduce((sum, item) => sum + item.aktif, 0);
  const totalCadangan = asetYardipData.reduce(
    (sum, item) => sum + item.cadangan,
    0
  );
  const totalTidakAktif = asetYardipData.reduce(
    (sum, item) => sum + item.tidakAktif,
    0
  );
  const totalAsetYardip = asetYardipData.reduce(
    (sum, item) => sum + item.total,
    0
  );

  const selectedKoremName = selectedKorem
    ? koremList.find((k) => k.id.toString() === selectedKorem.toString())
        ?.nama || "Unknown"
    : null;

  return (
    <Container fluid className="dashboard-container p-4">
      {/* Hero Slider */}
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
                  <div className="slide-overlay"></div>
                </div>
              ))}

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

      {/* Summary Cards - Always show grand totals */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-center">
                <div className="me-3">
                  <i className="fas fa-map-marked-alt fa-2x text-primary"></i>
                </div>
                <div>
                  <h4 className="mb-0 text-primary">{grandTotalAsetTanah}</h4>
                  <small className="text-muted">Total Aset Tanah</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-center">
                <div className="me-3">
                  <i className="fas fa-certificate fa-2x text-success"></i>
                </div>
                <div>
                  <h4 className="mb-0 text-success">
                    {grandTotalBersertifikat}
                  </h4>
                  <small className="text-muted">Bersertifikat</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-center">
                <div className="me-3">
                  <i className="fas fa-exclamation-triangle fa-2x text-warning"></i>
                </div>
                <div>
                  <h4 className="mb-0 text-warning">
                    {grandTotalTidakBersertifikat}
                  </h4>
                  <small className="text-muted">Tidak Bersertifikat</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-center">
                <div className="me-3">
                  <i className="fas fa-building fa-2x text-info"></i>
                </div>
                <div>
                  <h4 className="mb-0 text-info">{totalAsetYardip}</h4>
                  <small className="text-muted">Total Aset Yardip</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Chart Section */}
      <Row>
        <Col md={6} className="mb-4">
          <Card className="chart-card h-100 border-0 shadow-sm">
            <Card.Header className="bg-primary text-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">
                    Data Aset Tanah KODAM
                    {selectedKoremName && (
                      <span className="badge bg-light text-primary ms-2">
                        {selectedKoremName}
                      </span>
                    )}
                  </h5>
                  {/* <small className="opacity-75">
                    {selectedKorem ? "Per Kodim" : "Per Korem"}
                  </small> */}
                </div>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleNavigateToTanah}
                >
                  Lihat Detail
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {/* Filter Section */}
              <div className="mb-3 p-3 bg-light rounded">
                <Row className="align-items-center">
                  <Col md={6}>
                    <Form.Label className="mb-1 fw-bold">
                      Filter by Korem:
                    </Form.Label>
                    <Form.Select
                      size="sm"
                      value={selectedKorem}
                      onChange={(e) => handleKoremFilterChange(e.target.value)}
                    >
                      <option value="">
                        Semua Korem (Tampilkan per Korem)
                      </option>
                      {koremList.map((korem) => (
                        <option key={korem.id} value={korem.id}>
                          {korem.nama} (Tampilkan per Kodim)
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={6}>
                    <div className="text-end">
                      <small className="text-muted">
                        Menampilkan: <strong>{asetTanahData.length}</strong>{" "}
                        {selectedKorem ? "Kodim" : "Korem"}
                      </small>
                      {selectedKorem && (
                        <div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="mt-1"
                            onClick={() => handleKoremFilterChange("")}
                          >
                            Reset
                          </Button>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

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
                    <small>Bersertifikat ({totalBersertifikat})</small>
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
                      Tidak Bersertifikat ({totalTidakBersertifikat})
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
                    <small>Total ({totalAsetTanah})</small>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={asetTanahData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: "#666" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#666" }}
                    axisLine={{ stroke: "#ddd" }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} aset`,
                      name === "bersertifikat"
                        ? "Bersertifikat"
                        : name === "tidakBersertifikat"
                        ? "Tidak Bersertifikat"
                        : "Total",
                    ]}
                    labelFormatter={(label) => {
                      if (selectedKorem) {
                        return `Kodim ${label}`;
                      } else {
                        return `Korem ${label}`;
                      }
                    }}
                    labelStyle={{ color: "#333", fontWeight: "bold" }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="bersertifikat"
                    fill="#4285f4"
                    name="bersertifikat"
                  />
                  <Bar
                    dataKey="tidakBersertifikat"
                    fill="#ea4335"
                    name="tidakBersertifikat"
                  />
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
              <h5 className="mb-0">Data Aset Yardip KODAM </h5>
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
                    <small>Aktif ({totalAktif})</small>
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
                    <small>Cadangan ({totalCadangan})</small>
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
                    <small>Tidak Aktif ({totalTidakAktif})</small>
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
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#666" }}
                    axisLine={{ stroke: "#ddd" }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} aset`,
                      name === "aktif"
                        ? "Aktif"
                        : name === "cadangan"
                        ? "Cadangan"
                        : "Tidak Aktif",
                    ]}
                    labelStyle={{ color: "#333", fontWeight: "bold" }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="aktif" fill="#34a853" name="aktif" />
                  <Bar dataKey="cadangan" fill="#fbbc04" name="cadangan" />
                  <Bar dataKey="tidakAktif" fill="#ea4335" name="tidakAktif" />
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

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Memuat data...</p>
        </div>
      )}
    </Container>
  );
};

export default Dashboard;
