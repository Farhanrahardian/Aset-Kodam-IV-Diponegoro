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
import "./LaporanYardipPage.css";

const API_URL = "http://localhost:3001";

const LaporanYardipPage = () => {
  const [assets, setAssets] = useState([]);
  const [bidangList, setBidangList] = useState([]);
  const [provinsiList, setProvinsiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [selectedProvinsi, setSelectedProvinsi] = useState("");
  const [selectedKabupaten, setSelectedKabupaten] = useState("");
  const [selectedBidang, setSelectedBidang] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [kabupatenGeoData, setKabupatenGeoData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assetsRes, kabGeoRes] = await Promise.all([
          axiosAuth.get(`${API_URL}/yardip_assets`),
          axiosAuth.get("/data/kabupaten_kota.geojson"),
        ]);
        const assetsData = assetsRes.data || [];
        setAssets(assetsData);
        setKabupatenGeoData(kabGeoRes.data);

        const bidangMap = {};
        assetsData.forEach((asset) => {
          if (asset.bidang) {
            const lower = asset.bidang.toLowerCase();
            if (!bidangMap[lower] || asset.bidang.charAt(0) === asset.bidang.charAt(0).toUpperCase()) {
              bidangMap[lower] = asset.bidang;
            }
          }
        });
        setBidangList(Object.values(bidangMap).sort());

        const uniqueProvinsi = [...new Set(assetsData.map((a) => a.provinsi).filter(Boolean))].sort();
        setProvinsiList(uniqueProvinsi);
        setFilteredAssets(assetsData);
        setError(null);
      } catch (err) {
        setError("Gagal memuat data dari server.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = assets;
    if (selectedProvinsi) filtered = filtered.filter((a) => a.provinsi === selectedProvinsi);
    if (selectedKabupaten) filtered = filtered.filter((a) => a.kabkota === selectedKabupaten);
    if (selectedBidang) filtered = filtered.filter((a) => a.bidang?.toLowerCase() === selectedBidang.toLowerCase());
    if (statusFilter) filtered = filtered.filter((a) => a.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.pengelola?.toLowerCase().includes(q) ||
          a.kecamatan?.toLowerCase().includes(q) ||
          a.kelurahan?.toLowerCase().includes(q)
      );
    }
    setFilteredAssets(filtered);
  }, [selectedProvinsi, selectedKabupaten, selectedBidang, statusFilter, assets, searchTerm]);

  const getKabupatenForSelectedProvinsi = () => {
    if (!selectedProvinsi || !kabupatenGeoData) return [];
    const kabList = kabupatenGeoData.features
      .filter((f) => f.properties.PROVINCE === selectedProvinsi)
      .map((f) => f.properties.Kabupaten)
      .filter(Boolean);
    return [...new Set(kabList)].sort();
  };

  const handleProvinsiChange = (e) => {
    setSelectedProvinsi(e.target.value);
    setSelectedKabupaten("");
  };

  const handleResetFilter = () => {
    setSelectedProvinsi("");
    setSelectedKabupaten("");
    setSelectedBidang("");
    setStatusFilter("");
    setSearchTerm("");
  };

  const groupAssetsByProvinsiKabupaten = (assets) => {
    const grouped = {};
    assets.forEach((asset) => {
      const prov = asset.provinsi || "Provinsi Tidak Diketahui";
      const kab = asset.kabkota || "Kabupaten Tidak Diketahui";
      if (!grouped[prov]) grouped[prov] = {};
      if (!grouped[prov][kab]) grouped[prov][kab] = [];
      grouped[prov][kab].push(asset);
    });
    return grouped;
  };

  // ─── PALET WARNA NETRAL ──────────────────────────────────
  const COLOR = {
    provinsi:    "FF4A4A4A", // abu gelap  → baris provinsi (teks putih)
    kabupaten:   "FFD9D9D9", // abu muda   → baris kabupaten (teks hitam)
    peruntukan:  "FFEEEEEE", // abu sangat terang → baris grup peruntukan
    headerCol:   "FFE8E8E8", // abu terang → header kolom tabel
    fontWhite:   "FFFFFFFF",
    fontDark:    "FF1A1A1A",
    fontGray:    "FF555555",
    border:      "FFB0B0B0",
    zebraEven:   "FFF7F7F7",
  };

  const applyBorder = (cell) => {
    const s = { style: "thin", color: { argb: COLOR.border } };
    cell.border = { top: s, left: s, bottom: s, right: s };
  };

  const styleHeader = (cell, value, bgColor, fontColor = COLOR.fontDark, size = 9) => {
    cell.value = value;
    cell.font = { bold: true, size, name: "Arial", color: { argb: fontColor } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    applyBorder(cell);
  };

  const buildSheet = (workbook, sheetName, title, assets) => {
    const ws = workbook.addWorksheet(sheetName, {
      pageSetup: {
        paperSize: 9,           // A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
    });

    // ── Lebar kolom ────────────────────────────────────────
    ws.columns = [
      { width: 5  }, // A  No
      { width: 22 }, // B  Bidang
      { width: 28 }, // C  Lokasi (Kelurahan / Kecamatan / Kab / Provinsi)
      { width: 14 }, // D  Luas (m²)
      { width: 22 }, // E  Peruntukan
      { width: 22 }, // F  Status
      { width: 36 }, // G  Sejarah
    ];

    const subtitle = selectedProvinsi
      ? `DI WILAYAH ${selectedProvinsi.toUpperCase()}`
      : "DI SELURUH WILAYAH";

    const now = new Date();
    const tanggal = now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

    // ── Baris 1: Judul ─────────────────────────────────────
    ws.getRow(1).height = 22;
    const t = ws.getCell("A1");
    t.value = title.toUpperCase();
    t.font = { bold: true, size: 13, name: "Arial", color: { argb: COLOR.fontDark } };
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells("A1:G1");

    // ── Baris 2: Sub-judul ─────────────────────────────────
    ws.getRow(2).height = 16;
    const s = ws.getCell("A2");
    s.value = subtitle;
    s.font = { bold: true, size: 11, name: "Arial", color: { argb: COLOR.fontGray } };
    s.alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells("A2:G2");

    // ── Baris 3: Tanggal ────────────────────────────────────
    ws.getRow(3).height = 13;
    const d = ws.getCell("A3");
    d.value = `Dicetak: ${tanggal}`;
    d.font = { italic: true, size: 8, name: "Arial", color: { argb: "FF999999" } };
    d.alignment = { horizontal: "right", vertical: "middle" };
    ws.mergeCells("A3:G3");

    // ── Baris 4: Spasi ──────────────────────────────────────
    ws.getRow(4).height = 5;

    // ── Baris 5: Header kolom ───────────────────────────────
    ws.getRow(5).height = 28;
    const HEADERS = ["NO", "BIDANG", "LOKASI", "LUAS (M²)", "PERUNTUKAN", "STATUS", "SEJARAH"];
    HEADERS.forEach((h, i) => styleHeader(ws.getRow(5).getCell(i + 1), h, COLOR.headerCol));

    // Freeze header
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 5, activeCell: "A6" }];

    // ── Data, dikelompokkan per Provinsi → Kabupaten → Peruntukan ──
    let currentRow = 6;
    let globalIndex = 1;

    const grouped = groupAssetsByProvinsiKabupaten(assets);

    Object.keys(grouped).forEach((prov) => {
      // Baris Provinsi — abu gelap, teks putih
      ws.getRow(currentRow).height = 18;
      const provCell = ws.getRow(currentRow).getCell(1);
      provCell.value = `  ${prov.toUpperCase()}`;
      provCell.font = { bold: true, size: 10, name: "Arial", color: { argb: COLOR.fontWhite } };
      provCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.provinsi } };
      provCell.alignment = { vertical: "middle" };
      ws.mergeCells(`A${currentRow}:G${currentRow}`);
      applyBorder(provCell);
      currentRow++;

      Object.keys(grouped[prov]).forEach((kab) => {
        const kabAssets = grouped[prov][kab];

        // Baris Kabupaten — abu muda, teks gelap
        ws.getRow(currentRow).height = 16;
        const kabCell = ws.getRow(currentRow).getCell(1);
        kabCell.value = `      ${kab.toUpperCase()}  (${kabAssets.length} aset)`;
        kabCell.font = { bold: true, size: 9, name: "Arial", color: { argb: COLOR.fontDark } };
        kabCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.kabupaten } };
        kabCell.alignment = { vertical: "middle" };
        ws.mergeCells(`A${currentRow}:G${currentRow}`);
        applyBorder(kabCell);
        currentRow++;

        // Kelompokkan per peruntukan
        const byPeruntukan = {};
        kabAssets.forEach((a) => {
          const p = a.peruntukan || "Lain-lain";
          if (!byPeruntukan[p]) byPeruntukan[p] = [];
          byPeruntukan[p].push(a);
        });

        Object.keys(byPeruntukan).forEach((pName) => {
          const pAssets = byPeruntukan[pName];

          // Baris Peruntukan — abu sangat terang, italic
          ws.getRow(currentRow).height = 14;
          const pCell = ws.getRow(currentRow).getCell(1);
          pCell.value = `            ${pName.toUpperCase()}`;
          pCell.font = { bold: true, italic: true, size: 9, name: "Arial", color: { argb: COLOR.fontGray } };
          pCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.peruntukan } };
          pCell.alignment = { vertical: "middle" };
          ws.mergeCells(`A${currentRow}:G${currentRow}`);
          applyBorder(pCell);
          currentRow++;

          pAssets.forEach((asset) => {
            // Setiap aset ditampilkan dalam 1 baris (lokasi digabung)
            const lokasiParts = [
              asset.kelurahan  ? `Kel/Desa ${asset.kelurahan}`   : null,
              asset.kecamatan  ? `Kec. ${asset.kecamatan}`       : null,
              asset.kabkota    ? `Kab. ${asset.kabkota}`         : null,
              asset.provinsi   || null,
            ].filter(Boolean);
            const lokasi = lokasiParts.join("\n");

            ws.getRow(currentRow).height = 15 * lokasiParts.length || 15;
            const row = ws.getRow(currentRow);

            const vals = [
              globalIndex,
              asset.bidang || "-",
              lokasi || "-",
              asset.area ? Number(asset.area) : 0,
              asset.peruntukan || "-",
              asset.status || "-",
              asset.sejarah || "-",
            ];

            vals.forEach((val, i) => {
              const cell = row.getCell(i + 1);
              cell.value = val;
              cell.font = { size: 9, name: "Arial", color: { argb: COLOR.fontDark } };
              cell.alignment = {
                vertical: "middle",
                wrapText: i === 2 || i === 6,
                horizontal: i === 0 ? "center" : i === 3 ? "right" : "left",
              };
              if (i === 3) cell.numFmt = "#,##0.##";

              // Zebra stripe
              if (globalIndex % 2 === 0) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.zebraEven } };
              }
              applyBorder(cell);
            });

            currentRow++;
            globalIndex++;
          });
        });

        // Baris total per Kabupaten
        ws.getRow(currentRow).height = 14;
        const totalLuas = kabAssets.reduce((sum, a) => sum + (Number(a.area) || 0), 0);

        const totLabelCell = ws.getRow(currentRow).getCell(1);
        totLabelCell.value = `Total ${kab}: ${kabAssets.length} aset`;
        totLabelCell.font = { bold: true, size: 9, name: "Arial", color: { argb: COLOR.fontGray } };
        totLabelCell.alignment = { horizontal: "right", vertical: "middle" };
        totLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
        ws.mergeCells(`A${currentRow}:C${currentRow}`);

        const totLuasCell = ws.getRow(currentRow).getCell(4);
        totLuasCell.value = totalLuas;
        totLuasCell.numFmt = "#,##0.##";
        totLuasCell.font = { bold: true, size: 9, name: "Arial" };
        totLuasCell.alignment = { horizontal: "right", vertical: "middle" };
        totLuasCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
        ws.mergeCells(`D${currentRow}:G${currentRow}`);

        for (let c = 1; c <= 7; c++) applyBorder(ws.getRow(currentRow).getCell(c));
        currentRow++;
      });

      // Spasi antar provinsi
      ws.getRow(currentRow).height = 5;
      currentRow++;
    });
  };

  const exportToExcel = async () => {
    if (filteredAssets.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }
    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistem Aset Yardip";
      workbook.created = new Date();

      const tanahAssets    = filteredAssets.filter((a) => a.bidang === "Tanah");
      const nonTanahAssets = filteredAssets.filter((a) => a.bidang !== "Tanah" && a.bidang);

      if (nonTanahAssets.length > 0) {
        buildSheet(
          workbook,
          "Aset Selain Tanah",
          "Daftar Aset Yardip Selain Kebun",
          nonTanahAssets
        );
      }

      if (tanahAssets.length > 0) {
        buildSheet(
          workbook,
          "Aset Tanah",
          "Daftar Aset Tanah Yayasan Rumpun Diponegoro",
          tanahAssets
        );
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_Aset_Yardip_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const groupedPreview = groupAssetsByProvinsiKabupaten(filteredAssets);

  return (
    <Container className="py-4 laporan-container">
      <div className="page-header-box shadow-sm">
        <div className="page-header-title">
          <h2>
            <i className="fas fa-file-excel me-3 text-success"></i>Laporan Aset Yardip
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
              <i className="fas fa-download me-2"></i>
            )}
            Cetak Laporan Excel
          </Button>
        </div>
      </div>

      <Row>
        <Col lg={4}>
          <Card className="filter-panel-card border-0 shadow-sm mb-4">
            <Card.Header>
              <h5>
                <i className="fas fa-sliders-h"></i>Filter Laporan
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form.Group className="mb-3">
                <Form.Label>Provinsi</Form.Label>
                <Form.Select value={selectedProvinsi} onChange={handleProvinsiChange}>
                  <option value="">Semua Provinsi</option>
                  {provinsiList.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Kota/Kabupaten</Form.Label>
                <Form.Select
                  value={selectedKabupaten}
                  onChange={(e) => setSelectedKabupaten(e.target.value)}
                  disabled={!selectedProvinsi}
                >
                  <option value="">Semua Kota/Kabupaten</option>
                  {getKabupatenForSelectedProvinsi().map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Bidang</Form.Label>
                <Form.Select value={selectedBidang} onChange={(e) => setSelectedBidang(e.target.value)}>
                  <option value="">Semua Bidang</option>
                  {bidangList.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Status</Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="Dimiliki/Dikuasai">Dimiliki/Dikuasai</option>
                  <option value="Tidak Dimiliki/Tidak Dikuasai">Tidak Dimiliki</option>
                </Form.Select>
              </Form.Group>

              <Button className="btn-reset-filter w-100" onClick={handleResetFilter}>
                <i className="fas fa-undo me-2"></i>Reset Filter
              </Button>
            </Card.Body>
          </Card>

          <Row className="g-3">
            <Col xs={12}>
              <div className="stats-card">
                <div className="stats-icon bg-sage-light">
                  <i className="fas fa-database"></i>
                </div>
                <div className="stats-info">
                  <h3>{filteredAssets.length}</h3>
                  <p>Total Aset</p>
                </div>
              </div>
            </Col>
            <Col xs={12}>
              <div className="stats-card">
                <div className="stats-icon bg-success-light">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stats-info">
                  <h3>{filteredAssets.filter((a) => a.status === "Dimiliki/Dikuasai").length}</h3>
                  <p>Dimiliki</p>
                </div>
              </div>
            </Col>
          </Row>
        </Col>

        <Col lg={8}>
          <Card className="preview-section-card border-0 shadow-sm">
            <div className="preview-toolbar">
              <h5 className="mb-0 fw-bold">
                <i className="fas fa-eye me-2 text-success"></i>Pratinjau Data
              </h5>
              <div className="search-box-wrapper">
                <i className="fas fa-search"></i>
                <Form.Control
                  type="text"
                  placeholder="Cari pengelola atau lokasi..."
                  className="search-input-preview"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="preview-scroll-container">
              {Object.keys(groupedPreview).length > 0 ? (
                Object.keys(groupedPreview).map((prov) => {
                  const provData = groupedPreview[prov];
                  return (
                    <div key={prov} className="provinsi-preview-group">
                      <div className="provinsi-preview-title">
                        <i className="fas fa-map-marker-alt"></i>
                        {prov}
                      </div>
                      {Object.keys(provData).map((kab) => {
                        const kabAssets = provData[kab];
                        return (
                          <div key={kab} className="kabupaten-preview-group">
                            <div className="kabupaten-preview-title">
                              <span>
                                <i className="fas fa-city me-2"></i>
                                {kab}
                              </span>
                              <span className="badge bg-white text-dark border">
                                {kabAssets.length} Aset
                              </span>
                            </div>
                            <div className="table-responsive-custom">
                              <table className="table table-striped table-bordered table-hover mb-0">
                                <thead
                                  className="table-dark"
                                  style={{ position: "sticky", top: 0, zIndex: 10 }}
                                >
                                  <tr>
                                    <th style={{ width: "45px" }}>No</th>
                                    <th>Pengelola</th>
                                    <th>Bidang</th>
                                    <th>Provinsi</th>
                                    <th>Kota/Kab.</th>
                                    <th>Status</th>
                                    <th
                                      className="text-end"
                                      style={{ minWidth: "110px", whiteSpace: "nowrap" }}
                                    >
                                      Luas (m²)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kabAssets.map((asset, idx) => {
                                    const getStatusBadgeClass = (status) => {
                                      switch (status) {
                                        case "Dimiliki/Dikuasai": return "bg-success";
                                        case "Tidak Dimiliki/Tidak Dikuasai": return "bg-danger";
                                        default: return "bg-secondary";
                                      }
                                    };
                                    return (
                                      <tr key={asset.id}>
                                        <td className="text-center text-muted">{idx + 1}</td>
                                        <td className="fw-bold">{asset.pengelola || "-"}</td>
                                        <td>{asset.bidang || "-"}</td>
                                        <td>{asset.provinsi || "-"}</td>
                                        <td>{asset.kabkota || "-"}</td>
                                        <td>
                                          <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                            {asset.status || "-"}
                                          </span>
                                        </td>
                                        <td
                                          className="text-end fw-bold"
                                          style={{ whiteSpace: "nowrap" }}
                                        >
                                          {(asset.area || 0).toLocaleString("id-ID")} m²
                                        </td>
                                      </tr>
                                    );
                                  })}
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
                  <i className="fas fa-folder-open text-muted"></i>
                  <h4>Data tidak ditemukan</h4>
                  <p>Sesuaikan filter untuk melihat data laporan</p>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LaporanYardipPage;