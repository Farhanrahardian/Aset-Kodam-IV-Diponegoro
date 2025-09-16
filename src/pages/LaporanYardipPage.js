import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Button,
  Form,
  Alert,
  Spinner,
} from "react-bootstrap";
import axios from "axios";
import ExcelJS from "exceljs";

const API_URL = "http://localhost:3001";

// Data provinsi dan kota yang sama dengan DataAsetYardipPage
const kotaData = {
  jateng: [
    { id: "semarang", name: "Semarang" },
    { id: "solo", name: "Surakarta (Solo)" },
    { id: "yogya", name: "Yogyakarta" },
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

const LaporanYardipPage = () => {
  const [assets, setAssets] = useState([]);
  const [bidangList, setBidangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedProvinsi, setSelectedProvinsi] = useState("");
  const [selectedKota, setSelectedKota] = useState("");
  const [selectedBidang, setSelectedBidang] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filteredAssets, setFilteredAssets] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assetsRes = await axios.get(`${API_URL}/yardip_assets`);

        setAssets(assetsRes.data);

        // Extract unique bidang for filter
        const uniqueBidang = [
          ...new Set(
            assetsRes.data.map((asset) => asset.bidang).filter(Boolean)
          ),
        ];
        setBidangList(uniqueBidang);

        setFilteredAssets(assetsRes.data);
        setError(null);
      } catch (err) {
        setError(
          "Gagal memuat data dari server. Pastikan server API berjalan."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update filtered assets when filters change
  useEffect(() => {
    let filtered = assets;

    if (selectedProvinsi) {
      filtered = filtered.filter(
        (asset) => asset.provinsi_id === selectedProvinsi
      );
    }

    if (selectedKota) {
      filtered = filtered.filter((asset) => asset.kota_id === selectedKota);
    }

    if (selectedBidang) {
      filtered = filtered.filter((asset) => asset.bidang === selectedBidang);
    }

    if (statusFilter) {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    setFilteredAssets(filtered);
  }, [selectedProvinsi, selectedKota, selectedBidang, statusFilter, assets]);

  // Get kota list based on selected provinsi
  const getKotaForSelectedProvinsi = () => {
    if (!selectedProvinsi) return [];
    return kotaData[selectedProvinsi] || [];
  };

  const handleProvinsiChange = (e) => {
    setSelectedProvinsi(e.target.value);
    setSelectedKota(""); // Reset kota when provinsi changes
  };

  const handleResetFilter = () => {
    setSelectedProvinsi("");
    setSelectedKota("");
    setSelectedBidang("");
    setStatusFilter("");
  };

  // Helper function untuk mendapatkan nama provinsi
  const getProvinsiName = (provinsiId) => {
    switch (provinsiId) {
      case "jateng":
        return "JAWA TENGAH";
      case "diy":
        return "DI YOGYAKARTA";
      default:
        return "-";
    }
  };

  // Helper function untuk mendapatkan nama kota
  const getKotaName = (provinsiId, kotaId) => {
    if (!provinsiId || !kotaId) return "-";
    const kota = kotaData[provinsiId]?.find((k) => k.id === kotaId);
    return kota ? kota.name.toUpperCase() : kotaId.toUpperCase();
  };

  // Helper function untuk group assets berdasarkan Provinsi dan Kota (untuk preview)
  const groupAssetsByProvinsiKota = (assets) => {
    const grouped = {};

    assets.forEach((asset) => {
      const provinsiId = asset.provinsi_id || "unknown";
      const kotaId = asset.kota_id || "Tidak Ada Kota";

      if (!grouped[provinsiId]) {
        grouped[provinsiId] = {
          provinsiName: getProvinsiName(provinsiId),
          kotas: {},
        };
      }

      if (!grouped[provinsiId].kotas[kotaId]) {
        grouped[provinsiId].kotas[kotaId] = [];
      }

      grouped[provinsiId].kotas[kotaId].push(asset);
    });

    return grouped;
  };

  // Function untuk export ke XLSX dengan format yang diperbaiki
  const exportToExcel = async () => {
    if (filteredAssets.length === 0) {
      alert("Tidak ada data untuk diekspor!");
      return;
    }

    setExporting(true);

    try {
      // Siapkan judul berdasarkan filter
      let title = "DAFTAR ASET TANAH YAYASAN RUMPUN DIPONEGORO SELAIN KEBUN";
      let subtitle = "";

      if (selectedProvinsi && selectedKota) {
        subtitle = `DI WILAYAH ${getKotaName(selectedProvinsi, selectedKota)}`;
      } else if (selectedProvinsi) {
        subtitle = `DI WILAYAH ${getProvinsiName(selectedProvinsi)}`;
      } else {
        subtitle = "DI SELURUH WILAYAH";
      }

      // Buat workbook baru
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Aset Yardip");

      // Set column widths - 7 kolom utama
      worksheet.columns = [
        { width: 8 }, // A - NO
        { width: 15 }, // B - BIDANG
        { width: 20 }, // C - LOKASI (4 baris: Kelurahan, Kecamatan, Kota, Provinsi)
        { width: 15 }, // D - LUAS (M2)
        { width: 25 }, // E - PERUNTUKAN
        { width: 25 }, // F - STATUS
        { width: 30 }, // G - KETERANGAN
      ];

      // Tambahkan title (Row 1)
      const titleCell = worksheet.getCell("A1");
      titleCell.value = title;
      titleCell.font = {
        bold: true,
        size: 14,
        name: "Arial",
      };
      titleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.mergeCells("A1:G1");

      // Tambahkan subtitle (Row 2)
      const subtitleCell = worksheet.getCell("A2");
      subtitleCell.value = subtitle;
      subtitleCell.font = {
        bold: true,
        size: 12,
        name: "Arial",
      };
      subtitleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.mergeCells("A2:G2");

      // Row kosong (Row 3)
      worksheet.getRow(3).height = 10;

      // Header Row (Row 4)
      const headers = [
        "NO",
        "BIDANG",
        "LOKASI",
        "LUAS (M2)",
        "PERUNTUKAN",
        "STATUS",
        "KETERANGAN",
      ];

      const headerRow = worksheet.getRow(4);
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = {
          bold: true,
          size: 11,
          name: "Arial",
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD3D3D3" },
        };
      });
      headerRow.height = 30;

      // Header angka (Row 5)
      const numberHeaders = ["1", "2", "3", "4", "5", "6", "7"];
      const numberRow = worksheet.getRow(5);
      numberHeaders.forEach((num, index) => {
        const cell = numberRow.getCell(index + 1);
        cell.value = num;
        cell.font = {
          bold: true,
          size: 10,
          name: "Arial",
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD3D3D3" },
        };
      });
      numberRow.height = 20;

      // Group assets berdasarkan Peruntukan
      const groupedAssets = {};
      filteredAssets.forEach((asset) => {
        const peruntukan = asset.peruntukan || "Tidak Ada Peruntukan";
        if (!groupedAssets[peruntukan]) {
          groupedAssets[peruntukan] = [];
        }
        groupedAssets[peruntukan].push(asset);
      });

      let currentRow = 6;
      let globalIndex = 1;

      // Helper function untuk memformat bidang khusus
      const formatBidangName = (bidang) => {
        if (!bidang) return "-";

        // Handle "Tanah Gudang Kantor"
        if (bidang.toLowerCase().includes("tanah gudang kantor")) {
          return "Tanah\nGudang\nKantor";
        }

        // Handle "Tanah Bangunan"
        if (bidang.toLowerCase().includes("tanah bangunan")) {
          return "Tanah\nBangunan";
        }

        return bidang;
      };

      // Loop through each Peruntukan
      Object.keys(groupedAssets).forEach((peruntukanName) => {
        const peruntukanAssets = groupedAssets[peruntukanName];

        // Tambahkan header PERUNTUKAN
        const peruntukanHeaderRow = worksheet.getRow(currentRow);
        const peruntukanHeaderCell = peruntukanHeaderRow.getCell(1);
        peruntukanHeaderCell.value = peruntukanName.toUpperCase();
        peruntukanHeaderCell.font = {
          bold: true,
          size: 12,
          name: "Arial",
        };
        peruntukanHeaderCell.alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        // Merge peruntukan header across all columns (A:G)
        worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
        peruntukanHeaderRow.height = 25;
        currentRow++;

        // Tambahkan setiap aset sebagai data terpisah (tidak digroup by bidang)
        peruntukanAssets.forEach((asset) => {
          // Baris pertama: Nomor, Bidang, Kelurahan, Luas, Peruntukan, Status, Keterangan
          const row1 = worksheet.getRow(currentRow);
          row1.getCell(1).value = globalIndex; // NO
          row1.getCell(2).value = formatBidangName(asset.bidang); // BIDANG dengan format khusus
          row1.getCell(3).value = asset.kelurahan || "-"; // LOKASI - Kelurahan
          row1.getCell(4).value = asset.area ? Number(asset.area) : "-"; // LUAS
          row1.getCell(5).value = asset.peruntukan || "-"; // PERUNTUKAN
          row1.getCell(6).value = asset.status || "-"; // STATUS
          row1.getCell(7).value = asset.keterangan || "-"; // KETERANGAN

          // Baris kedua: Kecamatan
          currentRow++;
          const row2 = worksheet.getRow(currentRow);
          row2.getCell(3).value = asset.kecamatan || "-"; // LOKASI - Kecamatan

          // Baris ketiga: Kota
          currentRow++;
          const row3 = worksheet.getRow(currentRow);
          row3.getCell(3).value = getKotaName(asset.provinsi_id, asset.kota_id); // LOKASI - Kota

          // Baris keempat: Provinsi
          currentRow++;
          const row4 = worksheet.getRow(currentRow);
          row4.getCell(3).value = getProvinsiName(asset.provinsi_id); // LOKASI - Provinsi

          // Set formatting untuk semua 4 baris
          [row1, row2, row3, row4].forEach((row) => {
            for (let col = 1; col <= 7; col++) {
              const cell = row.getCell(col);
              cell.font = {
                size: 10,
                name: "Arial",
              };

              // Set alignment
              if ([1, 4].includes(col)) {
                // Number columns (A, D) - center/right
                cell.alignment = {
                  horizontal: col === 1 ? "center" : "right",
                  vertical: "middle",
                };
                if (
                  col === 4 &&
                  typeof cell.value === "number" &&
                  cell.value > 0
                ) {
                  cell.numFmt = "#,##0";
                }
              } else if (col === 2) {
                // Bidang column - center with wrap text for multi-line
                cell.alignment = {
                  horizontal: "center",
                  vertical: "middle",
                  wrapText: true,
                };
              } else {
                // Text columns - left
                cell.alignment = {
                  horizontal: "left",
                  vertical: "middle",
                  wrapText: true,
                };
              }
            }
            row.height = 20;
          });

          currentRow++;
          globalIndex++;
        });
      });

      // Apply border ke semua cells yang berisi data
      for (let row = 1; row < currentRow; row++) {
        for (let col = 1; col <= 7; col++) {
          const cell = worksheet.getCell(row, col);
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        }
      }

      // Generate nama file
      const provinsiName = selectedProvinsi
        ? getProvinsiName(selectedProvinsi)
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_")
        : "Semua";
      const fileName = `Laporan_Aset_Yardip_${provinsiName}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      // Write dan download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Download file
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("File Excel berhasil didownload.");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert(`Gagal mengekspor data ke Excel: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Helper function untuk group assets for preview (kembali ke format asli)
  const getGroupedAssetsForPreview = () => {
    return groupAssetsByProvinsiKota(filteredAssets);
  };

  if (loading)
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "50vh" }}
      >
        <div className="text-center">
          <Spinner
            animation="border"
            variant="primary"
            style={{ width: "3rem", height: "3rem" }}
          />
          <p className="mt-3">Memuat data...</p>
        </div>
      </Container>
    );

  return (
    <Container className="py-4">
      <div className="mb-4">
        <h2 className="text-dark">
          <i className="fas fa-file-excel me-2"></i>
          Cetak Laporan Data Aset Yardip
        </h2>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>Error!</Alert.Heading>
          {error}
        </Alert>
      )}

      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <i className="fas fa-filter me-2"></i>
            Filter Laporan
          </h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <i className="fas fa-map-marked-alt me-2"></i>
                  Provinsi
                </Form.Label>
                <Form.Select
                  value={selectedProvinsi}
                  onChange={handleProvinsiChange}
                  className="form-select-lg"
                >
                  <option value="">Semua Provinsi</option>
                  <option value="jateng">Jawa Tengah</option>
                  <option value="diy">DI Yogyakarta</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <i className="fas fa-building me-2"></i>
                  Kota/Kabupaten
                </Form.Label>
                <Form.Select
                  value={selectedKota}
                  onChange={(e) => setSelectedKota(e.target.value)}
                  className="form-select-lg"
                  disabled={!selectedProvinsi}
                >
                  <option value="">Semua Kota</option>
                  {getKotaForSelectedProvinsi().map((kota) => (
                    <option key={kota.id} value={kota.id}>
                      {kota.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <i className="fas fa-layer-group me-2"></i>
                  Bidang
                </Form.Label>
                <Form.Select
                  value={selectedBidang}
                  onChange={(e) => setSelectedBidang(e.target.value)}
                  className="form-select-lg"
                >
                  <option value="">Semua Bidang</option>
                  {bidangList.map((bidang) => (
                    <option key={bidang} value={bidang}>
                      {bidang}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <i className="fas fa-flag me-2"></i>
                  Status
                </Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-select-lg"
                >
                  <option value="">Semua Status</option>
                  <option value="Dimiliki/Dikuasai">Dimiliki/Dikuasai</option>
                  <option value="Tidak Dimiliki/Tidak Dikuasai">
                    Tidak Dimiliki/Tidak Dikuasai
                  </option>
                  <option value="Lain-lain">Lain-lain</option>
                  <option value="Dalam Proses">Dalam Proses</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <hr className="my-4" />

          <Row>
            <Col>
              <div className="d-flex gap-3 flex-wrap">
                <Button
                  variant="secondary"
                  onClick={handleResetFilter}
                  size="lg"
                >
                  <i className="fas fa-undo me-2"></i>
                  Reset Filter
                </Button>

                <Button
                  variant="success"
                  onClick={exportToExcel}
                  disabled={exporting || filteredAssets.length === 0}
                  size="lg"
                  className="flex-grow-1 flex-md-grow-0"
                >
                  {exporting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Mengekspor data...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download me-2"></i>
                      Cetak Laporan Excel
                    </>
                  )}
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white">
          <h5 className="mb-0">
            <i className="fas fa-eye me-2"></i>
            Preview Data yang akan Diekspor
          </h5>
        </Card.Header>
        <Card.Body>
          {filteredAssets.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-muted">
                <i className="fas fa-folder-open fa-4x mb-4 text-secondary"></i>
                <h4 className="mb-3">Tidak ada data untuk ditampilkan</h4>
                <p className="lead">
                  Sesuaikan filter di atas untuk menampilkan data yang
                  diinginkan.
                </p>
                <Button variant="outline-primary" onClick={handleResetFilter}>
                  <i className="fas fa-undo me-2"></i>
                  Reset Filter
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards - Updated to show Lain-lain instead of Total Luas */}
              <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                  <Card className="bg-primary text-white h-100">
                    <Card.Body className="text-center">
                      <i className="fas fa-database fa-2x mb-2"></i>
                      <h3 className="mb-1">{filteredAssets.length}</h3>
                      <small>Total Aset Yardip</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                  <Card className="bg-success text-white h-100">
                    <Card.Body className="text-center">
                      <i className="fas fa-check-circle fa-2x mb-2"></i>
                      <h3 className="mb-1">
                        {
                          filteredAssets.filter(
                            (a) => a.status === "Dimiliki/Dikuasai"
                          ).length
                        }
                      </h3>
                      <small>Dimiliki/Dikuasai</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                  <Card className="bg-danger text-white h-100">
                    <Card.Body className="text-center">
                      <i className="fas fa-times-circle fa-2x mb-2"></i>
                      <h3 className="mb-1">
                        {
                          filteredAssets.filter(
                            (a) => a.status === "Tidak Dimiliki/Tidak Dikuasai"
                          ).length
                        }
                      </h3>
                      <small>Tidak Dimiliki/Tidak Dikuasai</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={3} md={6} className="mb-3">
                  <Card className="bg-warning text-dark h-100">
                    <Card.Body className="text-center">
                      <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
                      <h3 className="mb-1">
                        {
                          filteredAssets.filter((a) => a.status === "Lain-lain")
                            .length
                        }
                      </h3>
                      <small>Lain-lain</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Data Preview dengan Grouping berdasarkan Provinsi dan Kota (format asli) */}
              <div
                className="border rounded"
                style={{ maxHeight: "600px", overflowY: "auto" }}
              >
                {Object.keys(getGroupedAssetsForPreview()).map((provinsiId) => {
                  const provinsiData = getGroupedAssetsForPreview()[provinsiId];
                  return (
                    <div key={provinsiId} className="mb-4">
                      {/* Header Provinsi dengan background biru */}
                      <div
                        className="p-3"
                        style={{ backgroundColor: "#4472C4", color: "white" }}
                      >
                        <h5 className="mb-0 fw-bold">
                          <i className="fas fa-map-marked-alt me-2"></i>
                          {provinsiData.provinsiName}
                        </h5>
                      </div>

                      {Object.keys(provinsiData.kotas).map((kotaId) => {
                        const kotaAssets = provinsiData.kotas[kotaId];
                        const kotaName = getKotaName(provinsiId, kotaId);

                        return (
                          <div key={kotaId} className="ms-3 mb-3">
                            <div className="bg-warning bg-opacity-25 p-2 border-start border-warning border-3">
                              <strong className="text-dark">
                                <i className="fas fa-building me-2"></i>
                                {kotaName} ({kotaAssets.length} aset)
                              </strong>
                            </div>

                            <div className="table-responsive">
                              <table className="table table-sm table-hover mb-0">
                                <thead className="table-dark">
                                  <tr>
                                    <th style={{ width: "60px" }}>No</th>
                                    <th>Bidang</th>
                                    <th>Pengelola</th>
                                    <th>Kabupaten/Kota</th>
                                    <th>Kecamatan</th>
                                    <th>Kelurahan/Desa</th>
                                    <th>Status</th>
                                    <th style={{ width: "120px" }}>
                                      Luas (m²)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kotaAssets.map((asset, index) => (
                                    <tr key={asset.id}>
                                      <td className="text-center">
                                        {index + 1}
                                      </td>
                                      <td>
                                        <span className="badge bg-info">
                                          {asset.bidang || "-"}
                                        </span>
                                      </td>
                                      <td>
                                        <strong>
                                          {asset.pengelola || "-"}
                                        </strong>
                                      </td>
                                      <td>
                                        <strong>
                                          {getKotaName(
                                            asset.provinsi_id,
                                            asset.kota_id
                                          )}
                                        </strong>
                                      </td>
                                      <td>
                                        <strong>
                                          {asset.kecamatan || "-"}
                                        </strong>
                                      </td>
                                      <td>
                                        <strong>
                                          {asset.kelurahan || "-"}
                                        </strong>
                                      </td>
                                      <td>
                                        <span
                                          className={`badge ${
                                            asset.status === "Dimiliki/Dikuasai"
                                              ? "bg-success"
                                              : asset.status ===
                                                "Tidak Dimiliki/Tidak Dikuasai"
                                              ? "bg-danger"
                                              : asset.status === "Dalam Proses"
                                              ? "bg-info"
                                              : "bg-warning text-dark"
                                          }`}
                                        >
                                          {asset.status || "-"}
                                        </span>
                                      </td>
                                      <td className="text-end">
                                        <strong>
                                          {asset.area
                                            ? Number(asset.area).toLocaleString(
                                                "id-ID"
                                              )
                                            : "-"}
                                        </strong>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LaporanYardipPage;
