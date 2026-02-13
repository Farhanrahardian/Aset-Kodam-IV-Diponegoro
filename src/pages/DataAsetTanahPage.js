import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Container, Row, Col, Spinner, Alert, Button, Card } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import * as turf from "@turf/turf";

import { parseLocation, getCentroid } from "../utils/locationUtils";
import { isGeometryNearCoastalArea } from "../utils/coastalConfig";
import { normalizeKodimName } from "../utils/kodimUtils";
import PetaAset from "../components/PetaAset";
import DetailOffcanvasAset from "../components/DetailOffcanvasAset";
import EditAsetModal from "../components/EditAsetModal";
import DetailModalAset from "../components/DetailModalAset";

const API_URL = "http://localhost:3001";

// ============= REACT QUERY: FETCH FUNCTIONS =============
const fetchAssets = async () => {
  const { data } = await axios.get(`${API_URL}/assets`);
  return data;
};

const fetchKorem = async () => {
  const { data } = await axios.get(`${API_URL}/korem`);
  return data;
};

const fetchKoremGeoJSON = async () => {
  const { data } = await axios.get('/data/korem.geojson');
  return data;
};

const fetchKodimGeoJSON = async () => {
  const { data } = await axios.get('/data/Kodim.geojson');
  return data;
};

const fetchKoremSimplified = async () => {
  const { data } = await axios.get('/data/korem_simplified.geojson');
  return data;
};

const fetchKodimSimplified = async () => {
  const { data } = await axios.get('/data/Kodim_simplified.geojson');
  return data;
};

// ============= ULTRA OPTIMIZATION: NO BUFFER CACHE! =============
// Untuk 2000 assets, buffer cache terlalu lambat (3-4 detik)
// Kita skip buffer, pakai intersection direct saja

const processAssetsForMapping = (assets) => {
  if (!assets || assets.length === 0) return [];
  
  console.time('Process 2000 assets');
  const result = assets.map((asset) => {
    const geometry = parseLocation(asset.lokasi);
    const centroid = getCentroid(geometry);
    const isCoastal = geometry ? isGeometryNearCoastalArea(geometry) : false;
    
    return {
      ...asset,
      _processed: {
        geometry,
        centroid,
        isCoastal,
        hasValidLocation: centroid !== null,
      },
    };
  });
  console.timeEnd('Process 2000 assets');
  return result;
};

