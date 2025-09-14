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

// Data kota untuk filter
const kotaData = {
  jateng: [
    { id: "semarang", name: "Semarang" },
    { id: "solo", name: "Surakarta (Solo)" },
    { id: "magelang", name: "Magelang" },
    { id: "salatiga", name: "Salatiga" },
    { id: "tegal", name: "Tegal" },
    { id: "pekalongan", name: "Pekalongan" },
    { id: "purwokerto", name: "Purwokerto" },
    { id: "cilacap", name: "Cilacap" },
    { id: "kudus", name: "Kudus" },
    { id: "jepara", name: "Jepara" },
    { id: "rembang", name: "Rembang" },
  ],
  diy: [
    { id: "jogja", name: "Yogyakarta" },
    { id: "sleman", name: "Sleman" },
    { id: "bantul", name: "Bantul" },
    { id: "kulonprogo", name: "Kulon Progo" },
    { id: "gunungkidul", name: "Gunung Kidul" },
  ],
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [asetTanahData, setAsetTanahData] = useState([]);
  const [asetYardipData, setAsetYardipData] = useState([]);
  const [koremList, setKoremList] = useState([]);
  const [selectedKorem, setSelectedKorem] = useState(""); // Filter state for tanah
  const [selectedProvince, setSelectedProvince] = useState(""); // Filter state for yardip
  const [selectedCity, setSelectedCity] = useState(""); // NEW: Filter state for city
  const [rawAssetsData, setRawAssetsData] = useState([]); // Store raw data for filtering
  const [rawYardipData, setRawYardipData] = useState([]); // Store raw yardip data
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

  // FIXED: Helper function to categorize yardip asset based on bidang field
  const categorizeYardipAsset = (asset) => {
    // Use bidang field instead of peruntukan for more accurate categorization
    const bidang = (asset.bidang || "").toLowerCase().trim();

    console.log("Categorizing asset:", {
      id: asset.id,
      pengelola: asset.pengelola,
      bidang: asset.bidang,
      bidang_lower: bidang,
    });

    // Match exactly with bidang options from FormYardip.js
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
        // Fallback to peruntukan if bidang is not standard
        const peruntukan = (asset.peruntukan || "").toLowerCase().trim();
        if (peruntukan.includes("ruko") || peruntukan.includes("toko")) {
          return "ruko";
        } else if (
          peruntukan.includes("gudang") ||
          peruntukan.includes("kantor")
        ) {
          return "tanahGudangKantor";
        } else if (peruntukan.includes("bangunan")) {
          return "tanahBangunan";
        } else {
          return "tanah"; // Default fallback
        }
    }
  };

  // Helper function to determine province from asset data
  const determineProvince = (asset) => {
    if (asset.provinsi_id) {
      return asset.provinsi_id;
    } else if (asset.provinsi) {
      if (
        asset.provinsi.toLowerCase().includes("jawa tengah") ||
        asset.provinsi.toLowerCase().includes("jateng")
      ) {
        return "jateng";
      } else if (
        asset.provinsi.toLowerCase().includes("yogya") ||
        asset.provinsi.toLowerCase().includes("diy")
      ) {
        return "diy";
      }
    } else {
      // Fallback: determine by kabkota
      const kabkota = (asset.kabkota || "").toLowerCase();
      const jatengCities = [
        "semarang",
        "solo",
        "surakarta",
        "magelang",
        "salatiga",
        "tegal",
        "pekalongan",
        "purwokerto",
        "cilacap",
        "kudus",
        "jepara",
        "rembang",
      ];
      const diyCities = [
        "yogyakarta",
        "jogja",
        "sleman",
        "bantul",
        "kulon progo",
        "gunung kidul",
      ];

      if (jatengCities.some((city) => kabkota.includes(city))) {
        return "jateng";
      } else if (diyCities.some((city) => kabkota.includes(city))) {
        return "diy";
      }
    }
    return null;
  };

  // Helper function to determine city from asset data
  const determineCity = (asset) => {
    if (asset.kota_id) {
      return asset.kota_id;
    } else if (asset.kota) {
      // Try to match city name with kotaData
      const province = determineProvince(asset);
      if (province && kotaData[province]) {
        const cityData = kotaData[province].find(
          (city) =>
            city.name.toLowerCase().includes(asset.kota.toLowerCase()) ||
            asset.kota.toLowerCase().includes(city.name.toLowerCase())
        );
        return cityData ? cityData.id : null;
      }
    } else if (asset.kabkota) {
      // Try to match kabkota with kotaData
      const province = determineProvince(asset);
      if (province && kotaData[province]) {
        const cityData = kotaData[province].find(
          (city) =>
            city.name.toLowerCase().includes(asset.kabkota.toLowerCase()) ||
            asset.kabkota.toLowerCase().includes(city.name.toLowerCase())
        );
        return cityData ? cityData.id : null;
      }
    }
    return null;
  };

  // Process Yardip data by Province (default view)
  const processYardipByProvince = useCallback((yardipData) => {
    console.log(
      "Processing yardip by province, total data:",
      yardipData.length
    );

    const provinceStats = {
      jateng: {
        name: "Jawa Tengah",
        tanah: 0,
        tanahBangunan: 0,
        tanahGudangKantor: 0,
        ruko: 0,
        total: 0,
      },
      diy: {
        name: "DI Yogyakarta",
        tanah: 0,
        tanahBangunan: 0,
        tanahGudangKantor: 0,
        ruko: 0,
        total: 0,
      },
    };

    // Count yardip assets by province and category
    yardipData.forEach((asset) => {
      const provinceKey = determineProvince(asset);
      const category = categorizeYardipAsset(asset);

      console.log("Asset processing:", {
        pengelola: asset.pengelola,
        provinceKey,
        category,
        bidang: asset.bidang,
      });

      if (provinceKey && provinceStats[provinceKey]) {
        provinceStats[provinceKey][category] += 1;
        provinceStats[provinceKey].total += 1;
      }
    });

    console.log("Province stats result:", provinceStats);

    return Object.values(provinceStats)
      .filter((province) => province.total > 0)
      .sort((a, b) => b.total - a.total);
  }, []);

  // FIXED: Process Yardip data by City within selected province
  const processYardipByCity = useCallback(
    (yardipData, selectedProvinceKey, selectedCityKey = null) => {
      console.log(
        "Processing yardip by city for province:",
        selectedProvinceKey,
        "city:",
        selectedCityKey
      );

      let filteredData = yardipData.filter((asset) => {
        const assetProvince = determineProvince(asset);
        if (assetProvince !== selectedProvinceKey) return false;

        // If specific city is selected, filter by city too
        if (selectedCityKey) {
          const assetCity = determineCity(asset);
          return assetCity === selectedCityKey;
        }

        return true;
      });

      console.log(
        "Filtered data for province/city:",
        filteredData.length,
        "assets"
      );

      if (selectedCityKey) {
        // If specific city selected, show single city data
        const cityName =
          kotaData[selectedProvinceKey]?.find((c) => c.id === selectedCityKey)
            ?.name || "Unknown City";
        const cityStats = {
          name: cityName,
          tanah: 0,
          tanahBangunan: 0,
          tanahGudangKantor: 0,
          ruko: 0,
          total: 0,
        };

        filteredData.forEach((asset) => {
          const category = categorizeYardipAsset(asset);
          cityStats[category] += 1;
          cityStats.total += 1;
        });

        return cityStats.total > 0 ? [cityStats] : [];
      } else {
        // Show all cities in the province
        const cityStats = {};

        filteredData.forEach((asset) => {
          const cityId = determineCity(asset);
          const cityName = cityId
            ? kotaData[selectedProvinceKey]?.find((c) => c.id === cityId)
                ?.name ||
              asset.kabkota ||
              "Unknown"
            : asset.kabkota || asset.kota || "Tidak Diketahui";

          const category = categorizeYardipAsset(asset);

          if (!cityStats[cityName]) {
            cityStats[cityName] = {
              name: cityName,
              tanah: 0,
              tanahBangunan: 0,
              tanahGudangKantor: 0,
              ruko: 0,
              total: 0,
            };
          }

          cityStats[cityName][category] += 1;
          cityStats[cityName].total += 1;

          console.log("City processing:", {
            city: cityName,
            category,
            bidang: asset.bidang,
          });
        });

        console.log("City stats result:", cityStats);

        return Object.values(cityStats)
          .filter((city) => city.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 15); // Limit to top 15 cities for better visualization
      }
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
      const yardipData = yardipRes.data;
      const koremData = koremRes.data;

      console.log("Raw yardip data received:", yardipData.length, "items");
      console.log("Sample yardip data:", yardipData.slice(0, 3));

      setRawAssetsData(assetsData);
      setRawYardipData(yardipData);
      setKoremList(koremData);

      // Default view: by Korem for tanah
      const tanahByKorem = processDataByKorem(assetsData, koremData);
      setAsetTanahData(tanahByKorem);

      // Default view: by Province for yardip
      const yardipByProvince = processYardipByProvince(yardipData);
      setAsetYardipData(yardipByProvince);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [processDataByKorem, processYardipByProvince]);

  // Handle filter change for tanah (korem)
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

  // FIXED: Handle filter change for yardip (province and city)
  const handleProvinceFilterChange = useCallback(
    (provinceKey) => {
      console.log("Province filter changed to:", provinceKey);
      setSelectedProvince(provinceKey);
      setSelectedCity(""); // Reset city when province changes

      if (provinceKey) {
        // Show city data for selected province
        const cityData = processYardipByCity(rawYardipData, provinceKey);
        setAsetYardipData(cityData);
      } else {
        // Show province data (default)
        const provinceData = processYardipByProvince(rawYardipData);
        setAsetYardipData(provinceData);
      }
    },
    [rawYardipData, processYardipByProvince, processYardipByCity]
  );

  // NEW: Handle city filter change
  const handleCityFilterChange = useCallback(
    (cityKey) => {
      console.log("City filter changed to:", cityKey);
      setSelectedCity(cityKey);

      if (selectedProvince && cityKey) {
        // Show specific city data
        const cityData = processYardipByCity(
          rawYardipData,
          selectedProvince,
          cityKey
        );
        setAsetYardipData(cityData);
      } else if (selectedProvince) {
        // Show all cities in selected province
        const cityData = processYardipByCity(rawYardipData, selectedProvince);
        setAsetYardipData(cityData);
      } else {
        // Show province data (default)
        const provinceData = processYardipByProvince(rawYardipData);
        setAsetYardipData(provinceData);
      }
    },
    [
      selectedProvince,
      rawYardipData,
      processYardipByProvince,
      processYardipByCity,
    ]
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

  // Calculate totals for yardip (from current filtered/displayed data)
  const totalTanah = asetYardipData.reduce(
    (sum, item) => sum + (item.tanah || 0),
    0
  );
  const totalTanahBangunan = asetYardipData.reduce(
    (sum, item) => sum + (item.tanahBangunan || 0),
    0
  );
  const totalTanahGudangKantor = asetYardipData.reduce(
    (sum, item) => sum + (item.tanahGudangKantor || 0),
    0
  );
  const totalRuko = asetYardipData.reduce(
    (sum, item) => sum + (item.ruko || 0),
    0
  );
  const totalAsetYardip = rawYardipData.length; // Grand total from raw data

  // Calculate grand totals by category for yardip (for verification)
  const grandTotalByCategory = rawYardipData.reduce((acc, asset) => {
    const category = categorizeYardipAsset(asset);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  console.log("Grand totals by category:", grandTotalByCategory);
  console.log("Current filtered totals:", {
    totalTanah,
    totalTanahBangunan,
    totalTanahGudangKantor,
    totalRuko,
  });

  const selectedKoremName = selectedKorem
    ? koremList.find((k) => k.id.toString() === selectedKorem.toString())
        ?.nama || "Unknown"
    : null;

  const selectedProvinceName = selectedProvince
    ? selectedProvince === "jateng"
      ? "Jawa Tengah"
      : selectedProvince === "diy"
      ? "DI Yogyakarta"
      : "Unknown"
    : null;

  const selectedCityName =
    selectedCity && selectedProvince
      ? kotaData[selectedProvince]?.find((c) => c.id === selectedCity)?.name ||
        "Unknown"
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
            <Card.Header className="bg-success text-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">
                    Data Aset Yardip KODAM
                    {selectedProvinceName && (
                      <span className="badge bg-light text-success ms-2">
                        {selectedProvinceName}
                      </span>
                    )}
                    {selectedCityName && (
                      <span className="badge bg-warning text-dark ms-2">
                        {selectedCityName}
                      </span>
                    )}
                  </h5>
                </div>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleNavigateToYardip}
                >
                  Lihat Detail
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {/* FIXED: Enhanced Filter Section for Yardip with City Selection */}
              <div className="mb-3 p-3 bg-light rounded">
                <Row className="align-items-center">
                  <Col md={4}>
                    <Form.Label className="mb-1 fw-bold">
                      Filter by Provinsi:
                    </Form.Label>
                    <Form.Select
                      size="sm"
                      value={selectedProvince}
                      onChange={(e) =>
                        handleProvinceFilterChange(e.target.value)
                      }
                    >
                      <option value="">
                        Semua Provinsi (Tampilkan per Provinsi)
                      </option>
                      <option value="jateng">
                        Jawa Tengah (Tampilkan per Kota)
                      </option>
                      <option value="diy">
                        DI Yogyakarta (Tampilkan per Kota)
                      </option>
                    </Form.Select>
                  </Col>

                  {/* NEW: City Filter */}
                  <Col md={4}>
                    <Form.Label className="mb-1 fw-bold">
                      Filter by Kota:
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
                      {selectedProvince &&
                        kotaData[selectedProvince] &&
                        kotaData[selectedProvince].map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                    </Form.Select>
                  </Col>

                  <Col md={4}>
                    <div className="text-end">
                      <small className="text-muted">
                        Menampilkan: <strong>{asetYardipData.length}</strong>{" "}
                        {selectedCity
                          ? "Kota (Spesifik)"
                          : selectedProvince
                          ? "Kota"
                          : "Provinsi"}
                      </small>
                      {(selectedProvince || selectedCity) && (
                        <div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="mt-1 me-1"
                            onClick={() => handleCityFilterChange("")}
                            disabled={!selectedCity}
                          >
                            Reset Kota
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="mt-1"
                            onClick={() => {
                              handleProvinceFilterChange("");
                              setSelectedCity("");
                            }}
                          >
                            Reset Semua
                          </Button>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Updated Legend with Corrected Categories */}
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
                    <small>Tanah ({totalTanah})</small>
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
                    <small>Tanah Bangunan ({totalTanahBangunan})</small>
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
                      Tanah Gudang Kantor ({totalTanahGudangKantor})
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
                    <small>Ruko ({totalRuko})</small>
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
                      name === "tanah"
                        ? "Tanah"
                        : name === "tanahBangunan"
                        ? "Tanah Bangunan"
                        : name === "tanahGudangKantor"
                        ? "Tanah Gudang Kantor"
                        : "Ruko",
                    ]}
                    labelFormatter={(label) => {
                      if (selectedCity) {
                        return `Kota ${label}`;
                      } else if (selectedProvince) {
                        return `Kota ${label}`;
                      } else {
                        return `Provinsi ${label}`;
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
                  <Bar dataKey="tanah" fill="#34a853" name="tanah" />
                  <Bar
                    dataKey="tanahBangunan"
                    fill="#4285f4"
                    name="tanahBangunan"
                  />
                  <Bar
                    dataKey="tanahGudangKantor"
                    fill="#fbbc04"
                    name="tanahGudangKantor"
                  />
                  <Bar dataKey="ruko" fill="#ea4335" name="ruko" />
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
