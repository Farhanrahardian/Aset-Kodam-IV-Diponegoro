import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axiosAuth from "../utils/axiosAuth";
import "./Dashboard.css";
import ExcelJS from "exceljs";

const API_URL = "http://localhost:3001";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ========== STATE MANAGEMENT ==========
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

  // ========== STATIC CITY LIST ==========
  const allCitiesData = useMemo(
    () => ({
      "Jawa Tengah": [
        "Banjarnegara", "Banyumas", "Batang", "Blora", "Boyolali", "Brebes",
        "Cilacap", "Demak", "Grobogan", "Jepara", "Karanganyar", "Kebumen",
        "Kendal", "Klaten", "Kota Magelang", "Kota Pekalongan", "Kota Salatiga",
        "Kota Semarang", "Kota Surakarta", "Kota Tegal", "Kudus", "Magelang",
        "Pati", "Pekalongan", "Pemalang", "Purbalingga", "Purworejo", "Rembang",
        "Semarang", "Sragen", "Sukoharjo", "Tegal", "Temanggung", "Wonogiri", "Wonosobo",
      ],
      "Daerah Istimewa Yogyakarta": [
        "Bantul", "Gunungkidul", "Kota Yogyakarta", "Kulon Progo", "Sleman",
      ],
    }),
    []
  );

  // ========== FETCH DATA ==========
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tanahRes, yardipRes, koremRes] = await Promise.all([
        axiosAuth.get(`${API_URL}/assets`),
        axiosAuth.get(`${API_URL}/yardip_assets`),
        axiosAuth.get(`${API_URL}/korem`),
      ]);

      const assetsData = tanahRes.data;
      const yardipData = yardipRes.data;
      const koremData = koremRes.data;

      setRawAssetsData(assetsData);
      setRawYardipData(yardipData);
      setKoremList(koremData);

      // Build city list
      const citiesFromData = new Set();
      yardipData.forEach((asset) => {
        const city = asset.kabkota;
        const province = (asset.provinsi || "").toLowerCase();
        if (city && !isConservationArea(city)) {
          let prov = "";
          if (province.includes("jawa tengah")) prov = "Jawa Tengah";
          else if (province.includes("yogyakarta")) prov = "Daerah Istimewa Yogyakarta";

          if (prov) {
            citiesFromData.add(JSON.stringify({ city, province: prov }));
          }
        }
      });

      const allCities = [];
      Object.keys(allCitiesData).forEach((province) => {
        allCitiesData[province].forEach((city) => {
          allCities.push({ city, province });
        });
      });

      citiesFromData.forEach((cityJson) => {
        const cityObj = JSON.parse(cityJson);
        if (!allCities.find((c) => c.city === cityObj.city && c.province === cityObj.province)) {
          allCities.push(cityObj);
        }
      });

      setCityList(allCities.sort((a, b) => a.city.localeCompare(b.city)));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [isConservationArea, allCitiesData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== COMPUTED DATA ==========
  const asetTanahData = useMemo(() => {
    const koremStats = {};
    const kodimStats = {};

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

    rawAssetsData.forEach((asset) => {
      const koremId = asset.korem_id;
      const kodimName = asset.kodim;
      const hasSertifikat = asset.pemilikan_sertifikat === "Ya";

      if (koremStats[koremId]) {
        koremStats[koremId][hasSertifikat ? "bersertifikat" : "tidakBersertifikat"] += 1;
        koremStats[koremId].total += 1;
      }

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
        kodimStats[kodimName][hasSertifikat ? "bersertifikat" : "tidakBersertifikat"] += 1;
        kodimStats[kodimName].total += 1;
      }
    });

    if (selectedKodim) {
      return kodimStats[selectedKodim] ? [kodimStats[selectedKodim]] : [];
    } else if (selectedKorem) {
      return Object.values(kodimStats)
        .filter((k) => k.koremId?.toString() === selectedKorem.toString() && k.total > 0)
        .sort((a, b) => b.total - a.total);
    } else {
      return Object.values(koremStats)
        .filter((k) => k.total > 0)
        .sort((a, b) => b.total - a.total);
    }
  }, [rawAssetsData, koremList, selectedKorem, selectedKodim]);

  const asetYardipData = useMemo(() => {
    const provinceStats = {
      "Jawa Tengah": {
        name: "Jawa Tengah",
        tanah: 0, tanahBangunan: 0, tanahGudangKantor: 0, ruko: 0, total: 0,
      },
      "Daerah Istimewa Yogyakarta": {
        name: "DI Yogyakarta",
        tanah: 0, tanahBangunan: 0, tanahGudangKantor: 0, ruko: 0, total: 0,
      },
    };
    const cityStats = {};

    rawYardipData.forEach((asset) => {
      const province = determineProvince(asset);
      const city = asset.kabkota;

      if (isConservationArea(city)) return;

      const category = categorizeYardipAsset(asset);

      if (province && provinceStats[province]) {
        provinceStats[province][category] += 1;
        provinceStats[province].total += 1;
      }

      if (city && province) {
        const cityKey = `${province}:${city}`;
        if (!cityStats[cityKey]) {
          cityStats[cityKey] = {
            name: city,
            province: province,
            tanah: 0, tanahBangunan: 0, tanahGudangKantor: 0, ruko: 0, total: 0,
          };
        }
        cityStats[cityKey][category] += 1;
        cityStats[cityKey].total += 1;
      }
    });

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
  }, [rawYardipData, selectedProvince, selectedCity, categorizeYardipAsset, determineProvince, isConservationArea]);

  // ========== FILTER OPTIONS ==========
  const availableKodim = useMemo(() => {
    if (!selectedKorem) return [];
    const korem = koremList.find((k) => k.id.toString() === selectedKorem.toString());
    return korem?.kodim || [];
  }, [selectedKorem, koremList]);

  const kotaOptions = useMemo(() => {
    if (!selectedProvince) return [];
    return cityList
      .filter((c) => c.province === selectedProvince)
      .map((c) => ({ value: c.city, label: c.city }));
  }, [cityList, selectedProvince]);

  // ========== COMPUTED TOTALS ==========
  const bmnStats = useMemo(() => {
    const total = rawAssetsData.length;
    const dimiliki = rawAssetsData.filter(a => a.status === "Dimiliki/Dikuasai").length;
    const tidakDimiliki = rawAssetsData.filter(a => 
      a.status === "TIdak Dimiliki/Dikuasai" || a.status === "Tidak Dimiliki/Tidak Dikuasai"
    ).length;
    return { total, dimiliki, tidakDimiliki };
  }, [rawAssetsData]);

  const yardipStats = useMemo(() => {
    const total = rawYardipData.length;
    const dimiliki = rawYardipData.filter(a => a.status === "Dimiliki/Dikuasai").length;
    const tidakDimiliki = rawYardipData.filter(a => 
      a.status === "Tidak Dimiliki/Tidak Dikuasai" || a.status === "TIdak Dimiliki/Dikuasai"
    ).length;
    return { total, dimiliki, tidakDimiliki };
  }, [rawYardipData]);

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

  // Export handlers
  const handleExportBMN = useCallback(async () => {
    if (rawAssetsData.length === 0) {
      toast.error("Tidak ada data BMN untuk diekspor!");
      return;
    }

    try {
      // Buat workbook baru
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Aset BMN");

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
      const title = "TANAH BMN TNI AD BERSERTIFIKAT DAN BELUM SERTIFIKAT";
      const titleCell = worksheet.getCell("A1");
      titleCell.value = title;
      titleCell.font = { bold: true, size: 12, name: "Arial" };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6E6FA" } };
      worksheet.mergeCells("A1:R1");

      // Tambahkan subtitle (Row 2)
      let subtitle = "DI WILAYAH SELURUH KOREM";
      if (selectedKorem) {
        const korem = koremList.find(k => k.id.toString() === selectedKorem.toString());
        if (korem) {
          subtitle = selectedKodim 
            ? `DI WILAYAH ${selectedKodim.toUpperCase()}`
            : `DI WILAYAH ${korem.nama.toUpperCase()}`;
        }
      }
      const subtitleCell = worksheet.getCell("A2");
      subtitleCell.value = subtitle;
      subtitleCell.font = { bold: true, size: 11, name: "Arial" };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
      subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
      worksheet.mergeCells("A2:R2");

      // Row kosong (Row 3)
      worksheet.getRow(3).height = 10;

      // Header Row (Row 4)
      const headers = [
        { text: "No", colspan: 1 },
        { text: "BAG", colspan: 1 },
        { text: "NUP", colspan: 1 },
        { text: "KIB/Kode Barang", colspan: 1 },
        { text: "No Reg", colspan: 1 },
        { text: "Alamat", colspan: 1 },
        { text: "Peruntukan", colspan: 1 },
        { text: "Status", colspan: 1 },
        { text: "Asal Milik", colspan: 1 },
        { text: "Bukti Pemilikan", colspan: 1 },
        { text: "A.N. Pemilik Sertifikat", colspan: 1 },
        { text: "BID", colspan: 2 },
        { text: "Sertifikat", colspan: 2 },
        { text: "Belum Sertifikat", colspan: 2 },
        { text: "Keterangan", colspan: 1 },
      ];

      let colIndex = 1;
      headers.forEach((header) => {
        const startCol = colIndex;
        const endCol = colIndex + header.colspan - 1;
        const cell = worksheet.getCell(4, startCol);
        cell.value = header.text;
        cell.font = { bold: true, size: 9, name: "Arial" };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
        if (header.colspan > 1) {
          worksheet.mergeCells(4, startCol, 5, endCol);
        } else {
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        }
        colIndex += header.colspan;
      });

      // Sub-headers for BID, Sertifikat, Belum Sertifikat
      const subHeaders = [
        { text: "Keseluruhan", col: 12 },
        { text: "Luas", col: 13 },
        { text: "BID", col: 14 },
        { text: "Luas", col: 15 },
        { text: "BID", col: 16 },
        { text: "Luas", col: 17 },
      ];

      subHeaders.forEach((sub) => {
        const cell = worksheet.getCell(5, sub.col);
        cell.value = sub.text;
        cell.font = { bold: true, size: 9, name: "Arial" };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      });

      // Filter data based on current selection
      let filteredData = rawAssetsData;
      if (selectedKorem) {
        filteredData = filteredData.filter(a => a.korem_id.toString() === selectedKorem.toString());
        if (selectedKodim) {
          filteredData = filteredData.filter(a => a.kodim === selectedKodim);
        }
      }

      // Add data rows
      let currentRow = 6;
      filteredData.forEach((asset, index) => {
        const sertifikatLuas = parseFloat(asset.sertifikat_luas) || 0;
        const belumSertifikatLuas = parseFloat(asset.belum_sertifikat_luas) || 0;
        const hasSertifikat = asset.pemilikan_sertifikat === "Ya";
        const totalLuas = sertifikatLuas + belumSertifikatLuas;

        const rowData = [
          index + 1,
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
          totalLuas,
          hasSertifikat ? 1 : 0,
          sertifikatLuas,
          !hasSertifikat ? 1 : 0,
          belumSertifikatLuas,
          asset.keterangan || "-",
        ];

        const dataRow = worksheet.getRow(currentRow);
        rowData.forEach((data, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          cell.value = data;
          cell.font = { size: 9, name: "Arial" };

          if ([1, 2, 12, 14, 16].includes(colIdx + 1)) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if ([13, 15, 17].includes(colIdx + 1)) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
            if (typeof data === "number" && data > 0) {
              cell.numFmt = "#,##0";
            }
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          }
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        });

        dataRow.height = 20;
        currentRow++;
      });

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0];
      const koremName = selectedKorem 
        ? koremList.find(k => k.id.toString() === selectedKorem.toString())?.nama.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "Semua"
        : "Semua";
      const fileName = `Laporan_Aset_BMN_${koremName}_${dateStr}.xlsx`;

      // Write dan download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`File Excel BMN berhasil didownload (${filteredData.length} data)`);
    } catch (error) {
      console.error("Error exporting BMN to Excel:", error);
      toast.error(`Gagal mengekspor data BMN: ${error.message}`);
    }
  }, [rawAssetsData, selectedKorem, selectedKodim, koremList]);

  const handleExportYardip = useCallback(async () => {
    if (rawYardipData.length === 0) {
      toast.error("Tidak ada data Yardip untuk diekspor!");
      return;
    }

    try {
      // Buat workbook baru
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Laporan Aset Yardip");

      // Set column widths
      worksheet.columns = [
        { width: 8 }, // A - No
        { width: 20 }, // B - ID Aset
        { width: 25 }, // C - Pengelola
        { width: 20 }, // D - Bidang
        { width: 25 }, // E - Provinsi
        { width: 25 }, // F - Kabupaten/Kota
        { width: 20 }, // G - Kecamatan
        { width: 20 }, // H - Kelurahan
        { width: 15 }, // I - Peruntukan
        { width: 15 }, // J - Status
        { width: 30 }, // K - Keterangan
        { width: 15 }, // L - Area
        { width: 25 }, // M - Bukti Pemilikan
      ];

      // Tambahkan title (Row 1)
      const title = "ASET YARDIP TNI AD";
      const titleCell = worksheet.getCell("A1");
      titleCell.value = title;
      titleCell.font = { bold: true, size: 12, name: "Arial" };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6E6FA" } };
      worksheet.mergeCells("A1:M1");

      // Tambahkan subtitle (Row 2)
      let subtitle = "SELURUH PROVINSI";
      if (selectedProvince) {
        subtitle = `PROVINSI ${selectedProvince.toUpperCase()}`;
        if (selectedCity) {
          subtitle += ` - ${selectedCity.toUpperCase()}`;
        }
      }
      const subtitleCell = worksheet.getCell("A2");
      subtitleCell.value = subtitle;
      subtitleCell.font = { bold: true, size: 11, name: "Arial" };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
      subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
      worksheet.mergeCells("A2:M2");

      // Row kosong (Row 3)
      worksheet.getRow(3).height = 10;

      // Header Row (Row 4)
      const headers = [
        "No", "ID Aset", "Pengelola", "Bidang", "Provinsi", "Kabupaten/Kota",
        "Kecamatan", "Kelurahan", "Peruntukan", "Status", "Keterangan", "Area", "Bukti Pemilikan"
      ];

      headers.forEach((header, colIdx) => {
        const cell = worksheet.getCell(4, colIdx + 1);
        cell.value = header;
        cell.font = { bold: true, size: 9, name: "Arial" };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      });

      // Filter data based on current selection
      let filteredData = rawYardipData;
      if (selectedProvince) {
        filteredData = filteredData.filter(a => {
          const prov = (a.provinsi || "").toLowerCase();
          if (selectedProvince === "Jawa Tengah") return prov.includes("jawa tengah");
          if (selectedProvince === "Daerah Istimewa Yogyakarta") return prov.includes("yogyakarta");
          return false;
        });
        if (selectedCity) {
          filteredData = filteredData.filter(a => a.kabkota === selectedCity);
        }
      }

      // Add data rows
      let currentRow = 5;
      filteredData.forEach((asset, index) => {
        const rowData = [
          index + 1,
          asset.id,
          asset.pengelola || "-",
          asset.bidang || "-",
          asset.provinsi || "-",
          asset.kabkota || "-",
          asset.kecamatan || "-",
          asset.kelurahan || "-",
          asset.peruntukan || "-",
          asset.status || "-",
          asset.keterangan || "-",
          asset.area || "-",
          asset.bukti_pemilikan_filename || "-",
        ];

        const dataRow = worksheet.getRow(currentRow);
        rowData.forEach((data, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          cell.value = data;
          cell.font = { size: 9, name: "Arial" };

          if (colIdx + 1 === 1) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          }
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        });

        dataRow.height = 20;
        currentRow++;
      });

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0];
      const provinceName = selectedProvince 
        ? selectedProvince.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")
        : "Semua";
      const fileName = `Laporan_Aset_Yardip_${provinceName}_${dateStr}.xlsx`;

      // Write dan download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`File Excel Yardip berhasil didownload (${filteredData.length} data)`);
    } catch (error) {
      console.error("Error exporting Yardip to Excel:", error);
      toast.error(`Gagal mengekspor data Yardip: ${error.message}`);
    }
  }, [rawYardipData, selectedProvince, selectedCity]);

  // Chart click handler for drill-down
  const handleBarClickBMN = useCallback((data) => {
    if (data && data.name) {
      console.log("BMN clicked:", data);
      // Navigate to detail page with filter
      navigate(`/data-aset-tanah?korem=${data.id || ''}`);
    }
  }, [navigate]);

  const handleBarClickYardip = useCallback((data) => {
    if (data && data.name) {
      console.log("Yardip clicked:", data);
      // Navigate to detail page with filter
      navigate(`/data-aset-yardip?provinsi=${encodeURIComponent(data.name)}`);
    }
  }, [navigate]);

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
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        {/* Hero Slider */}
        <section className="hero-section">
          <div className="hero-slider">
            <div className="slider-container">
              {slides.map((slide, index) => (
                <div key={index} className={`slide ${index === currentSlide ? "active" : ""}`}>
                  <img src={slide.src} alt={slide.alt} />
                  <div className="slide-overlay">
                    <h3>APLIKASI DATA ASET DAN DATA YARDIP</h3>
                    <p>KODAM IV/DIPONEGORO</p>
                  </div>
                </div>
              ))}
              <div className="slider-dots">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === currentSlide ? "active" : ""}`}
                    onClick={() => goToSlide(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="summary-section">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-card-label">Total Aset BMN</div>
              <div className="summary-card-value">{bmnStats.total}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Dimiliki/Dikuasai</div>
              <div className="summary-card-value text-success">{bmnStats.dimiliki}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Tidak Dimiliki/Dikuasai</div>
              <div className="summary-card-value text-danger">{bmnStats.tidakDimiliki}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Total Aset Yardip</div>
              <div className="summary-card-value">{yardipStats.total}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Dimiliki/Dikuasai</div>
              <div className="summary-card-value text-success">{yardipStats.dimiliki}</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-label">Tidak Dimiliki/Dikuasai</div>
              <div className="summary-card-value text-danger">{yardipStats.tidakDimiliki}</div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        {user?.role === "admin" && (
          <section className="quick-actions-section">
            <h3 className="quick-actions-title">Tambah Aset</h3>
            <div className="quick-actions-grid">
              <button className="quick-action-btn bmn" onClick={() => navigate("/tambah-aset")}>
                <span className="quick-action-icon">+</span>
                <span className="quick-action-text">
                  <strong>Tambah Aset BMN</strong>
                  <small>Input data aset tanah BMN baru</small>
                </span>
              </button>
              <button className="quick-action-btn yardip" onClick={() => navigate("/tambah-aset-yardip")}>
                <span className="quick-action-icon">+</span>
                <span className="quick-action-text">
                  <strong>Tambah Aset Yardip</strong>
                  <small>Input data aset Yardip baru</small>
                </span>
              </button>
            </div>
          </section>
        )}

        {/* Charts */}
        <section className="chart-section">
          <div className="chart-grid">
            {/* BMN Chart */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <h4 className="chart-card-title">
                    Data Aset BMN
                  </h4>
                </div>
                <button className="btn-export" onClick={() => handleExportBMN()}>
                  📄 Unduh Data Aset BMN
                </button>
              </div>
              <div className="chart-card-body">
                {/* Filters */}
                <div className="filter-panel">
                  <div className="filter-row">
                    <div className="filter-group">
                      <label className="filter-label">Filter Korem</label>
                      <select
                        className="filter-select"
                        value={selectedKorem}
                        onChange={(e) => handleKoremFilterChange(e.target.value)}
                      >
                        <option value="">Semua Korem</option>
                        {koremList.map((korem) => (
                          <option key={korem.id} value={korem.id}>
                            {korem.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label className="filter-label">Filter Kodim</label>
                      <select
                        className="filter-select"
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
                      </select>
                    </div>
                    {(selectedKorem || selectedKodim) && (
                      <button
                        className="filter-reset-btn"
                        onClick={() => {
                          handleKoremFilterChange("");
                          setSelectedKodim("");
                        }}
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: "#4285f4" }}></div>
                    <span>Bersertifikat</span>
                    <span className="legend-value">
                      ({asetTanahData.reduce((sum, i) => sum + i.bersertifikat, 0)})
                    </span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: "#ea4335" }}></div>
                    <span>Tidak Bersertifikat</span>
                      <span className="legend-value">
                      ({asetTanahData.reduce((sum, i) => sum + i.tidakBersertifikat, 0)})
                    </span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: "#34a853" }}></div>
                    <span>Total</span>
                    <span className="legend-value">
                      ({asetTanahData.reduce((sum, i) => sum + i.total, 0)})
                    </span>
                  </div>
                </div>

                {/* Chart */}
                {!loading && asetTanahData.length > 0 ? (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
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
                        <Tooltip cursor={{ style: { cursor: 'pointer' } }} />
                        <Bar 
                          dataKey="bersertifikat" 
                          fill="#4285f4" 
                          radius={[4, 4, 0, 0]}
                          onClick={handleBarClickBMN}
                          style={{ cursor: 'pointer' }}
                        />
                        <Bar 
                          dataKey="tidakBersertifikat" 
                          fill="#ea4335" 
                          radius={[4, 4, 0, 0]}
                          onClick={handleBarClickBMN}
                          style={{ cursor: 'pointer' }}
                        />
                        <Bar 
                          dataKey="total" 
                          fill="#34a853" 
                          radius={[4, 4, 0, 0]}
                          onClick={handleBarClickBMN}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="chart-empty">
                    {loading ? "Memuat data..." : "Tidak ada data untuk ditampilkan"}
                  </div>
                )}

                <button
                  className="chart-action bmn"
                  onClick={() => navigate("/data-aset-tanah")}
                >
                  Lihat Semua Data Aset BMN
                </button>
              </div>
            </div>

            {/* Yardip Chart */}
            <div className="chart-card">
              <div className="chart-card-header">
                  <h4 className="chart-card-title">
                    Data Aset Yardip
                  </h4>
                <button className="btn-export" onClick={() => handleExportYardip()}>
                  📄 Unduh Data Aset Yardip
                </button>
              </div>
              <div className="chart-card-body">
                {/* Filters */}
                <div className="filter-panel">
                  <div className="filter-row">
                    <div className="filter-group">
                      <label className="filter-label">Filter Provinsi</label>
                      <select
                        className="filter-select"
                        value={selectedProvince}
                        onChange={(e) => handleProvinceFilterChange(e.target.value)}
                      >
                        <option value="">Semua Provinsi</option>
                        {provinsiOptions.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label className="filter-label">Filter Kota</label>
                      <select
                        className="filter-select"
                        value={selectedCity}
                        onChange={(e) => handleCityFilterChange(e.target.value)}
                        disabled={!selectedProvince}
                      >
                        <option value="">
                          {selectedProvince ? "Semua Kota" : "Pilih Provinsi dulu"}
                        </option>
                        {kotaOptions.map((city) => (
                          <option key={city.value} value={city.value}>
                            {city.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(selectedProvince || selectedCity) && (
                      <button
                        className="filter-reset-btn"
                        onClick={() => {
                          handleProvinceFilterChange("");
                          setSelectedCity("");
                        }}
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: "#34a853" }}></div>
                    <span>Tanah</span>
                    <span className="legend-value">
                      ({asetYardipData.reduce((sum, i) => sum + (i.tanah || 0), 0)})
                    </span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: "#4285f4" }}></div>
                    <span>Tanah Bangunan</span>
                    <span className="legend-value">
                      ({asetYardipData.reduce((sum, i) => sum + (i.tanahBangunan || 0), 0)})
                    </span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: "#fbbc04" }}></div>
                    <span>Tanah Gudang Kantor</span>
                    <span className="legend-value">
                      ({asetYardipData.reduce((sum, i) => sum + (i.tanahGudangKantor || 0), 0)})
                    </span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: "#ea4335" }}></div>
                    <span>Ruko</span>
                    <span className="legend-value">
                      ({asetYardipData.reduce((sum, i) => sum + (i.ruko || 0), 0)})
                    </span>
                  </div>
                </div>

                {/* Chart */}
                {!loading && asetYardipData.length > 0 ? (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
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
                        <Tooltip cursor={{ style: { cursor: 'pointer' } }} />
                        <Bar 
                          dataKey="tanah" 
                          fill="#34a853" 
                          radius={[4, 4, 0, 0]}
                          onClick={handleBarClickYardip}
                          style={{ cursor: 'pointer' }}
                        />
                        <Bar 
                          dataKey="tanahBangunan" 
                          fill="#4285f4" 
                          radius={[4, 4, 0, 0]}
                          onClick={handleBarClickYardip}
                          style={{ cursor: 'pointer' }}
                        />
                        <Bar 
                          dataKey="tanahGudangKantor" 
                          fill="#fbbc04" 
                          radius={[4, 4, 0, 0]}
                          onClick={handleBarClickYardip}
                          style={{ cursor: 'pointer' }}
                        />
                        <Bar 
                          dataKey="ruko" 
                          fill="#ea4335" 
                          radius={[4, 4, 0, 0]}
                          onClick={handleBarClickYardip}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="chart-empty">
                    {loading ? "Memuat data..." : "Tidak ada data untuk ditampilkan"}
                  </div>
                )}

                <button
                  className="chart-action yardip"
                  onClick={() => navigate("/data-aset-yardip")}
                >
                  Lihat Semua Data Aset Yardip
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div className="loading-text">Memuat data...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
