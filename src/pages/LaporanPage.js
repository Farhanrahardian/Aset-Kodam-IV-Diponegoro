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
        setError("Gagal memuat data dari server. Pastikan server API berjalan.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = assets;
    if (selectedKorem) filtered = filtered.filter((a) => a.korem_id == selectedKorem);
    if (selectedKodim) {
      filtered = filtered.filter((a) =>
        String(a.kodim || "").trim() === String(selectedKodim || "").trim()
      );
    }
    if (statusFilter) filtered = filtered.filter((a) => a.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.nama?.toLowerCase().includes(q) ||
          a.alamat?.toLowerCase().includes(q) ||
          a.kib_kode_barang?.toLowerCase().includes(q) ||
          a.kode_barang?.toLowerCase().includes(q)
      );
    }
    setFilteredAssets(filtered);
  }, [selectedKorem, selectedKodim, statusFilter, assets, searchTerm]);

  const getKodimForSelectedKorem = () => {
    if (!selectedKorem) return allKodimList;
    const koremData = koremList.find((k) => k.id == selectedKorem);
    if (!koremData) return [];
    return koremData.kodim.map((k) => ({ id: k, nama: k }));
  };

  const handleKoremChange = (e) => {
    setSelectedKorem(e.target.value);
    setSelectedKodim("");
  };

  const handleResetFilter = () => {
    setSelectedKorem("");
    setSelectedKodim("");
    setStatusFilter("");
    setSearchTerm("");
  };

  const getKoremName = (koremId) => {
    const korem = koremList.find((k) => k.id == koremId);
    return korem ? korem.nama : "-";
  };

  const formatLuas = (asset) => {
    const s = parseFloat(asset.sertifikat_luas) || 0;
    const b = parseFloat(asset.belum_sertifikat_luas) || 0;
    const p = parseFloat(asset.luas) || 0;
    if (s > 0) return s;
    if (b > 0) return b;
    return p;
  };

  const groupAssetsByKoremKodim = (assets) => {
    const grouped = {};
    assets.forEach((asset) => {
      const koremId = asset.korem_id;
      const kodimName = asset.kodim || "Tidak Ada Kodim";
      if (!grouped[koremId]) grouped[koremId] = { koremName: getKoremName(koremId), kodims: {} };
      if (!grouped[koremId].kodims[kodimName]) grouped[koremId].kodims[kodimName] = [];
      grouped[koremId].kodims[kodimName].push(asset);
    });
    return grouped;
  };

  // ─── WARNA NETRAL ────────────────────────────────────────
  const COLOR = {
    headerTitle:   "FF2E3B23", // hijau tua gelap  → judul & sub-judul
    headerKorem:   "FF4A4A4A", // abu-abu gelap     → baris korem
    headerKodim:   "FFD9D9D9", // abu-abu muda      → baris kodim
    headerCol:     "FFE8E8E8", // abu-abu terang    → header kolom
    fontWhite:     "FFFFFFFF",
    fontDark:      "FF1A1A1A",
    fontGray:      "FF444444",
    borderThin:    "FFB0B0B0",
  };

  // Helper: terapkan border tipis seragam pada cell
  const applyBorder = (cell, color = COLOR.borderThin) => {
    const s = { style: "thin", color: { argb: color } };
    cell.border = { top: s, left: s, bottom: s, right: s };
  };

  // Helper: style header kolom
  const styleHeaderCell = (cell, value, opts = {}) => {
    cell.value = value;
    cell.font = { bold: true, size: opts.size || 9, name: "Arial", color: { argb: opts.fontColor || COLOR.fontDark } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bgColor || COLOR.headerCol } };
    applyBorder(cell);
  };

  const exportToExcel = async () => {
    if (filteredAssets.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }
    setExporting(true);

    try {
      let subtitle = "DI WILAYAH SELURUH KOREM";
      if (selectedKorem && selectedKodim) subtitle = `DI WILAYAH ${selectedKodim.toUpperCase()}`;
      else if (selectedKorem) subtitle = `DI WILAYAH ${getKoremName(selectedKorem).toUpperCase()}`;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistem Aset BMN";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Laporan Aset BMN", {
        pageSetup: {
          paperSize: 9,         // A4
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        },
      });

      // ── Lebar kolom ──────────────────────────────────────
      ws.columns = [
        { width: 6  }, // A  No
        { width: 5  }, // B  Bag
        { width: 22 }, // C  NUP
        { width: 22 }, // D  KIB/Kode Barang
        { width: 14 }, // E  No. Reg
        { width: 32 }, // F  Alamat
        { width: 22 }, // G  Peruntukan
        { width: 22 }, // H  Status
        { width: 18 }, // I  Asal Milik
        { width: 22 }, // J  Bukti Pemilikan
        { width: 22 }, // K  A.N. Pemilik
        { width: 7  }, // L  Jml BID
        { width: 14 }, // M  Jml Luas
        { width: 7  }, // N  Sert BID
        { width: 14 }, // O  Sert Luas
        { width: 7  }, // P  Blm BID
        { width: 14 }, // Q  Blm Luas
        { width: 36 }, // R  Sejarah
      ];

      // ── Baris 1: Judul ───────────────────────────────────
      ws.getRow(1).height = 22;
      const titleCell = ws.getCell("A1");
      titleCell.value = "TANAH BMN TNI AD BERSERTIFIKAT DAN BELUM SERTIFIKAT";
      titleCell.font = { bold: true, size: 13, name: "Arial", color: { argb: COLOR.fontDark } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells("A1:R1");

      // ── Baris 2: Sub-judul ───────────────────────────────
      ws.getRow(2).height = 18;
      const subCell = ws.getCell("A2");
      subCell.value = subtitle;
      subCell.font = { bold: true, size: 11, name: "Arial", color: { argb: COLOR.fontGray } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells("A2:R2");

      // ── Baris 3: Tanggal cetak ───────────────────────────
      ws.getRow(3).height = 14;
      const dateCell = ws.getCell("A3");
      const now = new Date();
      dateCell.value = `Dicetak: ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`;
      dateCell.font = { italic: true, size: 8, name: "Arial", color: { argb: "FF888888" } };
      dateCell.alignment = { horizontal: "right", vertical: "middle" };
      ws.mergeCells("A3:R3");

      // ── Baris 4: Spasi ───────────────────────────────────
      ws.getRow(4).height = 6;

      // ── Baris 5–6: Header kolom ──────────────────────────
      ws.getRow(5).height = 32;
      ws.getRow(6).height = 20;

      const headers1 = [
        "NO.", "BAG", "NUP", "KIB / KODE BARANG", "NO. REG", "ALAMAT",
        "PERUNTUKAN", "STATUS", "ASAL MILIK", "BUKTI PEMILIKAN",
        "A.N. PEMILIK\nSERTIFIKAT",
        "JUMLAH TANAH\nKESELURUHAN", "",
        "SUDAH\nSERTIFIKAT", "",
        "BELUM\nSERTIFIKAT", "",
        "SEJARAH",
      ];
      const headers2 = [
        "", "", "", "", "", "", "", "", "", "", "",
        "BID", "LUAS (M²)",
        "BID", "LUAS (M²)",
        "BID", "LUAS (M²)",
        "",
      ];

      headers1.forEach((h, i) => styleHeaderCell(ws.getRow(5).getCell(i + 1), h));
      headers2.forEach((h, i) => styleHeaderCell(ws.getRow(6).getCell(i + 1), h));

      // Merge header: kolom single-row
      ["A5:A6","B5:B6","C5:C6","D5:D6","E5:E6","F5:F6",
       "G5:G6","H5:H6","I5:I6","J5:J6","K5:K6",
       "L5:M5","N5:O5","P5:Q5","R5:R6"
      ].forEach((r) => ws.mergeCells(r));

      // ── Data ─────────────────────────────────────────────
      const groupedAssets = groupAssetsByKoremKodim(filteredAssets);
      let currentRow = 7;
      let globalIndex = 1;

      const TOTAL_COLS = 18;

      Object.keys(groupedAssets).forEach((koremId) => {
        const koremData = groupedAssets[koremId];

        // Baris Korem — abu-abu gelap, teks putih
        ws.getRow(currentRow).height = 18;
        const koremCell = ws.getRow(currentRow).getCell(1);
        koremCell.value = `  ${koremData.koremName.toUpperCase()}`;
        koremCell.font = { bold: true, size: 10, name: "Arial", color: { argb: COLOR.fontWhite } };
        koremCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerKorem } };
        koremCell.alignment = { vertical: "middle" };
        ws.mergeCells(`A${currentRow}:R${currentRow}`);
        applyBorder(koremCell, "FF6A6A6A");
        currentRow++;

        Object.keys(koremData.kodims).forEach((kodimName) => {
          const kodimAssets = koremData.kodims[kodimName];

          // Baris Kodim — abu-abu muda, teks gelap
          ws.getRow(currentRow).height = 16;
          const kodimCell = ws.getRow(currentRow).getCell(1);
          kodimCell.value = `      ${kodimName.toUpperCase()}  (${kodimAssets.length} aset)`;
          kodimCell.font = { bold: true, size: 9, name: "Arial", color: { argb: COLOR.fontDark } };
          kodimCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerKodim } };
          kodimCell.alignment = { vertical: "middle" };
          ws.mergeCells(`A${currentRow}:R${currentRow}`);
          applyBorder(kodimCell, COLOR.borderThin);
          currentRow++;

          kodimAssets.forEach((asset) => {
            const hasSertifikat = asset.pemilikan_sertifikat === "Ya";
            ws.getRow(currentRow).height = 15;

            const rowData = [
              globalIndex,
              1,
              asset.nama || "-",
              asset.kib_kode_barang || asset.kode_barang || "-",
              asset.nomor_registrasi || asset.no_registrasi || "-",
              asset.alamat || "-",
              asset.peruntukan || asset.fungsi || "-",
              asset.status || "-",
              asset.asal_milik || "-",
              asset.bukti_pemilikan_filename || "-",
              asset.atas_nama_pemilik_sertifikat || "-",
              1,
              formatLuas(asset),
              hasSertifikat ? 1 : 0,
              parseFloat(asset.sertifikat_luas) || 0,
              !hasSertifikat ? 1 : 0,
              parseFloat(asset.belum_sertifikat_luas) || 0,
              asset.sejarah || "-",
            ];

            const dataRow = ws.getRow(currentRow);
            rowData.forEach((val, i) => {
              const cell = dataRow.getCell(i + 1);
              cell.value = val;
              cell.font = { size: 9, name: "Arial", color: { argb: COLOR.fontDark } };
              cell.alignment = { vertical: "middle", wrapText: i === 5 || i === 17 };

              // Alignment khusus
              if ([0, 1, 11, 13, 15].includes(i)) {
                cell.alignment = { ...cell.alignment, horizontal: "center" };
              } else if ([12, 14, 16].includes(i)) {
                cell.alignment = { ...cell.alignment, horizontal: "right" };
                if (typeof val === "number" && val > 0) cell.numFmt = "#,##0.##";
              }

              // Zebra stripe — baris genap sedikit abu terang
              if (globalIndex % 2 === 0) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F7" } };
              }

              applyBorder(cell);
            });

            currentRow++;
            globalIndex++;
          });

          // Baris total per Kodim
          ws.getRow(currentRow).height = 14;
          const totalCell = ws.getRow(currentRow).getCell(1);
          const totalLuas = kodimAssets.reduce((sum, a) => sum + formatLuas(a), 0);
          totalCell.value = `Total ${kodimName}: ${kodimAssets.length} aset`;
          totalCell.font = { bold: true, size: 9, name: "Arial", color: { argb: COLOR.fontGray } };
          totalCell.alignment = { horizontal: "right", vertical: "middle" };
          totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
          ws.mergeCells(`A${currentRow}:L${currentRow}`);

          const totalLuasCell = ws.getRow(currentRow).getCell(13);
          totalLuasCell.value = totalLuas;
          totalLuasCell.numFmt = "#,##0.##";
          totalLuasCell.font = { bold: true, size: 9, name: "Arial" };
          totalLuasCell.alignment = { horizontal: "right", vertical: "middle" };
          totalLuasCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
          ws.mergeCells(`M${currentRow}:R${currentRow}`);

          for (let c = 1; c <= TOTAL_COLS; c++) applyBorder(ws.getRow(currentRow).getCell(c));
          currentRow++;
        });

        // Spasi antar Korem
        ws.getRow(currentRow).height = 6;
        currentRow++;
      });

      // ── Print area & freeze panes ────────────────────────
      ws.views = [{ state: "frozen", xSplit: 0, ySplit: 6, activeCell: "A7" }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_Aset_BMN_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      toast.success("File Excel berhasil didownload.");
    } catch (err) {
      toast.error(`Gagal mengekspor: ${err.message}`);
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (loading)
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "60vh" }}
      >
        <Spinner animation="border" variant="success" />
      </Container>
    );

  const groupedPreview = groupAssetsByKoremKodim(filteredAssets);

  return (
    <Container className="py-4 laporan-container">
      <div className="page-header-box shadow-sm">
        <div className="page-header-title">
          <h2>
            <i className="fas fa-file-invoice me-3 text-success"></i>Laporan Aset BMN
          </h2>
        </div>
        <div className="page-header-actions">
          <Button
            className="btn-sage-export"
            onClick={exportToExcel}
            disabled={exporting || filteredAssets.length === 0}
          >
            {exporting ? (
              <Spinner size="sm" className="me-2" />
            ) : (
              <i className="fas fa-file-excel me-2"></i>
            )}
            Ekspor Excel
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col lg={4}>
          <Card className="filter-panel-card border-0 shadow-sm mb-4">
            <Card.Header>
              <h5>
                <i className="fas fa-sliders-h"></i>Filter Data
              </h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Wilayah Korem</Form.Label>
                <Form.Select value={selectedKorem} onChange={handleKoremChange}>
                  <option value="">Semua Korem</option>
                  {koremList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
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
                  {getKodimForSelectedKorem().map((k) => (
                    <option key={k.id} value={k.nama}>
                      {k.nama}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Status Aset</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
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

          <div className="summary-grid-vertical">
            <div className="stats-card mb-3">
              <div className="stats-icon bg-sage-light">
                <i className="fas fa-boxes"></i>
              </div>
              <div className="stats-info">
                <h3>{filteredAssets.length}</h3>
                <p>Total Aset</p>
              </div>
            </div>
            <div className="stats-card mb-3">
              <div className="stats-icon bg-success-light">
                <i className="fas fa-check-shield"></i>
              </div>
              <div className="stats-info">
                <h3>
                  {filteredAssets.filter((a) => a.status === "Dimiliki/Dikuasai").length}
                </h3>
                <p>Dimiliki</p>
              </div>
            </div>
          </div>
        </Col>

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
                Object.keys(groupedPreview).map((koremId) => {
                  const koremData = groupedPreview[koremId];
                  return (
                    <div key={koremId} className="korem-preview-group">
                      <div className="korem-preview-title">
                        <i className="fas fa-map-marked-alt"></i>
                        {koremData.koremName}
                      </div>
                      {Object.keys(koremData.kodims).map((kodimName) => {
                        const kodimAssets = koremData.kodims[kodimName];
                        return (
                          <div key={kodimName} className="kodim-preview-group">
                            <div className="kodim-preview-title">
                              <span>
                                <i className="fas fa-building me-2"></i>
                                {kodimName}
                              </span>
                              <span className="badge bg-white text-dark border">
                                {kodimAssets.length} Aset
                              </span>
                            </div>
                            <div className="table-responsive-custom">
                              <table className="table table-striped table-bordered table-hover mb-0">
                                <thead
                                  className="table-dark"
                                  style={{ position: "sticky", top: 0, zIndex: 10 }}
                                >
                                  <tr>
                                    <th style={{ width: "50px" }}>No</th>
                                    <th>NUP</th>
                                    <th>Alamat</th>
                                    <th>Status</th>
                                    <th className="text-end" style={{ minWidth: "110px", whiteSpace: "nowrap" }}>
                                      Luas (m²)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kodimAssets.map((asset, idx) => (
                                    <tr key={asset.id}>
                                      <td className="text-center text-muted">{idx + 1}</td>
                                      <td className="fw-bold">{asset.nama || "-"}</td>
                                      <td>
                                        <div
                                          className="text-truncate"
                                          style={{ maxWidth: "250px" }}
                                          title={asset.alamat}
                                        >
                                          {asset.alamat || "-"}
                                        </div>
                                      </td>
                                      <td>
                                        <span
                                          className={`badge ${
                                            asset.status === "Dimiliki/Dikuasai"
                                              ? "bg-success"
                                              : "bg-danger"
                                          }`}
                                        >
                                          {asset.status || "-"}
                                        </span>
                                      </td>
                                      <td
                                        className="text-end fw-bold"
                                        style={{ whiteSpace: "nowrap" }}
                                      >
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