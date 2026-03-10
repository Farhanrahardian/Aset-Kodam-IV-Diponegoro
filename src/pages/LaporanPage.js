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
import axiosAuth from "../utils/axiosAuth";
import ExcelJS from "exceljs";
import toast from "react-hot-toast";
import "./LaporanPage.css";

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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assetsRes, koremRes] = await Promise.all([
          axiosAuth.get(`${API_URL}/assets`),
          axiosAuth.get(`${API_URL}/korem`),
        ]);

        setAssets(assetsRes.data);
        setKoremList(koremRes.data);

        const allKodims = koremRes.data.flatMap((korem) =>
          korem.kodim.map((k, index) => ({
            id: `${korem.id}-${index}`,
            nama: k,
            korem_id: korem.id,
          }))
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
      filtered = filtered.filter((asset) => asset.korem_id == selectedKorem);
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

    // Apply local search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((asset) => 
        (asset.nama?.toLowerCase().includes(lowerSearch)) ||
        (asset.alamat?.toLowerCase().includes(lowerSearch)) ||
        (asset.kib_kode_barang?.toLowerCase().includes(lowerSearch)) ||
        (asset.kode_barang?.toLowerCase().includes(lowerSearch))
      );
    }

    setFilteredAssets(filtered);
  }, [selectedKorem, selectedKodim, statusFilter, assets, searchTerm]);

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
    setSearchTerm("");
  };

  // Helper function untuk mendapatkan nama korem
  const getKoremName = (koremId) => {
    const korem = koremList.find((k) => k.id == koremId);
    return korem ? korem.nama : "-";
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

  const exportToExcel = async () => {
    if (filteredAssets.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }

    setExporting(true);

    try {
      let title = "TANAH BMN TNI AD BERSERTIFIKAT DAN BELUM SERTIFIKAT";
      let subtitle = "";

      if (selectedKorem && selectedKodim) {
        subtitle = `DI WILAYAH ${selectedKodim.toUpperCase()}`;
      } else if (selectedKorem) {
        subtitle = `DI WILAYAH ${getKoremName(selectedKorem).toUpperCase()}`;
      } else {
        subtitle = "DI WILAYAH SELURUH KOREM";
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Aset BMN");

      worksheet.columns = [
        { width: 8 }, { width: 6 }, { width: 20 }, { width: 20 }, { width: 15 },
        { width: 35 }, { width: 25 }, { width: 25 }, { width: 20 }, { width: 25 },
        { width: 25 }, { width: 8 }, { width: 15 }, { width: 8 }, { width: 15 },
        { width: 8 }, { width: 15 }, { width: 40 },
      ];

      const titleCell = worksheet.getCell("A1");
      titleCell.value = title;
      titleCell.font = { bold: true, size: 12, name: "Arial" };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells("A1:R1");

      const subtitleCell = worksheet.getCell("A2");
      subtitleCell.value = subtitle;
      subtitleCell.font = { bold: true, size: 11, name: "Arial" };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells("A2:R2");

      worksheet.getRow(3).height = 10;

      const headers1 = [
        "NOMOR URUT", "BAG", "NUP", "KIB / KODE BARANG", "NO. REG", "ALAMAT",
        "PERUNTUKAN", "STATUS", "ASAL MILIK", "BUKTI PEMILIKAN", "A.N. PEMILIK SERTIFIKAT",
        "JUMLAH TANAH KESELURUHAN", "", "SUDAH SERTIFIKAT", "", "BELUM SERTIFIKAT", "", "KET",
      ];

      const headerRow1 = worksheet.getRow(4);
      headers1.forEach((header, index) => {
        const cell = headerRow1.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, size: 9, name: "Arial" };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
      });

      const headers2 = [
        "", "", "", "", "", "", "", "", "", "", "", "BID", "LUAS (M2)", "BID", "LUAS (M2)", "BID", "LUAS (M2)", "",
      ];
      const headerRow2 = worksheet.getRow(5);
      headers2.forEach((header, index) => {
        const cell = headerRow2.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, size: 9, name: "Arial" };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
      });

      const mergeRanges = ["A4:A5", "B4:B5", "C4:C5", "D4:D5", "E4:E5", "F4:F5", "G4:G5", "H4:H5", "I4:I5", "J4:J5", "K4:K5", "L4:M4", "N4:O4", "P4:Q4", "R4:R5"];
      mergeRanges.forEach(range => worksheet.mergeCells(range));

      const groupedAssets = groupAssetsByKoremKodim(filteredAssets);
      let currentRow = 6;
      let globalIndex = 1;

      Object.keys(groupedAssets).forEach((koremId) => {
        const koremData = groupedAssets[koremId];
        const koremRow = worksheet.getRow(currentRow);
        koremRow.getCell(1).value = koremData.koremName.toUpperCase();
        koremRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        koremRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
        worksheet.mergeCells(`A${currentRow}:R${currentRow}`);
        currentRow++;

        Object.keys(koremData.kodims).forEach((kodimName) => {
          const kodimAssets = koremData.kodims[kodimName];
          const kodimRow = worksheet.getRow(currentRow);
          kodimRow.getCell(1).value = `${kodimName.toUpperCase()} (${kodimAssets.length} aset)`;
          kodimRow.getCell(1).font = { bold: true };
          kodimRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFD700" } };
          worksheet.mergeCells(`A${currentRow}:R${currentRow}`);
          currentRow++;

          kodimAssets.forEach((asset) => {
            const hasSertifikat = asset.pemilikan_sertifikat === "Ya";
            const rowData = [
              globalIndex, 1, asset.nama || "-", asset.kib_kode_barang || asset.kode_barang || "-",
              asset.nomor_registrasi || asset.no_registrasi || "-", asset.alamat || "-",
              asset.peruntukan || asset.fungsi || "-", asset.status || "-", asset.asal_milik || "-",
              asset.bukti_pemilikan_filename || "-", asset.atas_nama_pemilik_sertifikat || "-",
              1, formatLuas(asset), hasSertifikat ? 1 : 0, parseFloat(asset.sertifikat_luas) || 0,
              !hasSertifikat ? 1 : 0, parseFloat(asset.belum_sertifikat_luas) || 0, asset.keterangan || "-",
            ];
            const dataRow = worksheet.getRow(currentRow);
            rowData.forEach((val, i) => {
              const cell = dataRow.getCell(i + 1);
              cell.value = val;
              if ([1, 2, 12, 14, 16].includes(i + 1)) cell.alignment = { horizontal: "center" };
              else if ([13, 15, 17].includes(i + 1)) {
                cell.alignment = { horizontal: "right" };
                if (typeof val === "number") cell.numFmt = "#,##0";
              }
            });
            currentRow++;
            globalIndex++;
          });
        });
      });

      for (let r = 1; r < currentRow; r++) {
        for (let c = 1; c <= 18; c++) {
          worksheet.getCell(r, c).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_Aset_Tanah_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      toast.success("File Excel berhasil didownload.");
    } catch (error) {
      toast.error(`Gagal mengekspor: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
      <Spinner animation="border" variant="success" />
    </Container>
  );

  const groupedPreview = groupAssetsByKoremKodim(filteredAssets);

  return (
    <Container className="py-4 laporan-container">
      {/* Page Header */}
      <div className="page-header-box shadow-sm">
        <div className="page-header-title">
          <h2><i className="fas fa-file-invoice me-3 text-success"></i>Laporan Aset BMN</h2>
        </div>
        <div className="page-header-actions">
          <Button 
            className="btn-sage-export" 
            onClick={exportToExcel}
            disabled={exporting || filteredAssets.length === 0}
          >
            {exporting ? <Spinner size="sm" className="me-2" /> : <i className="fas fa-file-excel me-2"></i>}
            Ekspor Excel
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        {/* Left Column: Filter */}
        <Col lg={4}>
          <Card className="filter-panel-card border-0 shadow-sm mb-4">
            <Card.Header>
              <h5><i className="fas fa-sliders-h"></i>Filter Data</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Wilayah Korem</Form.Label>
                <Form.Select value={selectedKorem} onChange={handleKoremChange}>
                  <option value="">Semua Korem</option>
                  {koremList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Wilayah Kodim</Form.Label>
                <Form.Select 
                  value={selectedKodim} 
                  onChange={(e) => setSelectedKodim(e.target.value)}
                  disabled={!selectedKorem}
                >
                  <option value="">Semua Kodim</option>
                  {getKodimForSelectedKorem().map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Status Aset</Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="Dimiliki/Dikuasai">Dimiliki/Dikuasai</option>
                  <option value="TIdak Dimiliki/Dikuasai">Tidak Dimiliki/Dikuasai</option>
                </Form.Select>
              </Form.Group>

              <div className="filter-actions">
                <Button className="btn-reset-filter w-100" onClick={handleResetFilter}>
                  <i className="fas fa-undo me-2"></i>Reset
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Mini Stats in Sidebar */}
          <div className="summary-grid-vertical">
            <div className="stats-card mb-3">
              <div className="stats-icon bg-sage-light"><i className="fas fa-boxes"></i></div>
              <div className="stats-info">
                <h3>{filteredAssets.length}</h3>
                <p>Total Aset</p>
              </div>
            </div>
            <div className="stats-card mb-3">
              <div className="stats-icon bg-success-light"><i className="fas fa-check-shield"></i></div>
              <div className="stats-info">
                <h3>{filteredAssets.filter(a => a.status === "Dimiliki/Dikuasai").length}</h3>
                <p>Dimiliki</p>
              </div>
            </div>
          </div>
        </Col>

        {/* Right Column: Data Preview */}
        <Col lg={8}>
          <Card className="preview-section-card border-0 shadow-sm">
            <div className="preview-toolbar">
              <h5 className="mb-0 fw-bold text-dark">
                <i className="fas fa-table me-2 text-success"></i>Pratinjau Data
              </h5>
              <div className="search-box-wrapper">
                <i className="fas fa-search"></i>
                <Form.Control 
                  type="text" 
                  placeholder="Cari nama atau alamat..." 
                  className="search-input-preview"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="preview-scroll-container">
              {Object.keys(groupedPreview).length > 0 ? (
                Object.keys(groupedPreview).map(koremId => {
                  const koremData = groupedPreview[koremId];
                  return (
                    <div key={koremId} className="korem-preview-group">
                      <div className="korem-preview-title">
                        <i className="fas fa-map-marked-alt"></i>
                        {koremData.koremName}
                      </div>
                      
                      {Object.keys(koremData.kodims).map(kodimName => {
                        const kodimAssets = koremData.kodims[kodimName];
                        return (
                          <div key={kodimName} className="kodim-preview-group">
                            <div className="kodim-preview-title">
                              <span><i className="fas fa-building me-2"></i>{kodimName}</span>
                              <span className="badge bg-white text-dark border">{kodimAssets.length} Aset</span>
                            </div>
                            
                            <div className="table-responsive-custom">
                              <table className="table table-striped table-bordered table-hover mb-0">
                                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                  <tr>
                                    <th style={{ width: "50px" }}>No</th>
                                    <th>NUP</th>
                                    <th>Alamat</th>
                                    <th>Status</th>
                                    <th className="text-end">Luas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kodimAssets.map((asset, idx) => (
                                    <tr key={asset.id}>
                                      <td className="text-center text-muted">{idx + 1}</td>
                                      <td className="fw-bold">{asset.nama || "-"}</td>
                                      <td>
                                        <div className="text-truncate" style={{maxWidth: '250px'}} title={asset.alamat}>
                                          {asset.alamat || "-"}
                                        </div>
                                      </td>
                                      <td>
                                        <span className={`badge ${asset.status === "Dimiliki/Dikuasai" ? "bg-success" : "bg-danger"}`}>
                                          {asset.status || "-"}
                                        </span>
                                      </td>
                                      <td className="text-end fw-bold">
                                        {formatLuas(asset).toLocaleString("id-ID")} m²
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
                })
              ) : (
                <div className="empty-preview">
                  <i className="fas fa-search-minus"></i>
                  <h4>Data Tidak Ditemukan</h4>
                  <p>Coba sesuaikan filter atau kata kunci pencarian Anda</p>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
export default LaporanPage;
