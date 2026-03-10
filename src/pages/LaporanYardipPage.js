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

  // Filter states
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

        // Extract unique fields
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

        const uniqueProvinsi = [...new Set(assetsData.map(a => a.provinsi).filter(Boolean))].sort();
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

    if (selectedProvinsi) filtered = filtered.filter(a => a.provinsi === selectedProvinsi);
    if (selectedKabupaten) filtered = filtered.filter(a => a.kabkota === selectedKabupaten);
    if (selectedBidang) filtered = filtered.filter(a => a.bidang?.toLowerCase() === selectedBidang.toLowerCase());
    if (statusFilter) filtered = filtered.filter(a => a.status === statusFilter);

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        (a.pengelola?.toLowerCase().includes(lowerSearch)) ||
        (a.kecamatan?.toLowerCase().includes(lowerSearch)) ||
        (a.kelurahan?.toLowerCase().includes(lowerSearch))
      );
    }

    setFilteredAssets(filtered);
  }, [selectedProvinsi, selectedKabupaten, selectedBidang, statusFilter, assets, searchTerm]);

  const getKabupatenForSelectedProvinsi = () => {
    if (!selectedProvinsi || !kabupatenGeoData) return [];
    const kabList = kabupatenGeoData.features
      .filter(f => f.properties.PROVINCE === selectedProvinsi)
      .map(f => f.properties.Kabupaten)
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

  const exportToExcel = async () => {
    if (filteredAssets.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }
    setExporting(true);
    // ... (Excel export logic remains the same as it's functional and complex)
    // I will keep the original functional export logic here but slightly clean up the start
    try {
      const workbook = new ExcelJS.Workbook();
      let subtitle = selectedProvinsi ? `DI WILAYAH ${selectedProvinsi.toUpperCase()}` : "DI SELURUH WILAYAH";
      
      const tanahAssets = filteredAssets.filter(a => a.bidang === "Tanah");
      const nonTanahAssets = filteredAssets.filter(a => a.bidang !== "Tanah" && a.bidang);

      const addDataRows = (worksheet, assets, startRow) => {
        let currentRow = startRow;
        let globalIndex = 1;
        const groupedByPeruntukan = {};
        assets.forEach(a => {
          const p = a.peruntukan || "Lain-lain";
          if (!groupedByPeruntukan[p]) groupedByPeruntukan[p] = [];
          groupedByPeruntukan[p].push(a);
        });

        Object.keys(groupedByPeruntukan).forEach(pName => {
          const pAssets = groupedByPeruntukan[pName];
          worksheet.getRow(currentRow).getCell(1).value = pName.toUpperCase();
          worksheet.getRow(currentRow).getCell(1).font = { bold: true };
          worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
          currentRow++;

          pAssets.forEach(asset => {
            const r = worksheet.getRow(currentRow);
            r.getCell(1).value = globalIndex;
            r.getCell(2).value = asset.bidang;
            r.getCell(3).value = asset.kelurahan || "-";
            r.getCell(4).value = asset.area ? Number(asset.area) : 0;
            r.getCell(5).value = asset.peruntukan || "-";
            r.getCell(6).value = asset.status || "-";
            r.getCell(7).value = asset.keterangan || "-";
            
            worksheet.getRow(currentRow+1).getCell(3).value = asset.kecamatan || "-";
            worksheet.getRow(currentRow+2).getCell(3).value = asset.kabkota || "-";
            worksheet.getRow(currentRow+3).getCell(3).value = asset.provinsi || "-";

            for(let i=0; i<4; i++) {
                const row = worksheet.getRow(currentRow + i);
                row.height = 18;
                for(let c=1; c<=7; c++) {
                    const cell = row.getCell(c);
                    cell.font = { size: 9, name: 'Arial' };
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    if (c === 4 && i === 0) cell.numFmt = '#,##0';
                    cell.alignment = { vertical: 'middle', wrapText: true };
                }
            }
            currentRow += 4;
            globalIndex++;
          });
        });
        return currentRow;
      };

      if (nonTanahAssets.length > 0) {
        const ws = workbook.addWorksheet("Aset Selain Tanah");
        ws.columns = [{width:5}, {width:20}, {width:25}, {width:12}, {width:20}, {width:20}, {width:30}];
        ws.mergeCells("A1:G1"); ws.getCell("A1").value = "DAFTAR ASET TANAH YARDIP SELAIN KEBUN";
        ws.mergeCells("A2:G2"); ws.getCell("A2").value = subtitle;
        const hRow = ws.getRow(4);
        ["NO", "BIDANG", "LOKASI", "LUAS (M2)", "PERUNTUKAN", "STATUS", "KETERANGAN"].forEach((h, i) => {
            hRow.getCell(i+1).value = h;
            hRow.getCell(i+1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} };
            hRow.getCell(i+1).font = { bold: true };
        });
        addDataRows(ws, nonTanahAssets, 6);
      }

      if (tanahAssets.length > 0) {
        const ws = workbook.addWorksheet("Aset Tanah");
        ws.columns = [{width:5}, {width:20}, {width:25}, {width:12}, {width:20}, {width:20}, {width:30}];
        ws.mergeCells("A1:G1"); ws.getCell("A1").value = "DAFTAR ASET TANAH YAYASAN RUMPUN DIPONEGORO";
        ws.mergeCells("A2:G2"); ws.getCell("A2").value = subtitle;
        const hRow = ws.getRow(4);
        ["NO", "BIDANG", "LOKASI", "LUAS (M2)", "PERUNTUKAN", "STATUS", "KETERANGAN"].forEach((h, i) => {
            hRow.getCell(i+1).value = h;
            hRow.getCell(i+1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD3D3D3'} };
            hRow.getCell(i+1).font = { bold: true };
        });
        addDataRows(ws, tanahAssets, 6);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_Aset_Yardip_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  const groupedPreview = groupAssetsByProvinsiKabupaten(filteredAssets);

  return (
    <Container className="py-4 laporan-container">
      <div className="page-header-box shadow-sm">
        <div className="page-header-title">
          <h2><i className="fas fa-file-excel me-3 text-success"></i>Laporan Aset Yardip</h2>
        </div>
        <div className="page-header-actions">
          <Button className="btn-sage-export" onClick={exportToExcel} disabled={exporting || filteredAssets.length === 0}>
            {exporting ? <Spinner size="sm" className="me-2" /> : <i className="fas fa-download me-2"></i>}
            Cetak Laporan Excel
          </Button>
        </div>
      </div>

      <Row>
        <Col lg={4}>
          <Card className="filter-panel-card border-0 shadow-sm mb-4">
            <Card.Header>
              <h5><i className="fas fa-sliders-h"></i>Filter Laporan</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form.Group className="mb-3">
                <Form.Label>Provinsi</Form.Label>
                <Form.Select value={selectedProvinsi} onChange={handleProvinsiChange}>
                  <option value="">Semua Provinsi</option>
                  {provinsiList.map(p => <option key={p} value={p}>{p}</option>)}
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
                  {getKabupatenForSelectedProvinsi().map(k => <option key={k} value={k}>{k}</option>)}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Bidang</Form.Label>
                <Form.Select value={selectedBidang} onChange={(e) => setSelectedBidang(e.target.value)}>
                  <option value="">Semua Bidang</option>
                  {bidangList.map(b => <option key={b} value={b}>{b}</option>)}
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
                <div className="stats-icon bg-sage-light"><i className="fas fa-database"></i></div>
                <div className="stats-info">
                  <h3>{filteredAssets.length}</h3>
                  <p>Total Aset</p>
                </div>
              </div>
            </Col>
            <Col xs={12}>
              <div className="stats-card">
                <div className="stats-icon bg-success-light"><i className="fas fa-check-circle"></i></div>
                <div className="stats-info">
                  <h3>{filteredAssets.filter(a => a.status === "Dimiliki/Dikuasai").length}</h3>
                  <p>Dimiliki</p>
                </div>
              </div>
            </Col>
          </Row>
        </Col>

        <Col lg={8}>
          <Card className="preview-section-card border-0 shadow-sm">
            <div className="preview-toolbar">
              <h5 className="mb-0 fw-bold"><i className="fas fa-eye me-2 text-success"></i>Pratinjau Data</h5>
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
                Object.keys(groupedPreview).map(prov => {
                  const provData = groupedPreview[prov];
                  return (
                    <div key={prov} className="provinsi-preview-group">
                      <div className="provinsi-preview-title">
                        <i className="fas fa-map-marker-alt"></i>{prov}
                      </div>
                      {Object.keys(provData).map(kab => {
                        const kabAssets = provData[kab];
                        return (
                          <div key={kab} className="kabupaten-preview-group">
                            <div className="kabupaten-preview-title">
                              <span><i className="fas fa-city me-2"></i>{kab}</span>
                              <span className="badge bg-white text-dark border">{kabAssets.length} Aset</span>
                            </div>
                            <div className="table-responsive-custom">
                              <table className="table table-striped table-bordered table-hover mb-0">
                                <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                                  <tr>
                                    <th style={{ width: "50px" }}>No</th>
                                    <th>Pengelola</th>
                                    <th>Bidang</th>
                                    <th>Provinsi</th>
                                    <th>Kota/Kab.</th>
                                    <th>Status</th>
                                    <th className="text-end">Luas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kabAssets.map((asset, idx) => {
                                    const getStatusBadgeClass = (status) => {
                                      switch (status) {
                                        case "Dimiliki/Dikuasai": return "bg-success";
                                        case "Tidak Dimiliki/Tidak Dikuasai": return "bg-danger";
                                        default: return "bg-info";
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
                                        <td className="text-end fw-bold">{(asset.area || 0).toLocaleString("id-ID")} m²</td>
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
