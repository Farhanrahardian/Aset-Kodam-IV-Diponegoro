import React, { useState, useEffect, useCallback, useMemo } from "react";
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

  // ========== STATE MANAGEMENT ==========
  // Raw data states
  const [rawAssetsData, setRawAssetsData] = useState([]);
  const [rawYardipData, setRawYardipData] = useState([]);
  const [koremList, setKoremList] = useState([]);
  const [cityList, setCityList] = useState([]);

  // Filter states
  const [selectedKorem, setSelectedKorem] = useState("");
  const [selectedKodim, setSelectedKodim] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slider images
  const slides = [
    { src: "/uploads/slide1.png", alt: "Slide 1" },
    { src: "/uploads/slide2.png", alt: "Slide 2" },
    { src: "/uploads/slide3.png", alt: "Slide 3" },
  ];

  // ========== HELPER FUNCTIONS (MEMOIZED) ==========
  const categorizeYardipAsset = useCallback((asset) => {
    const bidang = (asset.bidang || "").toLowerCase().trim();
    switch (bidang) {
      case "tanah":
        return "tanah";
      case "tanah bangunan":
        return "tanahBangunan";
      case "tanah gudang kantor":
        return "tanahGudangKantor";
      case "ruko":
        return "ruko";
      default:
        const peruntukan = (asset.peruntukan || "").toLowerCase().trim();
        if (peruntukan.includes("ruko") || peruntukan.includes("toko"))
          return "ruko";
        if (peruntukan.includes("gudang") || peruntukan.includes("kantor"))
          return "tanahGudangKantor";
        if (peruntukan.includes("bangunan")) return "tanahBangunan";
        return "tanah";
    }
  }, []);

  const determineProvince = useCallback((asset) => {
    const prov = (asset.provinsi || "").toLowerCase();
    if (prov.includes("jawa tengah")) return "Jawa Tengah";
    if (prov.includes("yogyakarta")) return "Daerah Istimewa Yogyakarta";
    return null;
  }, []);

  const isConservationArea = useCallback((kabupatenName) => {
    return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
  }, []);

  // ========== STATIC OPTIONS ==========
  const provinsiOptions = useMemo(
    () => [
      { value: "Jawa Tengah", label: "Jawa Tengah" },
      { value: "Daerah Istimewa Yogyakarta", label: "DI Yogyakarta" },
    ],
    []
  );

  // ========== STATIC CITY LIST (LIGHTWEIGHT - HARDCODED) ==========
  const allCitiesData = useMemo(
    () => ({
      "Jawa Tengah": [
        "Banjarnegara",
        "Banyumas",
        "Batang",
        "Blora",
        "Boyolali",
        "Brebes",
        "Cilacap",
        "Demak",
        "Grobogan",
        "Jepara",
        "Karanganyar",
        "Kebumen",
        "Kendal",
        "Klaten",
        "Kota Magelang",
        "Kota Pekalongan",
        "Kota Salatiga",
        "Kota Semarang",
        "Kota Surakarta",
        "Kota Tegal",
        "Kudus",
        "Magelang",
        "Pati",
        "Pekalongan",
        "Pemalang",
        "Purbalingga",
        "Purworejo",
        "Rembang",
        "Semarang",
        "Sragen",
        "Sukoharjo",
        "Tegal",
        "Temanggung",
        "Wonogiri",
        "Wonosobo",
      ],
      "Daerah Istimewa Yogyakarta": [
        "Bantul",
        "Gunungkidul",
        "Kota Yogyakarta",
        "Kulon Progo",
        "Sleman",
      ],
    }),
    []
  );

  // ========== FETCH DATA (OPTIMIZED - NO GEOJSON) ==========
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tanahRes, yardipRes, koremRes] = await Promise.all([
        axios.get(`${API_URL}/assets`),
        axios.get(`${API_URL}/yardip_assets`),
        axios.get(`${API_URL}/korem`),
      ]);

      const assetsData = tanahRes.data;
      const yardipData = yardipRes.data;
      const koremData = koremRes.data;

      setRawAssetsData(assetsData);
      setRawYardipData(yardipData);
      setKoremList(koremData);

      // Build complete city list dari static data + yardip data
      const citiesFromData = new Set();
      yardipData.forEach((asset) => {
        const city = asset.kabkota;
        const province = (asset.provinsi || "").toLowerCase();
        if (city && !isConservationArea(city)) {
          let prov = "";
          if (province.includes("jawa tengah")) prov = "Jawa Tengah";
          else if (province.includes("yogyakarta"))
            prov = "Daerah Istimewa Yogyakarta";

          if (prov) {
            citiesFromData.add(JSON.stringify({ city, province: prov }));
          }
        }
      });

      // Combine static cities + cities from data
      const allCities = [];
      Object.keys(allCitiesData).forEach((province) => {
        allCitiesData[province].forEach((city) => {
          allCities.push({ city, province });
        });
      });

      // Add any cities from data that might not be in static list
      citiesFromData.forEach((cityJson) => {
        const cityObj = JSON.parse(cityJson);
        if (
          !allCities.find(
            (c) => c.city === cityObj.city && c.province === cityObj.province
          )
        ) {
          allCities.push(cityObj);
        }
      });

      const cityArray = allCities.sort((a, b) => a.city.localeCompare(b.city));

      setCityList(cityArray);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [isConservationArea, allCitiesData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== COMPUTED DATA (OPTIMIZED WITH USEMEMO) ==========
  // Process Tanah Data
  const asetTanahData = useMemo(() => {
    const koremStats = {};
    const kodimStats = {};

    // Initialize korem stats
    koremList.forEach((korem) => {
      koremStats[korem.id] = {
        id: korem.id,
        name: korem.nama,
        bersertifikat: 0,
        tidakBersertifikat: 0,
        total: 0,
        kodim: korem.kodim || [],
      };
    });

    // Count assets
    rawAssetsData.forEach((asset) => {
      const koremId = asset.korem_id;
      const kodimName = asset.kodim;
      const hasSertifikat = asset.pemilikan_sertifikat === "Ya";

      // Count by korem
      if (koremStats[koremId]) {
        koremStats[koremId][
          hasSertifikat ? "bersertifikat" : "tidakBersertifikat"
        ] += 1;
        koremStats[koremId].total += 1;
      }

      // Count by kodim
      if (kodimName) {
        if (!kodimStats[kodimName]) {
          kodimStats[kodimName] = {
            name: kodimName,
            koremId: koremId,
            bersertifikat: 0,
            tidakBersertifikat: 0,
            total: 0,
          };
        }
        kodimStats[kodimName][
          hasSertifikat ? "bersertifikat" : "tidakBersertifikat"
        ] += 1;
        kodimStats[kodimName].total += 1;
      }
    });

    // Return based on filter
    if (selectedKodim) {
      return kodimStats[selectedKodim] ? [kodimStats[selectedKodim]] : [];
    } else if (selectedKorem) {
      return Object.values(kodimStats)
        .filter(
          (k) =>
            k.koremId?.toString() === selectedKorem.toString() && k.total > 0
        )
        .sort((a, b) => b.total - a.total);
    } else {
      return Object.values(koremStats)
        .filter((k) => k.total > 0)
        .sort((a, b) => b.total - a.total);
    }
  }, [rawAssetsData, koremList, selectedKorem, selectedKodim]);

  // Process Yardip Data
  const asetYardipData = useMemo(() => {
    const provinceStats = {
      "Jawa Tengah": {
        name: "Jawa Tengah",
        tanah: 0,
        tanahBangunan: 0,
        tanahGudangKantor: 0,
        ruko: 0,
        total: 0,
      },
      "Daerah Istimewa Yogyakarta": {
        name: "DI Yogyakarta",
        tanah: 0,
        tanahBangunan: 0,
        tanahGudangKantor: 0,
        ruko: 0,
        total: 0,
      },
    };
    const cityStats = {};

    rawYardipData.forEach((asset) => {
      const province = determineProvince(asset);
      const city = asset.kabkota;

      if (isConservationArea(city)) return;

      const category = categorizeYardipAsset(asset);

      // Count by province
      if (province && provinceStats[province]) {
        provinceStats[province][category] += 1;
        provinceStats[province].total += 1;
      }

      // Count by city
      if (city && province) {
        const cityKey = `${province}:${city}`;
        if (!cityStats[cityKey]) {
          cityStats[cityKey] = {
            name: city,
            province: province,
            tanah: 0,
            tanahBangunan: 0,
            tanahGudangKantor: 0,
            ruko: 0,
            total: 0,
          };
        }
        cityStats[cityKey][category] += 1;
        cityStats[cityKey].total += 1;
      }
    });

    // Return based on filter
    if (selectedCity && selectedProvince) {
      const cityKey = `${selectedProvince}:${selectedCity}`;
      return cityStats[cityKey] ? [cityStats[cityKey]] : [];
    } else if (selectedProvince) {
      return Object.values(cityStats)
        .filter((c) => c.province === selectedProvince && c.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);
    } else {
      return Object.values(provinceStats)
        .filter((p) => p.total > 0)
        .sort((a, b) => b.total - a.total);
    }
  }, [
    rawYardipData,
    selectedProvince,
    selectedCity,
    categorizeYardipAsset,
    determineProvince,
    isConservationArea,
  ]);

  // ========== FILTER OPTIONS (COMPUTED) ==========
  const availableKodim = useMemo(() => {
    if (!selectedKorem) return [];
    const korem = koremList.find(
      (k) => k.id.toString() === selectedKorem.toString()
    );
    return korem?.kodim || [];
  }, [selectedKorem, koremList]);

  const kotaOptions = useMemo(() => {
    if (!selectedProvince) return [];
    return cityList
      .filter((c) => c.province === selectedProvince)
      .map((c) => ({ value: c.city, label: c.city }));
  }, [cityList, selectedProvince]);

  // ========== TOTALS (COMPUTED) ==========
  const tanahTotals = useMemo(
    () => ({
      bersertifikat: asetTanahData.reduce(
        (sum, item) => sum + item.bersertifikat,
        0
      ),
      tidakBersertifikat: asetTanahData.reduce(
        (sum, item) => sum + item.tidakBersertifikat,
        0
      ),
      total: asetTanahData.reduce((sum, item) => sum + item.total, 0),
      grandTotal: rawAssetsData.length,
    }),
    [asetTanahData, rawAssetsData.length]
  );

  const yardipTotals = useMemo(
    () => ({
      tanah: asetYardipData.reduce((sum, item) => sum + (item.tanah || 0), 0),
      tanahBangunan: asetYardipData.reduce(
        (sum, item) => sum + (item.tanahBangunan || 0),
        0
      ),
      tanahGudangKantor: asetYardipData.reduce(
        (sum, item) => sum + (item.tanahGudangKantor || 0),
        0
      ),
      ruko: asetYardipData.reduce((sum, item) => sum + (item.ruko || 0), 0),
      grandTotal: rawYardipData.length,
    }),
    [asetYardipData, rawYardipData.length]
  );

  // ========== EVENT HANDLERS ==========
  const handleKoremFilterChange = useCallback((koremId) => {
    setSelectedKorem(koremId);
    setSelectedKodim("");
  }, []);

  const handleKodimFilterChange = useCallback((kodimName) => {
    setSelectedKodim(kodimName);
  }, []);

  const handleProvinceFilterChange = useCallback((provinceName) => {
    setSelectedProvince(provinceName);
    setSelectedCity("");
  }, []);

  const handleCityFilterChange = useCallback((cityName) => {
    setSelectedCity(cityName);
  }, []);

  // ========== UI HELPERS ==========
  const chartHeight = useMemo(() => {
    const availableHeight = window.innerHeight - 100;
    return Math.max(200, Math.floor(availableHeight / 2.5));
  }, []);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [slides.length]);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // ========== RENDER ==========
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
                  style={{ height: "100%" }}
                >
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                    }}
                  />
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

      {/* Charts */}
      <Row>
        {/* BMN Chart */}
        <Col md={6} className="mb-4">
          <Card className="chart-card h-100 border-0 shadow-sm">
            <Card.Header className="bg-primary text-white border-0">
              <Card.Title className="mb-0">Data Aset BMN KODAM</Card.Title>
            </Card.Header>
            <Card.Body className="d-flex flex-column justify-content-between">
              {/* Filters */}
              <div className="mb-3 p-3 bg-light rounded">
                <Row className="align-items-center">
                  <Col md={5}>
                    <Form.Label className="mb-1 fw-bold">
                      Filter Korem:
                    </Form.Label>
                    <Form.Select
                      size="sm"
                      value={selectedKorem}
                      onChange={(e) => handleKoremFilterChange(e.target.value)}
                    >
                      <option value="">Semua Korem</option>
                      {koremList.map((korem) => (
                        <option key={korem.id} value={korem.id}>
                          {korem.nama}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={5}>
                    <Form.Label className="mb-1 fw-bold">
                      Filter Kodim:
                    </Form.Label>
                    <Form.Select
                      size="sm"
                      value={selectedKodim}
                      onChange={(e) => handleKodimFilterChange(e.target.value)}
                      disabled={!selectedKorem}
                    >
                      <option value="">
                        {selectedKorem ? "Semua Kodim" : "Pilih Korem dulu"}
                      </option>
                      {availableKodim.map((kodimName) => (
                        <option key={kodimName} value={kodimName}>
                          {kodimName}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    {(selectedKorem || selectedKodim) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-100 mt-4"
                        onClick={() => {
                          handleKoremFilterChange("");
                          setSelectedKodim("");
                        }}
                      >
                        Reset
                      </Button>
                    )}
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
                    <small>Bersertifikat ({tanahTotals.bersertifikat})</small>
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
                      Tidak Bersertifikat ({tanahTotals.tidakBersertifikat})
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
                    <small>Total ({tanahTotals.total})</small>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={asetTanahData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="bersertifikat" fill="#4285f4" />
                  <Bar dataKey="tidakBersertifikat" fill="#ea4335" />
                  <Bar dataKey="total" fill="#34a853" />
                </BarChart>
              </ResponsiveContainer>

              <div className="text-center mt-auto">
                <Button
                  variant="primary"
                  onClick={() => navigate("/data-aset-tanah")}
                >
                  Lihat Semua Data Aset BMN
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Yardip Chart */}
        <Col md={6} className="mb-4">
          <Card className="chart-card h-100 border-0 shadow-sm">
            <Card.Header className="bg-success text-white border-0">
              <Card.Title className="mb-0">Data Aset Yardip KODAM</Card.Title>
            </Card.Header>
            <Card.Body className="d-flex flex-column justify-content-between">
              {/* Filters */}
              <div className="mb-3 p-3 bg-light rounded">
                <Row className="align-items-center">
                  <Col md={5}>
                    <Form.Label className="mb-1 fw-bold">
                      Filter Provinsi:
                    </Form.Label>
                    <Form.Select
                      size="sm"
                      value={selectedProvince}
                      onChange={(e) =>
                        handleProvinceFilterChange(e.target.value)
                      }
                    >
                      <option value="">Semua Provinsi</option>
                      {provinsiOptions.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={5}>
                    <Form.Label className="mb-1 fw-bold">
                      Filter Kota:
                    </Form.Label>
                    <Form.Select
                      size="sm"
                      value={selectedCity}
                      onChange={(e) => handleCityFilterChange(e.target.value)}
                      disabled={!selectedProvince}
                    >
                      <option value="">
                        {selectedProvince
                          ? "Semua Kota"
                          : "Pilih Provinsi dulu"}
                      </option>
                      {kotaOptions.map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    {(selectedProvince || selectedCity) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-100 mt-4"
                        onClick={() => {
                          handleProvinceFilterChange("");
                          setSelectedCity("");
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </Col>
                </Row>
              </div>

              {/* Legend */}
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#34a853",
                        width: "18px",
                        height: "13px",
                      }}
                    ></div>
                    <small>Tanah ({yardipTotals.tanah})</small>
                  </div>
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#4285f4",
                        width: "18px",
                        height: "13px",
                      }}
                    ></div>
                    <small>Tanah Bangunan ({yardipTotals.tanahBangunan})</small>
                  </div>
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#fbbc04",
                        width: "18px",
                        height: "13px",
                      }}
                    ></div>
                    <small>
                      Tanah Gudang Kantor ({yardipTotals.tanahGudangKantor})
                    </small>
                  </div>
                  <div className="legend-item d-flex align-items-center">
                    <div
                      className="legend-color me-2"
                      style={{
                        backgroundColor: "#ea4335",
                        width: "18px",
                        height: "13px",
                      }}
                    ></div>
                    <small>Ruko ({yardipTotals.ruko})</small>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={asetYardipData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="tanah" fill="#34a853" />
                  <Bar dataKey="tanahBangunan" fill="#4285f4" />
                  <Bar dataKey="tanahGudangKantor" fill="#fbbc04" />
                  <Bar dataKey="ruko" fill="#ea4335" />
                </BarChart>
              </ResponsiveContainer>

              <div className="text-center mt-auto">
                <Button
                  variant="success"
                  onClick={() => navigate("/data-aset-yardip")}
                >
                  Lihat Semua Data Aset Yardip
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
