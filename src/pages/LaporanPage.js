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

const LaporanPage = () => {
  const [assets, setAssets] = useState([]);
  const [koremList, setKoremList] = useState([]);
  const [allKodimList, setAllKodimList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedKorem, setSelectedKorem] = useState("");
  const [selectedKodim, setSelectedKodim] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filteredAssets, setFilteredAssets] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assetsRes, koremRes] = await Promise.all([
          axios.get(`${API_URL}/assets`),
          axios.get(`${API_URL}/korem`),
        ]);

        setAssets(assetsRes.data);
        setKoremList(koremRes.data);

        const allKodims = koremRes.data.flatMap((korem) =>
          korem.kodim.map((k) => ({ id: k, nama: k, korem_id: korem.id }))
        );
        setAllKodimList(allKodims);
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

    if (selectedKorem) {
      const koremData = koremList.find((k) => k.id == selectedKorem);
      if (koremData) {
        filtered = filtered.filter((asset) => asset.korem_id == selectedKorem);
      }
    }

    if (selectedKodim) {
      filtered = filtered.filter((asset) => {
        const assetKodim = String(asset.kodim || "").trim();
        const filterKodim = String(selectedKodim || "").trim();
        return assetKodim === filterKodim;
      });
    }

    if (statusFilter) {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    setFilteredAssets(filtered);
  }, [selectedKorem, selectedKodim, statusFilter, assets, koremList]);

  // Get kodim list based on selected korem
  const getKodimForSelectedKorem = () => {
    if (!selectedKorem) return allKodimList;
    const koremData = koremList.find((k) => k.id == selectedKorem);
    if (!koremData) return [];
    return koremData.kodim.map((k) => ({ id: k, nama: k }));
  };

  const handleKoremChange = (e) => {
    setSelectedKorem(e.target.value);
    setSelectedKodim(""); // Reset kodim when korem changes
  };

  const handleResetFilter = () => {
    setSelectedKorem("");
    setSelectedKodim("");
    setStatusFilter("");
  };

  // Helper function untuk mendapatkan nama korem
  const getKoremName = (koremId) => {
    const korem = koremList.find((k) => k.id == koremId);
    return korem ? korem.nama : "-";
  };

  // Helper function untuk mendapatkan nama kodim
  const getKodimName = (asset) => {
    if (!asset.kodim) return "-";
    const kodim = allKodimList.find((k) => k.nama === asset.kodim);
    return kodim ? kodim.nama : asset.kodim;
  };

  // Helper function untuk format luas
  const formatLuas = (asset) => {
    const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
    const belumSertifikatLuas = parseFloat(asset.belum_sertifikat_luas) || 0;
    const petaLuas = parseFloat(asset.luas) || 0;

    if (sertifikatLuas > 0) return sertifikatLuas;
    if (belumSertifikatLuas > 0) return belumSertifikatLuas;
    return petaLuas;
  };

  // Helper function untuk group assets berdasarkan Korem dan Kodim
  const groupAssetsByKoremKodim = (assets) => {
    const grouped = {};

    assets.forEach((asset) => {
      const koremId = asset.korem_id;
      const kodimName = asset.kodim || "Tidak Ada Kodim";

      if (!grouped[koremId]) {
        grouped[koremId] = {
          koremName: getKoremName(koremId),
          kodims: {},
        };
      }

      if (!grouped[koremId].kodims[kodimName]) {
        grouped[koremId].kodims[kodimName] = [];
      }

      grouped[koremId].kodims[kodimName].push(asset);
    });

    return grouped;
  };

  // Function untuk export ke XLSX menggunakan ExcelJS dengan grouping
  const exportToExcel = async () => {
    if (filteredAssets.length === 0) {
      alert("Tidak ada data untuk diekspor!");
      return;
    }

    setExporting(true);

    try {
      // Siapkan judul berdasarkan filter
      let title = "TANAH BMN TNI AD BERSERTIFIKAT DAN BELUM SERTIFIKAT";
      let subtitle = "";

      if (selectedKorem && selectedKodim) {
        subtitle = `DI WILAYAH ${selectedKodim.toUpperCase()}`;
      } else if (selectedKorem) {
        subtitle = `DI WILAYAH ${getKoremName(selectedKorem).toUpperCase()}`;
      } else {
        subtitle = "DI WILAYAH SELURUH KOREM";
      }

      // Buat workbook baru
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Aset Tanah");

      // Set column widths
      worksheet.columns = [
        { width: 8 }, // A - Nomor Urut
        { width: 6 }, // B - BAG
        { width: 20 }, // C - NUP
        { width: 20 }, // D - KIB/Kode Barang
        { width: 15 }, // E - No Reg
        { width: 35 }, // F - Alamat
        { width: 25 }, // G - Peruntukan
        { width: 25 }, // H - Status
        { width: 20 }, // I - Asal Milik
        { width: 25 }, // J - Bukti Pemilikan
        { width: 25 }, // K - A.N. Pemilik Sertifikat
        { width: 8 }, // L - BID Total
        { width: 15 }, // M - Luas Total
        { width: 8 }, // N - BID Sertifikat
        { width: 15 }, // O - Luas Sertifikat
        { width: 8 }, // P - BID Belum
        { width: 15 }, // Q - Luas Belum
        { width: 40 }, // R - Keterangan
      ];

      // Tambahkan title (Row 1)
      const titleCell = worksheet.getCell("A1");
      titleCell.value = title;
      titleCell.font = {
        bold: true,
        size: 12,
        name: "Arial",
      };
      titleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" },
      };

      // Merge title across all columns
      worksheet.mergeCells("A1:R1");

      // Tambahkan subtitle (Row 2)
      const subtitleCell = worksheet.getCell("A2");
      subtitleCell.value = subtitle;
      subtitleCell.font = {
        bold: true,
        size: 11,
        name: "Arial",
      };
      subtitleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      subtitleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };

      // Merge subtitle across all columns
      worksheet.mergeCells("A2:R2");

      // Row kosong (Row 3)
      worksheet.getRow(3).height = 10;

      // Header Row 1 (Row 4)
      const headers1 = [
        "NOMOR\nURUT",
        "BAG",
        "NUP",
        "KIB / KODE\nBARANG",
        "NO. REG",
        "ALAMAT",
        "PERUNTUKAN",
        "STATUS",
        "ASAL MILIK",
        "BUKTI PEMILIKAN",
        "A.N. PEMILIK\nSERTIFIKAT",
        "JUMLAH TANAH\nKESELURUHAN",
        "",
        "SUDAH SERTIFIKAT",
        "",
        "BELUM SERTIFIKAT",
        "",
        "KET",
      ];

      const headerRow1 = worksheet.getRow(4);
      headers1.forEach((header, index) => {
        const cell = headerRow1.getCell(index + 1);
        cell.value = header;
        cell.font = {
          bold: true,
          size: 9,
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
      headerRow1.height = 35;

      // Header Row 2 (Row 5)
      const headers2 = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "BID",
        "LUAS (M2)",
        "BID",
        "LUAS (M2)",
        "BID",
        "LUAS (M2)",
        "",
      ];

      const headerRow2 = worksheet.getRow(5);
      headers2.forEach((header, index) => {
        const cell = headerRow2.getCell(index + 1);
        cell.value = header;
        cell.font = {
          bold: true,
          size: 9,
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
      headerRow2.height = 25;

      // Merge header cells
      const mergeRanges = [
        "A4:A5",
        "B4:B5",
        "C4:C5",
        "D4:D5",
        "E4:E5",
        "F4:F5",
        "G4:G5",
        "H4:H5",
        "I4:I5",
        "J4:J5",
        "K4:K5",
        "L4:M4",
        "N4:O4",
        "P4:Q4",
        "R4:R5",
      ];

      mergeRanges.forEach((range) => {
        worksheet.mergeCells(range);
      });

      // Group assets berdasarkan Korem dan Kodim
      const groupedAssets = groupAssetsByKoremKodim(filteredAssets);

      let currentRow = 6;
      let globalIndex = 1;

      // Loop through each Korem
      Object.keys(groupedAssets).forEach((koremId) => {
        const koremData = groupedAssets[koremId];

        // Tambahkan header KOREM dengan background biru
        const koremHeaderRow = worksheet.getRow(currentRow);
        const koremHeaderCell = koremHeaderRow.getCell(1);
        koremHeaderCell.value = koremData.koremName.toUpperCase();
        koremHeaderCell.font = {
          bold: true,
          size: 11,
          name: "Arial",
          color: { argb: "FFFFFFFF" }, // White text
        };
        koremHeaderCell.alignment = {
          horizontal: "left",
          vertical: "middle",
        };
        koremHeaderCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" }, // Blue background
        };

        // Merge korem header across all columns
        worksheet.mergeCells(`A${currentRow}:R${currentRow}`);
        koremHeaderRow.height = 25;
        currentRow++;

        // Loop through each Kodim in this Korem
        Object.keys(koremData.kodims).forEach((kodimName) => {
          const kodimAssets = koremData.kodims[kodimName];

          // Tambahkan header Kodim dengan background kuning
          const kodimHeaderRow = worksheet.getRow(currentRow);
          const kodimHeaderCell = kodimHeaderRow.getCell(1);
          kodimHeaderCell.value = `${kodimName.toUpperCase()} (${
            kodimAssets.length
          } aset)`;
          kodimHeaderCell.font = {
            bold: true,
            size: 10,
            name: "Arial",
          };
          kodimHeaderCell.alignment = {
            horizontal: "left",
            vertical: "middle",
          };
          kodimHeaderCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFD700" }, // Gold/Yellow color
          };

          // Merge kodim header across all columns
          worksheet.mergeCells(`A${currentRow}:R${currentRow}`);
          kodimHeaderRow.height = 20;
          currentRow++;

          // Tambahkan data aset untuk kodim ini
          kodimAssets.forEach((asset) => {
            const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
            const belumSertifikatLuas =
              parseFloat(asset.belum_sertifikat_luas) || 0;
            const hasSertifikat = asset.pemilikan_sertifikat === "Ya";

            const rowData = [
              globalIndex, // A - Nomor urut global
              1, // B - BAG
              asset.nama || "-", // C - NUP
              asset.kib_kode_barang || asset.kode_barang || "-", // D - KIB/Kode Barang
              asset.nomor_registrasi || asset.no_registrasi || "-", // E - No Reg
              asset.alamat || "-", // F - Alamat
              asset.peruntukan || asset.fungsi || "-", // G - Peruntukan
              asset.status || "-", // H - Status
              asset.asal_milik || "-", // I - Asal Milik
              asset.bukti_pemilikan_filename ||
                asset.bukti_kepemilikan_filename ||
                "-", // J - Bukti Pemilikan
              asset.atas_nama_pemilik_sertifikat || "-", // K - A.N. Pemilik Sertifikat
              1, // L - BID Keseluruhan
              formatLuas(asset), // M - Luas Keseluruhan
              hasSertifikat ? 1 : 0, // N - BID Sertifikat
              sertifikatLuas, // O - Luas Sertifikat
              !hasSertifikat ? 1 : 0, // P - BID Belum Sertifikat
              belumSertifikatLuas, // Q - Luas Belum Sertifikat
              asset.keterangan || asset.keterangan_bukti_pemilikan || "-", // R - Keterangan
            ];

            const dataRow = worksheet.getRow(currentRow);
            rowData.forEach((data, colIndex) => {
              const cell = dataRow.getCell(colIndex + 1);
              cell.value = data;
              cell.font = {
                size: 9,
                name: "Arial",
              };

              // Set alignment based on column type
              if ([1, 2, 12, 14, 16].includes(colIndex + 1)) {
                // Number columns (A, B, L, N, P) - center
                cell.alignment = { horizontal: "center", vertical: "middle" };
              } else if ([13, 15, 17].includes(colIndex + 1)) {
                // Area columns (M, O, Q) - right
                cell.alignment = { horizontal: "right", vertical: "middle" };
                if (typeof data === "number" && data > 0) {
                  cell.numFmt = "#,##0";
                }
              } else {
                // Text columns - left
                cell.alignment = {
                  horizontal: "left",
                  vertical: "middle",
                  wrapText: true,
                };
              }
            });

            dataRow.height = 20;
            currentRow++;
            globalIndex++;
          });

          // Tambahkan row kosong setelah setiap kodim untuk pemisah
          const separatorRow = worksheet.getRow(currentRow);
          separatorRow.height = 10;
          currentRow++;
        });

        // Tambahkan row kosong yang lebih besar setelah setiap korem untuk pemisah
        const koremSeparatorRow = worksheet.getRow(currentRow);
        koremSeparatorRow.height = 15;
        currentRow++;
      });

      // Apply border ke semua cells yang berisi data
      for (let row = 1; row < currentRow; row++) {
        for (let col = 1; col <= 18; col++) {
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
      const koremName = selectedKorem
        ? getKoremName(selectedKorem)
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_")
        : "Semua";
      const fileName = `Laporan_Aset_Tanah_${koremName}_${
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

  // Helper function untuk group assets for preview
  const getGroupedAssetsForPreview = () => {
    return groupAssetsByKoremKodim(filteredAssets);
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
        <h2 className="text-primary">
          <i className="fas fa-file-excel me-2"></i>
          Cetak Laporan Data Aset Tanah
        </h2>
        <p className="text-muted">
          Generate laporan aset tanah dalam format Excel yang terorganisir per
          Korem dan Kodim
        </p>
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
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <i className="fas fa-map-marked-alt me-2"></i>
                  Wilayah Korem
                </Form.Label>
                <Form.Select
                  value={selectedKorem}
                  onChange={handleKoremChange}
                  className="form-select-lg"
                >
                  <option value="">Semua Korem</option>
                  {koremList.map((korem) => (
                    <option key={korem.id} value={korem.id}>
                      {korem.nama}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <i className="fas fa-building me-2"></i>
                  Wilayah Kodim
                </Form.Label>
                <Form.Select
                  value={selectedKodim}
                  onChange={(e) => setSelectedKodim(e.target.value)}
                  className="form-select-lg"
                  disabled={!selectedKorem && koremList.length > 0}
                >
                  <option value="">Semua Kodim</option>
                  {getKodimForSelectedKorem().map((kodim) => (
                    <option key={kodim.id} value={kodim.nama}>
                      {kodim.nama}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <i className="fas fa-flag me-2"></i>
                  Status Kepemilikan
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
              {/* Summary Cards */}
              <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                  <Card className="bg-primary text-white h-100">
                    <Card.Body className="text-center">
                      <i className="fas fa-database fa-2x mb-2"></i>
                      <h3 className="mb-1">{filteredAssets.length}</h3>
                      <small>Total Aset Tanah</small>
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
                      <small>Status Lain-lain</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Data Preview dengan Grouping */}
              <div
                className="border rounded"
                style={{ maxHeight: "600px", overflowY: "auto" }}
              >
                {Object.keys(getGroupedAssetsForPreview()).map((koremId) => {
                  const koremData = getGroupedAssetsForPreview()[koremId];
                  return (
                    <div key={koremId} className="mb-4">
                      {/* Header Korem dengan background biru */}
                      <div
                        className="p-3"
                        style={{ backgroundColor: "#4472C4", color: "white" }}
                      >
                        <h5 className="mb-0 fw-bold">
                          <i className="fas fa-map-marked-alt me-2"></i>
                          {koremData.koremName}
                        </h5>
                      </div>

                      {Object.keys(koremData.kodims).map((kodimName) => {
                        const kodimAssets = koremData.kodims[kodimName];
                        return (
                          <div key={kodimName} className="ms-3 mb-3">
                            <div className="bg-warning bg-opacity-25 p-2 border-start border-warning border-3">
                              <strong className="text-dark">
                                <i className="fas fa-building me-2"></i>
                                {kodimName} ({kodimAssets.length} aset)
                              </strong>
                            </div>

                            <div className="table-responsive">
                              <table className="table table-sm table-hover mb-0">
                                <thead className="table-dark">
                                  <tr>
                                    <th style={{ width: "60px" }}>No</th>
                                    <th>NUP</th>
                                    <th>Alamat</th>
                                    <th>Status</th>
                                    <th style={{ width: "120px" }}>
                                      Luas (m²)
                                    </th>
                                    <th style={{ width: "100px" }}>
                                      Sertifikat
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kodimAssets.map((asset, index) => (
                                    <tr key={asset.id}>
                                      <td className="text-center">
                                        {index + 1}
                                      </td>
                                      <td>
                                        <strong>{asset.nama || "-"}</strong>
                                      </td>
                                      <td>
                                        <span
                                          className="text-truncate d-inline-block"
                                          style={{ maxWidth: "200px" }}
                                        >
                                          {asset.alamat || "-"}
                                        </span>
                                      </td>
                                      <td>
                                        <span
                                          className={`badge ${
                                            asset.status === "Dimiliki/Dikuasai"
                                              ? "bg-success"
                                              : asset.status ===
                                                "Tidak Dimiliki/Tidak Dikuasai"
                                              ? "bg-danger"
                                              : "bg-warning text-dark"
                                          }`}
                                        >
                                          {asset.status || "-"}
                                        </span>
                                      </td>
                                      <td className="text-end">
                                        <strong>
                                          {formatLuas(asset).toLocaleString(
                                            "id-ID"
                                          )}
                                        </strong>
                                      </td>
                                      <td className="text-center">
                                        {asset.pemilikan_sertifikat === "Ya" ? (
                                          <span className="badge bg-success">
                                            <i className="fas fa-check me-1"></i>
                                            Ada
                                          </span>
                                        ) : (
                                          <span className="badge bg-danger">
                                            <i className="fas fa-times me-1"></i>
                                            Belum
                                          </span>
                                        )}
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

export default LaporanPage;
