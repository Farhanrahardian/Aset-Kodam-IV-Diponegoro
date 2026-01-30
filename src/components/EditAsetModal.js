import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager } from "@react-google-maps/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import FormAset from "./FormAset";
import { parseLocation, getCentroid } from "../utils/locationUtils";
import * as turf from "@turf/turf";

const libraries = ["drawing", "places", "geometry"];

const EditAsetModal = ({
  show,
  onHide,
  asset,
  koremList,
  onSave,
  isSaving,
}) => {
  const [geometry, setGeometry] = useState(null);
  const [geometryChanged, setGeometryChanged] = useState(false);
  const [map, setMap] = useState(null);
  const [savedMapPosition, setSavedMapPosition] = useState(null);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [isNewPolygonCreated, setIsNewPolygonCreated] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const drawingManagerRef = useRef(null);
  const formAsetRef = useRef();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  useEffect(() => {
    console.log('Asset changed:', asset);
    if (asset) {
      const locationData = parseLocation(asset.lokasi);
      console.log('Parsed location data:', locationData);
      if (locationData && locationData.type === "Polygon") {
        setGeometry(locationData);
        setGeometryChanged(false);
        // Reset flags bahwa poligon baru telah dibuat dan drawing mode saat memuat aset
        setIsNewPolygonCreated(false);
        setIsDrawingMode(false);
        console.log('Geometry set from asset');
      } else {
        setGeometry(null);
        setGeometryChanged(false);
        // Reset flags bahwa poligon baru telah dibuat dan drawing mode saat tidak ada lokasi
        setIsNewPolygonCreated(false);
        setIsDrawingMode(false);
        console.log('Geometry set to null');
      }
    } else {
      setGeometry(null);
      setGeometryChanged(false);
      // Reset flags bahwa poligon baru telah dibuat dan drawing mode saat tidak ada aset
      setIsNewPolygonCreated(false);
      setIsDrawingMode(false);
      console.log('Asset is null, geometry set to null');
    }
  }, [asset]);

  const handleSave = () => {
    if (formAsetRef.current) {
      const {
        formData: latestFormData,
        buktiPemilikanFile,
        assetPhotos,
        gambarTampakAtasFile,
      } = formAsetRef.current.getFormData();

      let finalData = { ...latestFormData };

      if (geometryChanged && geometry) {
        const area = turf.area(geometry);
        const roundedArea = parseFloat(area.toFixed(2));

        finalData.luas = roundedArea;
        finalData.lokasi = geometry;

        if (finalData.pemilikan_sertifikat === "Ya") {
          finalData.sertifikat_luas = roundedArea;
        } else {
          finalData.belum_sertifikat_luas = roundedArea;
        }
      } else {
        if (finalData.pemilikan_sertifikat === "Ya") {
          finalData.luas = finalData.sertifikat_luas;
        } else {
          finalData.luas = finalData.belum_sertifikat_luas;
        }
      }

      onSave(finalData, buktiPemilikanFile, assetPhotos, gambarTampakAtasFile);

      // Setelah menyimpan, sesuaikan kembali tampilan peta ke poligon
      if (geometry && map) {
        setTimeout(() => {
          adjustMapToPolygon(geometry);
        }, 100);
      }
    } else {
      toast.error("Tidak ada data untuk disimpan.");
    }
  };

  const handlePolygonComplete = (polygon) => {
    console.log('handlePolygonComplete dipanggil');
    const path = polygon.getPath();
    const coordinates = path.getArray().map(latLng => [
      latLng.lng(),
      latLng.lat()
    ]);
    coordinates.push([...coordinates[0]]); // Close polygon

    const newGeometry = {
      type: "Polygon",
      coordinates: [coordinates]
    };

    console.log('New geometry created:', newGeometry);

    if (drawnPolygon) {
      drawnPolygon.setMap(null);
    }

    setGeometry(newGeometry);
    setGeometryChanged(true);
    setDrawnPolygon(polygon);
    setIsNewPolygonCreated(true); // Tandai bahwa poligon baru telah dibuat
    // Reset drawing mode karena poligon telah selesai digambar
    setIsDrawingMode(false);
    toast("Poligon baru dibuat. Jangan lupa klik 'Simpan Perubahan'.");

    // Sesuaikan tampilan peta ke poligon yang baru
    if (map) {
      console.log('Adjusting map to new polygon');
      adjustMapToPolygon(newGeometry);
    }
  };

  const mapCenter = geometry
    ? getCentroid(geometry)
    : [-7.7956, 110.3695];

  const polygonPaths = geometry ? geometry.coordinates[0].map(coord => ({
    lat: coord[1],
    lng: coord[0]
  })) : [];

  // Fungsi untuk menyesuaikan tampilan peta ke poligon
  const adjustMapToPolygon = useCallback((polygonGeometry) => {
    console.log('adjustMapToPolygon called with:', polygonGeometry);
    if (!map || !polygonGeometry) {
      console.log('Map or polygonGeometry is null');
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    const coordinates = polygonGeometry.coordinates[0];

    console.log('Coordinates to extend bounds:', coordinates);
    coordinates.forEach(coord => {
      bounds.extend({ lat: coord[1], lng: coord[0] });
    });

    console.log('Bounds after extending:', bounds);
    if (!bounds.isEmpty()) {
      console.log('Bounds is not empty, proceeding...');
      // Tambahkan padding agar poligon tidak terlalu dekat dengan batas peta
      const extendedBounds = new window.google.maps.LatLngBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      console.log('NE and SW before padding:', ne, sw);
      const latDiff = Math.abs(ne.lat() - sw.lat()) * 0.2;
      const lngDiff = Math.abs(ne.lng() - sw.lng()) * 0.2;

      extendedBounds.extend(new window.google.maps.LatLng(ne.lat() + latDiff, ne.lng() + lngDiff));
      extendedBounds.extend(new window.google.maps.LatLng(sw.lat() - latDiff, sw.lng() - lngDiff));

      console.log('Extended bounds:', extendedBounds);
      // Gunakan fitBounds untuk menyesuaikan tampilan peta ke poligon
      map.fitBounds(extendedBounds);
    } else {
      console.log('Bounds is empty, cannot fit bounds');
    }
  }, [map]);

  // useEffect untuk menyesuaikan tampilan peta ke poligon saat geometry dan map tersedia
  useEffect(() => {
    console.log('useEffect for adjusting map to polygon triggered. Geometry:', geometry, 'Map:', map, 'isDrawingMode:', isDrawingMode);
    if (geometry && map) {
      console.log('Calling adjustMapToPolygon from useEffect');
      adjustMapToPolygon(geometry);
    } else {
      console.log('useEffect for adjusting map to polygon: geometry or map is null');

      // Jika geometry null tetapi savedMapPosition ada, dan bukan dalam mode menggambar, kembalikan ke posisi yang disimpan
      if (!geometry && map && savedMapPosition && !isDrawingMode) {
        console.log('Restoring map position from saved position:', savedMapPosition);
        map.setCenter({ lat: savedMapPosition.lat, lng: savedMapPosition.lng });
        map.setZoom(savedMapPosition.zoom);
      }
    }
  }, [geometry, map, adjustMapToPolygon, savedMapPosition, isDrawingMode]);

  if (!isLoaded) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Aset Tanah: {asset?.nama || ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <h5>Data Formulir</h5>
            <div
              style={{
                maxHeight: "65vh",
                overflowY: "auto",
                paddingRight: "15px",
              }}
            >
              {asset && (
                <FormAset
                  ref={formAsetRef}
                  assetToEdit={asset}
                  koremList={koremList}
                  onCancel={onHide}
                  isEditMode={true}
                  isEnabled={true}
                />
              )}
            </div>
          </Col>
          <Col md={6}>
            <h5>Edit Lokasi Peta</h5>
            <GoogleMap
              mapContainerStyle={{ height: "65vh", width: "100%" }}
              center={mapCenter[0] ? { lat: mapCenter[0], lng: mapCenter[1] } : { lat: -7.7956, lng: 110.3695 }}
              zoom={13}
              onLoad={(mapInstance) => {
                setMap(mapInstance);
                console.log('Map loaded, geometry state:', geometry);

                // Jangan panggil adjustMapToPolygon di sini karena state geometry mungkin belum diperbarui
                // Fungsi adjustMapToPolygon akan dipanggil di useEffect saat geometry dan map tersedia
              }}
              options={{
                streetViewControl: false,
                fullscreenControl: false, // Nonaktifkan kontrol fullscreen
                mapTypeControl: false, // Nonaktifkan kontrol bawaan
                zoomControl: false, // Nonaktifkan kontrol zoom default
                panControl: false,
                scaleControl: false,
                rotateControl: false,
                clickableIcons: false, // Nonaktifkan ikon yang bisa diklik
                drawingControl: false,
                keyboardShortcuts: false, // Nonaktifkan shortcut keyboard
                scrollwheel: true, // Biarkan scroll wheel aktif
                disableDoubleClickZoom: false, // Biarkan double click zoom aktif
                gestureHandling: 'greedy', // Ubah cara penanganan gestur
                disableDefaultUI: true, // Nonaktifkan UI default
              }}
            >
              {geometry && (
                <Polygon
                  paths={polygonPaths}
                  options={{
                    fillColor: geometryChanged ? "#0000ff" : "#ff0000", // Biru jika telah diubah, merah jika belum
                    fillOpacity: 0.5,
                    strokeColor: geometryChanged ? "#0000cc" : "#cc0000",
                    strokeWeight: geometryChanged ? 3 : 2,
                    editable: drawnPolygon?.getEditable() || false, // Hanya bisa diedit saat mode edit aktif
                  }}
                  onLoad={(polygon) => setDrawnPolygon(polygon)}
                  onMouseUp={() => {
                    if (drawnPolygon && drawnPolygon.getEditable()) {
                      const path = drawnPolygon.getPath();
                      const coordinates = path.getArray().map(latLng => [
                        latLng.lng(),
                        latLng.lat()
                      ]);
                      coordinates.push([...coordinates[0]]);

                      const newGeometry = {
                        type: "Polygon",
                        coordinates: [coordinates]
                      };

                      setGeometry(newGeometry);
                      setGeometryChanged(true);
                      toast("Poligon diubah. Luas akan diperbarui saat menyimpan.");

                      // Sesuaikan tampilan peta ke poligon yang diperbarui
                      adjustMapToPolygon(newGeometry);
                    }
                  }}
                />
              )}

              {/* DrawingManager untuk mengedit atau membuat ulang poligon */}
              <DrawingManager
                onPolygonComplete={(polygon) => {
                  console.log('DrawingManager onPolygonComplete called from JSX');
                  // Reset drawing mode saat poligon selesai digambar
                  setIsDrawingMode(false);
                  handlePolygonComplete(polygon);
                }}
                onLoad={(drawingManager) => {
                  drawingManagerRef.current = drawingManager;
                  console.log('DrawingManager loaded and assigned to ref');
                }}
                options={{
                  drawingControl: false, // Nonaktifkan drawing control default
                  drawingControlOptions: {
                    position: window.google?.maps?.ControlPosition?.TOP_CENTER,
                    drawingModes: isDrawingMode ? [window.google?.maps?.drawing?.OverlayType?.POLYGON] : [], // Hanya aktif saat drawing mode
                  },
                  polygonOptions: {
                    fillColor: "#0000ff",
                    fillOpacity: 0.5,
                    strokeColor: "#0000cc",
                    strokeWeight: 3,
                    editable: true,
                  },
                }}
              />
            {/* Kontrol peta */}
            <div className="map-controls-wrapper" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {/* Tombol Edit, Simpan, dan Hapus - Pojok Kiri Atas */}
              <div className="top-left-controls" style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', pointerEvents: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {!geometry ? (
                    // Tombol Gambar muncul saat tidak ada poligon
                    <button
                      className="control-button"
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        padding: '10px 15px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minWidth: '100px',
                        minHeight: '40px'
                      }}
                      onClick={() => {
                        console.log('Tombol Gambar diklik');
                        // Simpan posisi peta saat ini sebelum mengaktifkan drawing mode
                        if (map) {
                          const center = map.getCenter();
                          const currentLat = center.lat();
                          const currentLng = center.lng();
                          const currentZoom = map.getZoom();

                          setSavedMapPosition({
                            lat: currentLat,
                            lng: currentLng,
                            zoom: currentZoom
                          });

                          console.log('Posisi peta disimpan sebelum mengaktifkan drawing mode:', {
                            lat: currentLat,
                            lng: currentLng,
                            zoom: currentZoom
                          });
                        }

                        // Aktifkan drawing mode
                        setIsDrawingMode(true);

                        toast("Klik pada peta untuk mulai menggambar poligon baru.");
                        console.log('Notifikasi toast ditampilkan');
                      }}
                    >
                      <i className="fas fa-draw-polygon"></i>
                      Gambar
                    </button>
                  ) : (
                    <>
                      {isNewPolygonCreated ? (
                        // Tombol Simpan muncul saat poligon baru telah dibuat
                        <button
                          className="control-button"
                          style={{
                            backgroundColor: '#198754', // green-600
                            color: 'white',
                            border: '1px solid #198754',
                            borderRadius: '8px',
                            padding: '10px 15px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            minWidth: '100px',
                            minHeight: '40px'
                          }}
                          onClick={() => {
                            // Nonaktifkan flag bahwa poligon baru telah dibuat
                            setIsNewPolygonCreated(false);
                            // Reset drawing mode juga
                            setIsDrawingMode(false);
                            // Tidak perlu menyimpan sekarang karena poligon baru saja dibuat
                            // Fungsi ini bisa digunakan untuk menyimpan ke database jika diperlukan
                            toast.success("Poligon baru telah disimpan!");
                          }}
                        >
                          <i className="fas fa-save"></i>
                          Simpan
                        </button>
                      ) : !(drawnPolygon && drawnPolygon.getEditable()) ? (
                        // Tombol Edit muncul saat bukan dalam mode edit
                        <button
                          className="control-button"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '10px 15px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            minWidth: '100px',
                            minHeight: '40px'
                          }}
                          onClick={() => {
                            if (drawnPolygon) {
                              drawnPolygon.setEditable(true); // Aktifkan mode edit
                              // Reset flags bahwa poligon baru telah dibuat dan drawing mode karena sekarang dalam mode edit
                              setIsNewPolygonCreated(false);
                              setIsDrawingMode(false);
                              toast.success("Mode edit aktif. Seret titik-titik untuk mengubah bentuk poligon.");
                              // Sesuaikan tampilan peta ke poligon saat mode edit diaktifkan
                              adjustMapToPolygon(geometry);
                            }
                          }}
                        >
                          <i className="fas fa-edit"></i>
                          Edit
                        </button>
                      ) : (
                        // Tombol Simpan muncul saat dalam mode edit
                        <button
                          className="control-button"
                          style={{
                            backgroundColor: '#198754', // green-600
                            color: 'white',
                            border: '1px solid #198754',
                            borderRadius: '8px',
                            padding: '10px 15px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            minWidth: '100px',
                            minHeight: '40px'
                          }}
                          onClick={() => {
                            if (drawnPolygon) {
                              // Update geometry dari polygon yang diedit
                              const path = drawnPolygon.getPath();
                              const coordinates = path.getArray().map(latLng => [
                                latLng.lng(),
                                latLng.lat()
                              ]);
                              coordinates.push([...coordinates[0]]); // Close polygon

                              const newGeometry = {
                                type: "Polygon",
                                coordinates: [coordinates]
                              };

                              setGeometry(newGeometry);
                              setGeometryChanged(true);

                              // Nonaktifkan mode edit
                              drawnPolygon.setEditable(false);

                              // Reset flag bahwa poligon baru telah dibuat
                              setIsNewPolygonCreated(false);

                              toast.success("Poligon berhasil diperbarui!");

                              // Sesuaikan tampilan peta ke poligon yang diperbarui
                              adjustMapToPolygon(newGeometry);
                            }
                          }}
                        >
                          <i className="fas fa-save"></i>
                          Simpan
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Dropdown Pemilihan Peta - Pojok Kanan Atas */}
              <div className="top-right-controls" style={{ position: 'absolute', top: '15px', right: '15px', pointerEvents: 'auto' }}>
                <div className="map-type-controls" style={{ marginBottom: '5px' }}>
                  <select
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '10px 15px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s',
                      minWidth: '100px',
                      minHeight: '40px',
                      color: '#374151'
                    }}
                    onChange={(e) => {
                      if (map) {
                        map.setMapTypeId(e.target.value);
                      }
                    }}
                    defaultValue="roadmap"
                  >
                    <option value="roadmap">Peta</option>
                    <option value="satellite">Satelit</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="terrain">Terrain</option>
                  </select>
                </div>
              </div>

              {/* Zoom Controls - Bawah Kanan */}
              <div className="bottom-right-controls" style={{ position: 'absolute', bottom: '15px', right: '15px', pointerEvents: 'auto' }}>
                <div className="zoom-controls" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button
                    className="icon-button"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s',
                      minWidth: '40px',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => map && map.setZoom(map.getZoom() + 1)}
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    className="icon-button"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s',
                      minWidth: '40px',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => map && map.setZoom(map.getZoom() - 1)}
                    title="Zoom Out"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
            </GoogleMap>
            
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSaving}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span className="ms-2">Menyimpan...</span>
            </>
          ) : (
            "Simpan Perubahan"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditAsetModal;