// ============= AGGRESSIVE OPTIMIZATION: SKIP COASTAL BUFFER =============
const calculateAssetCountsFast = (features, processedAssets, callback) => {
  if (!features || features.length === 0) {
    callback([]);
    return;
  }
  
  // Use setTimeout untuk non-blocking
  setTimeout(() => {
    console.time('Calculate counts');
    const updatedFeatures = JSON.parse(JSON.stringify(features));
    
    updatedFeatures.forEach((f) => {
      f.properties.asset_count = 0;
    });

    processedAssets.forEach((asset) => {
      const { centroid, isCoastal, geometry, hasValidLocation } = asset._processed;
      
      if (!hasValidLocation) return;

      const point = turf.point([centroid[1], centroid[0]]);
      let foundContainingPolygon = false;

      // Standard point-in-polygon check
      for (let i = 0; i < updatedFeatures.length; i++) {
        const feature = updatedFeatures[i];
        
        if (!feature.geometry) continue;
        
        try {
          if (turf.booleanPointInPolygon(point, feature.geometry)) {
            feature.properties.asset_count++;
            foundContainingPolygon = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Coastal fallback - SKIP BUFFER, direct intersection only
      if (!foundContainingPolygon && isCoastal && geometry) {
        for (let i = 0; i < updatedFeatures.length; i++) {
          const feature = updatedFeatures[i];
          
          try {
            const assetPolygon = turf.polygon(geometry.coordinates);
            const intersection = turf.intersect(
              turf.featureCollection([assetPolygon, feature])
            );
            
            if (intersection) {
              feature.properties.asset_count++;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
    });

    console.timeEnd('Calculate counts');
    callback(updatedFeatures);
  }, 10); // Smaller delay = faster
};

// ============= HELPER FUNCTIONS =============
const getImageUrl = (asset) => {
  if (!asset) return null;
  let imageUrl =
    asset.bukti_pemilikan_url ||
    asset.bukti_pemilikan ||
    asset.bukti_kepemilikan_url ||
    asset.bukti_kepemilikan;
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/")) {
    return `${API_URL}${imageUrl}`;
  }
  return `${API_URL}/${imageUrl}`;
};

const isImageFile = (filename) => {
  if (!filename) return false;
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const isPdfFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".pdf");
};

const isVideoFile = (filename) => {
  if (!filename) return false;
  const videoExtensions = [".mp4", ".mov", ".webm", ".avi"];
  return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case "Dimiliki/Dikuasai":
      return "bg-success";
    case "TIdak Dimiliki/Dikuasai":
      return "bg-danger";
    default:
      return "bg-light text-dark";
  }
};

// ============= TABLE COMPONENT =============
const TabelAset = ({ assets, onEdit, onDelete, onViewDetail, koremList, allKodimList, userRole }) => {
  const getKodimName = (asset) => {
    const assetKodimIdentifier = String(asset.kodim || asset.kodim_id || "").trim();
    if (!assetKodimIdentifier) return "-";

    const normalizedAssetKodim = normalizeKodimName(assetKodimIdentifier);

    if (
      normalizedAssetKodim === "Kodim 0733/Kota Semarang" ||
      assetKodimIdentifier === "Kodim 0733/Semarang (BS)"
    ) {
      return "Kodim 0733/Kota Semarang";
    }

    const kodim = allKodimList.find(
      (k) =>
        k.id === assetKodimIdentifier ||
        k.nama === assetKodimIdentifier ||
        normalizeKodimName(k.nama) === normalizedAssetKodim
    );
    return kodim ? kodim.nama : asset.kodim_nama || assetKodimIdentifier || "-";
  };

  const renderLuas = (asset) => {
    const totalLuas = parseFloat(asset.luas) || 0;
    return totalLuas > 0 ? totalLuas.toLocaleString("id-ID") + " m²" : "-";
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Tidak ada data aset yang ditemukan.</p>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: "50vh", overflow: "auto" }}>
      <table
        className="table table-striped table-bordered table-hover mb-0"
        style={{ minWidth: "1200px", width: "100%" }}
      >
        <thead className="table-dark" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            <th style={{ minWidth: "120px" }}>NUP</th>
            <th style={{ minWidth: "140px" }}>Wilayah Korem</th>
            <th style={{ minWidth: "140px" }}>Wilayah Kodim</th>
            <th style={{ minWidth: "200px" }}>Alamat</th>
            <th style={{ minWidth: "120px" }}>Peruntukan</th>
            <th style={{ minWidth: "100px" }}>Status</th>
            <th style={{ minWidth: "120px" }}>Luas</th>
            <th style={{ minWidth: "100px" }}>Sertifikat</th>
            <th style={{ minWidth: "100px" }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const korem = koremList?.find((k) => k.id == asset.korem_id);
            const kodimName = getKodimName(asset);

            return (
              <tr key={asset.id}>
                <td style={{ minWidth: "120px" }}>{asset.nama || "-"}</td>
                <td style={{ minWidth: "140px" }}>{korem?.nama || "-"}</td>
                <td style={{ minWidth: "140px" }}>{kodimName}</td>
                <td style={{ minWidth: "200px" }}>
                  <div style={{ whiteSpace: "normal" }}>
                    {asset.alamat
                      ? asset.alamat.length > 40
                        ? `${asset.alamat.substring(0, 40)}...`
                        : asset.alamat
                      : "-"}
                  </div>
                </td>
                <td style={{ minWidth: "120px" }}>{asset.peruntukan || asset.fungsi || "-"}</td>
                <td style={{ minWidth: "100px" }}>
                  <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                    {asset.status || "-"}
                  </span>
                </td>
                <td style={{ minWidth: "120px" }}>{renderLuas(asset)}</td>
                <td style={{ minWidth: "100px" }}>
                  {asset.pemilikan_sertifikat === "Ya" ? (
                    <span className="badge bg-success">Ya</span>
                  ) : (
                    <span className="badge bg-danger">Tidak</span>
                  )}
                </td>
                <td style={{ minWidth: "100px" }}>
                  <div className="d-flex gap-1 flex-wrap">
                    <Button variant="info" size="sm" onClick={() => onViewDetail(asset)}>
                      Detail
                    </Button>
                    {userRole === "admin" && onEdit && (
                      <Button variant="warning" size="sm" onClick={() => onEdit(asset)}>
                        Edit
                      </Button>
                    )}
                    {userRole === "admin" && onDelete && (
                      <Button variant="danger" size="sm" onClick={() => onDelete(asset.id)}>
                        Hapus
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ============= FILTER PANEL =============
const FilterPanelTop = ({
  koremList,
  kodimList,
  allKodimList,
  selectedKorem,
  selectedKodim,
  statusFilter,
  onSelectKorem,
  onSelectKodim,
  onSelectStatus,
  onShowAll,
  totalAssets,
  filteredAssetsCount,
  assetsOnMapCount,
}) => {
  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "Dimiliki/Dikuasai", label: "Dimiliki/Dikuasai" },
    { value: "TIdak Dimiliki/Dikuasai", label: "TIdak Dimiliki/Dikuasai" },
  ];

  const filteredKodimForFilter = selectedKorem ? kodimList : allKodimList;

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Filter Data Aset BMN</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={3}>
            <div className="mb-3">
              <label className="form-label fw-bold">Wilayah Korem</label>
              <select
                className="form-select"
                value={selectedKorem?.id || ""}
                onChange={(e) => {
                  const korem = koremList?.find((k) => k.id == e.target.value);
                  onSelectKorem(korem || null);
                }}
              >
                <option value="">Semua Korem</option>
                {koremList?.map((korem) => (
                  <option key={korem.id} value={korem.id}>
                    {korem.nama === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : korem.nama}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3">
              <label className="form-label fw-bold">Wilayah Kodim</label>
              <select
                className="form-select"
                value={selectedKodim || ""}
                onChange={(e) => onSelectKodim(e.target.value)}
                disabled={!selectedKorem}
              >
                <option value="">Pilih Kodim</option>
                {filteredKodimForFilter?.map((kodim, index) => {
                  const normalizedKodimName = normalizeKodimName(kodim.nama);
                  return (
                    <option key={`${kodim.id}-${index}`} value={normalizedKodimName}>
                      {normalizedKodimName}
                    </option>
                  );
                })}
              </select>
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3">
              <label className="form-label fw-bold">Status</label>
              <select
                className="form-select"
                value={statusFilter || ""}
                onChange={(e) => onSelectStatus(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </Col>
          <Col md={3}>
            <div className="mb-3">
              <label className="form-label fw-bold">Aksi</label>
              <Button variant="outline-secondary" onClick={onShowAll} className="w-100">
                Reset Filter
              </Button>
            </div>
          </Col>
        </Row>
        <Row>
          <Col>
            <div className="bg-light p-2 rounded">
              <small className="text-muted">
                <strong>Hasil:</strong> Menampilkan <strong>{assetsOnMapCount}</strong> aset di peta dari{" "}
                <strong>{filteredAssetsCount}</strong> yang cocok dengan filter.
                {filteredAssetsCount > assetsOnMapCount && (
                  <em className="ms-2">
                    ({filteredAssetsCount - assetsOnMapCount} aset tidak memiliki lokasi valid)
                  </em>
                )}
              </small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// ============= MAIN COMPONENT =============
const DataAsetTanahPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // ============= REACT QUERY: FETCH DATA WITH CACHING =============
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: koremList = [], isLoading: koremLoading } = useQuery({
    queryKey: ['korem'],
    queryFn: fetchKorem,
    staleTime: 10 * 60 * 1000, // 10 minutes (jarang berubah)
  });

  const { data: koremGeoJSON } = useQuery({
    queryKey: ['koremGeoJSON'],
    queryFn: fetchKoremGeoJSON,
    staleTime: 30 * 60 * 1000, // 30 minutes (statis)
  });

  const { data: kodimGeoJSON } = useQuery({
    queryKey: ['kodimGeoJSON'],
    queryFn: fetchKodimGeoJSON,
    staleTime: 30 * 60 * 1000,
  });

  const { data: koremGeoJSONSimplified } = useQuery({
    queryKey: ['koremSimplified'],
    queryFn: fetchKoremSimplified,
    staleTime: 30 * 60 * 1000,
  });

  const { data: kodimGeoJSONSimplified } = useQuery({
    queryKey: ['kodimSimplified'],
    queryFn: fetchKodimSimplified,
    staleTime: 30 * 60 * 1000,
  });

  // Local state
  const [kodimList, setKodimList] = useState([]);
  const [allKodimList, setAllKodimList] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedKorem, setSelectedKorem] = useState(null);
  const [selectedKodim, setSelectedKodim] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editModalKey, setEditModalKey] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [assetForOffcanvas, setAssetForOffcanvas] = useState(null);
  const [zoomToAsset, setZoomToAsset] = useState(null);

  const [koremDataForMap, setKoremDataForMap] = useState(null);
  const [kodimDataForMap, setKodimDataForMap] = useState(null);
  const [koremDataForMapSimplified, setKoremDataForMapSimplified] = useState(null);
  const [kodimDataForMapSimplified, setKodimDataForMapSimplified] = useState(null);
  const [isCalculatingCounts, setIsCalculatingCounts] = useState(false);
  
  const calculationTimeoutRef = useRef(null);

  // Pre-process assets (memoized)
  const processedAssets = useMemo(() => {
    if (!assets || assets.length === 0) return [];
    return processAssetsForMapping(assets);
  }, [assets]);

  // Build all kodim list
  useEffect(() => {
    if (!koremList || koremList.length === 0) return;
    
    const allKodims = koremList.flatMap((korem) => {
      if (korem.nama === "Kodim 0733/Kota Semarang") {
        return [{
          id: "Kodim 0733/Kota Semarang",
          nama: "Kodim 0733/Kota Semarang",
          korem_id: korem.id,
        }];
      }
      return korem.kodim
        ? [...new Set(korem.kodim)].map((k) => ({
          id: k,
          nama: normalizeKodimName(k),
          korem_id: korem.id,
        }))
        : [];
    });
    setAllKodimList(allKodims);
  }, [koremList]);

  // ============= ULTRA FAST ASSET COUNTING =============
  useEffect(() => {
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }

    // Initialize with zero counts (INSTANT RENDER!)
    if (koremGeoJSON?.features) {
      const koremFeatures = JSON.parse(JSON.stringify(koremGeoJSON.features));
      koremFeatures.forEach((f) => { f.properties.asset_count = 0; });
      setKoremDataForMap({ ...koremGeoJSON, features: koremFeatures });
    }

    if (kodimGeoJSON?.features) {
      const kodimFeatures = JSON.parse(JSON.stringify(kodimGeoJSON.features));
      kodimFeatures.forEach((f) => { f.properties.asset_count = 0; });
      setKodimDataForMap({ ...kodimGeoJSON, features: kodimFeatures });
    }

    if (koremGeoJSONSimplified?.features) {
      const koremFeatures = JSON.parse(JSON.stringify(koremGeoJSONSimplified.features));
      koremFeatures.forEach((f) => { f.properties.asset_count = 0; });
      setKoremDataForMapSimplified({ ...koremGeoJSONSimplified, features: koremFeatures });
    }

    if (kodimGeoJSONSimplified?.features) {
      const kodimFeatures = JSON.parse(JSON.stringify(kodimGeoJSONSimplified.features));
      kodimFeatures.forEach((f) => { f.properties.asset_count = 0; });
      setKodimDataForMapSimplified({ ...kodimGeoJSONSimplified, features: kodimFeatures });
    }

    if (processedAssets.length === 0) return;

    // Debounce 300ms (faster than 500ms)
    calculationTimeoutRef.current = setTimeout(() => {
      console.log('Starting asset counting for 2000 assets...');
      setIsCalculatingCounts(true);

      // Calculate with minimal delays
      if (koremGeoJSON?.features) {
        calculateAssetCountsFast(koremGeoJSON.features, processedAssets, (updatedFeatures) => {
          setKoremDataForMap({ ...koremGeoJSON, features: updatedFeatures });
          console.log('✓ Korem counts done');
        });
      }

      setTimeout(() => {
        if (kodimGeoJSON?.features) {
          calculateAssetCountsFast(kodimGeoJSON.features, processedAssets, (updatedFeatures) => {
            setKodimDataForMap({ ...kodimGeoJSON, features: updatedFeatures });
            console.log('✓ Kodim counts done');
          });
        }
      }, 50);

      setTimeout(() => {
        if (koremGeoJSONSimplified?.features) {
          calculateAssetCountsFast(koremGeoJSONSimplified.features, processedAssets, (updatedFeatures) => {
            setKoremDataForMapSimplified({ ...koremGeoJSONSimplified, features: updatedFeatures });
            console.log('✓ Simplified Korem done');
          });
        }
      }, 100);

      setTimeout(() => {
        if (kodimGeoJSONSimplified?.features) {
          calculateAssetCountsFast(kodimGeoJSONSimplified.features, processedAssets, (updatedFeatures) => {
            setKodimDataForMapSimplified({ ...kodimGeoJSONSimplified, features: updatedFeatures });
            console.log('✓ Simplified Kodim done');
            setIsCalculatingCounts(false);
          });
        } else {
          setIsCalculatingCounts(false);
        }
      }, 150);
    }, 300); // Faster debounce

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
    };
  }, [processedAssets, koremGeoJSON, kodimGeoJSON, koremGeoJSONSimplified, kodimGeoJSONSimplified]);

  // Filter assets
  useEffect(() => {
    let filtered = assets;

    if (selectedKodim) {
      const filterKodim = normalizeKodimName(String(selectedKodim || "").trim());
      filtered = filtered.filter((asset) => {
        const assetKodim = normalizeKodimName(String(asset.kodim || "").trim());
        if (filterKodim === "Kodim 0733/Kota Semarang") {
          return (
            assetKodim === "Kodim 0733/Kota Semarang" ||
            asset.kodim === "Kodim 0733/Semarang (BS)"
          );
        }
        return assetKodim === filterKodim;
      });
    } else if (selectedKorem) {
      filtered = filtered.filter((asset) => asset.korem_id == selectedKorem.id);
    }

    if (statusFilter) {
      filtered = filtered.filter((asset) => asset.status === statusFilter);
    }

    setFilteredAssets(filtered);
  }, [selectedKorem, selectedKodim, statusFilter, assets]);

  const assetsOnMapCount = useMemo(
    () =>
      filteredAssets.filter((asset) => {
        const locationData = parseLocation(asset.lokasi);
        const centroid = getCentroid(locationData);
        return centroid !== null;
      }).length,
    [filteredAssets]
  );

  // Refresh on navigation
  useEffect(() => {
    if (location.state?.refresh) {
      queryClient.invalidateQueries(['assets']);
    }
  }, [location, queryClient]);

  // Event handlers
  const fetchKodim = useCallback((koremId) => {
    if (!koremId) {
      setKodimList([]);
      return;
    }
    
    const selectedKoremData = koremList.find((k) => k.id === koremId);
    if (selectedKoremData) {
      if (selectedKoremData.nama === "Kodim 0733/Kota Semarang") {
        setKodimList([{ id: "Kodim 0733/Kota Semarang", nama: "Kodim 0733/Kota Semarang" }]);
      } else if (selectedKoremData.kodim) {
        const uniqueKodimNames = [...new Set(selectedKoremData.kodim)];
        const kodimObjects = uniqueKodimNames.map((kName) => ({
          id: kName,
          nama: normalizeKodimName(kName),
        }));
        setKodimList(kodimObjects);
      } else {
        setKodimList([]);
      }
    } else {
      setKodimList([]);
    }
    setSelectedKodim("");
  }, [koremList]);

  const handleKoremChange = (korem) => {
    setSelectedKorem(korem || null);
    if (korem) {
      fetchKodim(korem.id);
      if (korem.nama === "Kodim 0733/Kota Semarang" || korem.nama === "Berdiri Sendiri") {
        setTimeout(() => setSelectedKodim("Kodim 0733/Kota Semarang"), 0);
      } else {
        setSelectedKodim("");
      }
    } else {
      setKodimList([]);
      setSelectedKodim("");
    }
  };

  const handleKodimChange = (kodimName) => {
    const normalizedKodimName = normalizeKodimName(kodimName || "");
    setSelectedKodim(normalizedKodimName);
    if (normalizedKodimName) {
      const kodimData = allKodimList.find((k) => normalizeKodimName(k.nama) === normalizedKodimName);
      if (kodimData) {
        const koremData = koremList.find((k) => k.id === kodimData.korem_id);
        if (koremData && selectedKorem?.id !== koremData.id) {
          setSelectedKorem(koremData);
        }
      }
    }
  };

  const handleMarkerClick = (asset) => {
    setAssetForOffcanvas(asset);
    setShowOffcanvas(true);
    setZoomToAsset(asset);
  };

  const handleViewDetail = (asset) => {
    setSelectedAssetDetail(asset);
    setShowDetailModal(true);
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setEditModalKey(Date.now());
    setShowEditModal(true);
  };

  const handleDeleteAsset = async (id) => {
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const toastId = toast.loading("Menghapus aset...");
      try {
        await axios.delete(`${API_URL}/assets/${id}`);
        queryClient.invalidateQueries(['assets']); // Invalidate cache
        toast.success("Aset berhasil dihapus.", { id: toastId });
      } catch (err) {
        toast.error("Gagal menghapus aset.", { id: toastId });
      }
    }
  };

  const handleSaveAsset = async (assetData, buktiPemilikanFile, assetPhotos, gambarTampakAtasFile) => {
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      const { id } = assetData;
      let updatedData = { ...assetData };

      // Upload files...
      if (buktiPemilikanFile) {
        const formData = new FormData();
        formData.append("bukti_pemilikan", buktiPemilikanFile);
        const uploadRes = await axios.post(`${API_URL}/upload/bukti-pemilikan`, formData);
        updatedData.bukti_pemilikan_url = uploadRes.data.url;
        updatedData.bukti_pemilikan_filename = uploadRes.data.filename;
      }

      if (assetPhotos && assetPhotos.length > 0) {
        const photosFormData = new FormData();
        assetPhotos.forEach((photo) => photosFormData.append("asset_photos", photo));
        const photosUploadRes = await axios.post(`${API_URL}/upload/asset-photos`, photosFormData);
        const newPhotoUrls = photosUploadRes.data.files.map((file) => file.url);
        updatedData.foto_aset = [...(updatedData.foto_aset || []), ...newPhotoUrls];
      }

      if (gambarTampakAtasFile) {
        const formData = new FormData();
        formData.append("foto_tampak_atas", gambarTampakAtasFile);
        const uploadRes = await axios.post(`${API_URL}/upload/foto-tampak-atas`, formData);
        updatedData.gambar_tampak_atas_url = uploadRes.data.url;
        updatedData.gambar_tampak_atas_filename = uploadRes.data.filename;
      }

      await axios.put(`${API_URL}/assets/${id}`, updatedData);
      toast.success("Aset berhasil diperbarui!", { id: toastId });
      
      // Invalidate and refetch
      queryClient.invalidateQueries(['assets']);
      
      const refreshedAsset = await axios.get(`${API_URL}/assets/${id}`);
      setEditingAsset(refreshedAsset.data);
      setEditModalKey(Date.now());
    } catch (err) {
      toast.error("Gagal menyimpan data aset.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  const isLoading = assetsLoading || koremLoading;

  if (isLoading) {
    return (
      <Container fluid className="mt-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Memuat data aset...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <h3>Data Aset BMN</h3>
      
      {isCalculatingCounts && (
        <Alert variant="info" className="mb-3">
          <small>
            <Spinner animation="border" size="sm" className="me-2" />
            Menghitung jumlah aset per wilayah (2000 assets)...
          </small>
        </Alert>
      )}

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Body style={{ height: "50vh", padding: 0 }}>
              <PetaAset
                assets={filteredAssets}
                onAssetClick={handleMarkerClick}
                asetPilihan={assetForOffcanvas}
                markerColorMode="certificate"
                koremData={koremDataForMap}
                kodimData={kodimDataForMap}
                koremDataSimplified={koremDataForMapSimplified}
                kodimDataSimplified={kodimDataForMapSimplified}
                koremFilter={selectedKorem}
                kodimFilter={selectedKodim}
                onMapKoremSelect={(props) => {
                  if (!props) {
                    handleKoremChange(null);
                    return;
                  }
                  const korem = koremList.find((k) => k.nama === props.listkodim_Korem);
                  if (korem) handleKoremChange(korem);
                }}
                onMapKodimSelect={(props) => {
                  if (!props) {
                    handleKodimChange("");
                    return;
                  }
                  handleKodimChange(normalizeKodimName(props.listkodim_Kodim));
                }}
                onMapBack={(viewState) => {
                  if (viewState.type === "nasional") {
                    handleKoremChange(null);
                    setKodimList([]);
                  }
                }}
              />
            </Card.Body>
          </Card>

          <FilterPanelTop
            koremList={koremList}
            kodimList={kodimList}
            allKodimList={allKodimList}
            selectedKorem={selectedKorem}
            selectedKodim={selectedKodim}
            statusFilter={statusFilter}
            onSelectKorem={handleKoremChange}
            onSelectKodim={handleKodimChange}
            onSelectStatus={setStatusFilter}
            onShowAll={() => {
              handleKoremChange(null);
              setSelectedKodim("");
              setStatusFilter("");
              setZoomToAsset(null);
            }}
            totalAssets={assets.length}
            filteredAssetsCount={filteredAssets.length}
            assetsOnMapCount={assetsOnMapCount}
          />

          <Card>
            <Card.Body className="p-0">
              {assets.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-folder-open fa-3x mb-3 text-muted"></i>
                  <h5>Belum Ada Data Aset BMN</h5>
                  <p>Silakan tambah aset BMN baru di halaman Tambah Aset BMN.</p>
                </div>
              ) : (
                <TabelAset
                  assets={filteredAssets}
                  onEdit={user ? handleEditAsset : null}
                  onDelete={user ? handleDeleteAsset : null}
                  onViewDetail={handleViewDetail}
                  koremList={koremList}
                  allKodimList={allKodimList}
                  userRole={user?.role}
                />
              )}
            </Card.Body>
          </Card>

          {filteredAssets.length > 0 && (
            <Card className="mt-3">
              <Card.Body>
                <Row className="text-center">
                  <Col md={4}>
                    <div className="border-end">
                      <h5 className="text-primary">{filteredAssets.length}</h5>
                      <small className="text-muted">Total Aset</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="border-end">
                      <h5 className="text-success">
                        {filteredAssets.filter((a) => a.status === "Dimiliki/Dikuasai").length}
                      </h5>
                      <small className="text-muted">Dimiliki/Dikuasai</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <h5 className="text-danger">
                      {filteredAssets.filter((a) => a.status === "TIdak Dimiliki/Dikuasai").length}
                    </h5>
                    <small className="text-muted">TIdak Dimiliki/Dikuasai</small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <DetailModalAset
        asset={selectedAssetDetail}
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        koremList={koremList}
        allKodimList={allKodimList}
        koremGeoJSON={koremGeoJSON}
        kodimGeoJSON={kodimGeoJSON}
      />

      <EditAsetModal
        key={editModalKey}
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        asset={editingAsset}
        koremList={koremList}
        onSave={handleSaveAsset}
        isSaving={isSaving}
      />

      <DetailOffcanvasAset
        show={showOffcanvas}
        handleClose={() => {
          setShowOffcanvas(false);
          setAssetForOffcanvas(null);
          setZoomToAsset(null);
        }}
        aset={assetForOffcanvas}
        koremList={koremList}
        allKodimList={allKodimList}
      />
    </Container>
  );
};

export default DataAsetTanahPage;