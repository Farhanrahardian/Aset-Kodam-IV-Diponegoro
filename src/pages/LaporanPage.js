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

  // Function untuk export ke XLSX menggunakan ExcelJS
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
        { width: 15 }, // G - Peruntukan
        { width: 18 }, // H - Status
        { width: 15 }, // I - Asal Milik
        { width: 25 }, // J - Bukti Pemilikan
        { width: 25 }, // K - A.N. Pemilik Sertifikat
        { width: 8 }, // L - BID Total
        { width: 15 }, // M - Luas Total
        { width: 8 }, // N - BID Sertifikat
        { width: 15 }, // O - Luas Sertifikat
        { width: 8 }, // P - BID Belum
        { width: 15 }, // Q - Luas Belum
        { width: 20 }, // R - Keterangan
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
      titleCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
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
      subtitleCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
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
        "KETERANGAN",
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
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
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
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
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

      // Tambahkan data aset (mulai dari Row 6)
      let currentRow = 6;
      filteredAssets.forEach((asset, index) => {
        const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
        const belumSertifikatLuas =
          parseFloat(asset.belum_sertifikat_luas) || 0;
        const hasSertifikat = asset.pemilikan_sertifikat === "Ya";

        const rowData = [
          index + 1, // A - Nomor urut
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
            cell.numFmt = "#,##0";
          } else {
            // Text columns - left
            cell.alignment = { horizontal: "left", vertical: "middle" };
          }

          // Add borders
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        dataRow.height = 20;
        currentRow++;
      });

      // Apply border ke semua cells yang ada content
      const lastRow = currentRow - 1;
      const range = `A1:R${lastRow}`;

      for (let row = 1; row <= lastRow; row++) {
        for (let col = 1; col <= 18; col++) {
          const cell = worksheet.getCell(row, col);
          if (!cell.border) {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }
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

      alert("File Excel (.xlsx) berhasil didownload.");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert(`Gagal mengekspor data ke Excel: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Spinner animation="border" variant="primary" />;

  return (
    <Container>
      <h2>Cetak Laporan Data Aset Tanah</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">Filter Laporan</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <strong>Wilayah Korem</strong>
                </Form.Label>
                <Form.Select value={selectedKorem} onChange={handleKoremChange}>
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
              <Form.Group className="mb-3">
                <Form.Label>
                  <strong>Wilayah Kodim</strong>
                </Form.Label>
                <Form.Select
                  value={selectedKodim}
                  onChange={(e) => setSelectedKodim(e.target.value)}
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
              <Form.Group className="mb-3">
                <Form.Label>
                  <strong>Status</strong>
                </Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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

          <Row>
            <Col>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={handleResetFilter}>
                  Reset Filter
                </Button>
                <Button
                  variant="success"
                  onClick={exportToExcel}
                  disabled={exporting || filteredAssets.length === 0}
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
                      Mengekspor...
                    </>
                  ) : (
                    "Cetak Laporan"
                  )}
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="bg-info text-white">
          <h5 className="mb-0">Preview Data yang akan diekspor</h5>
        </Card.Header>
        <Card.Body>
          {filteredAssets.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-muted">
                <i className="fas fa-folder-open fa-3x mb-3"></i>
                <h5>Tidak ada data untuk ditampilkan</h5>
                <p>Sesuaikan filter untuk menampilkan data yang diinginkan.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <Row className="text-center">
                  <Col md={3}>
                    <div className="border-end">
                      <h5 className="text-primary">{filteredAssets.length}</h5>
                      <small className="text-muted">Total Aset</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="border-end">
                      <h5 className="text-success">
                        {
                          filteredAssets.filter(
                            (a) => a.status === "Dimiliki/Dikuasai"
                          ).length
                        }
                      </h5>
                      <small className="text-muted">Dimiliki/Dikuasai</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="border-end">
                      <h5 className="text-danger">
                        {
                          filteredAssets.filter(
                            (a) => a.status === "Tidak Dimiliki/Tidak Dikuasai"
                          ).length
                        }
                      </h5>
                      <small className="text-muted">
                        Tidak Dimiliki/Tidak Dikuasai
                      </small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <h5 className="text-warning">
                      {
                        filteredAssets.filter((a) => a.status === "Lain-lain")
                          .length
                      }
                    </h5>
                    <small className="text-muted">Lain-lain</small>
                  </Col>
                </Row>
              </div>

              <div
                className="table-responsive"
                style={{ maxHeight: "400px", overflowY: "auto" }}
              >
                <table className="table table-bordered table-sm">
                  <thead className="table-dark sticky-top">
                    <tr>
                      <th>No</th>
                      <th>NUP</th>
                      <th>Korem</th>
                      <th>Kodim</th>
                      <th>Alamat</th>
                      <th>Status</th>
                      <th>Luas (m²)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset, index) => (
                      <tr key={asset.id}>
                        <td>{index + 1}</td>
                        <td>{asset.nama || "-"}</td>
                        <td>{getKoremName(asset.korem_id)}</td>
                        <td>{getKodimName(asset)}</td>
                        <td>
                          {asset.alamat
                            ? asset.alamat.length > 30
                              ? asset.alamat.substring(0, 30) + "..."
                              : asset.alamat
                            : "-"}
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
                        <td>{formatLuas(asset).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LaporanPage;
