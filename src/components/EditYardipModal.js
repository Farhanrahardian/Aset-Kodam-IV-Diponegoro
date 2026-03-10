import React, { useRef, useState, useEffect, useCallback, useReducer } from 'react';
import { Modal, Button, Row, Col, Form, ButtonGroup, Spinner } from 'react-bootstrap';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager } from "@react-google-maps/api";
import toast from 'react-hot-toast';
import * as turf from '@turf/turf';
import FormYardip from './FormYardip';
import { parseLocation, getCentroid } from '../utils/locationUtils';
import { FaUndo, FaRedo } from "react-icons/fa";
import "./DetailModalAset.css";
import "./EditAsetModal.css";
import "./YardipModal.css";

const libraries = ["drawing", "places", "geometry"];

const EditYardipModal = ({ show, onHide, asset, onSave, provinsiData, kabupatenData }) => {
  const formRef = useRef();
  const [formData, setFormData] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [geometryChanged, setGeometryChanged] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [map, setMap] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewPolygonCreated, setIsNewPolygonCreated] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const drawingManagerRef = useRef(null);

  const history = useRef([]);
  const historyIndex = useRef(-1);
  const pathListeners = useRef([]);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  const handleLocationChange = (provinsi, kabupaten) => {
    setFormData(prev => ({ ...prev, provinsi, kabkota: kabupaten }));
  };

  const updateHistory = useCallback(() => {
    if (drawnPolygon) {
      const currentPath = drawnPolygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
      const newHistory = history.current.slice(0, historyIndex.current + 1);
      newHistory.push(currentPath);
      history.current = newHistory;
      historyIndex.current = newHistory.length - 1;
      forceUpdate();
    }
  }, [drawnPolygon]);

  const handleUndo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      const pathToRestore = history.current[historyIndex.current];
      drawnPolygon.getPath().clear();
      pathToRestore.forEach(p => drawnPolygon.getPath().push(p));
      updateGeometryFromPath();
      forceUpdate();
    }
  };

  const handleRedo = () => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      const pathToRestore = history.current[historyIndex.current];
      drawnPolygon.getPath().clear();
      pathToRestore.forEach(p => drawnPolygon.getPath().push(p));
      updateGeometryFromPath();
      forceUpdate();
    }
  };
  
  const updateGeometryFromPath = () => {
     if (drawnPolygon) {
        const path = drawnPolygon.getPath();
        const coordinates = path.getArray().map(latLng => [latLng.lng(), latLng.lat()]);
        if (coordinates.length > 0) {
            const closedCoords = [...coordinates, coordinates[0]];
            const newGeometry = { type: "Polygon", coordinates: [closedCoords] };
            setGeometry(newGeometry);
            setGeometryChanged(true);
        }
    }
  }

  const handleMouseUp = () => {
    if (drawnPolygon && drawnPolygon.getEditable()) {
      updateGeometryFromPath();
      updateHistory();
    }
  };

  useEffect(() => {
    if (drawnPolygon) {
      pathListeners.current.forEach(listener => listener.remove());
      if (drawnPolygon.getEditable()) {
        const path = drawnPolygon.getPath();
        pathListeners.current = [
          path.addListener('insert_at', updateHistory),
          path.addListener('remove_at', updateHistory),
        ];
      }
    }
    return () => pathListeners.current.forEach(listener => listener.remove());
  }, [drawnPolygon, updateHistory]);

  useEffect(() => {
    if (asset) {
      const locationData = parseLocation(asset.lokasi);
      const initialGeometry = (locationData && locationData.type === "Polygon") ? locationData : null;
      setGeometry(initialGeometry);
      setFormData({ ...asset, lokasi: initialGeometry });
      setGeometryChanged(false);
      setIsNewPolygonCreated(false);
      setIsDrawingMode(false);
      history.current = [];
      historyIndex.current = -1;
    }
  }, [asset]);

  const handleSave = async () => {
    if (formRef.current) {
      setIsSaving(true);
      try {
        const { 
          formData: latestFormData, 
          buktiPemilikanFile, 
          filesToDelete,
          assetPhotos,
          gambarTampakAtasFile
        } = formRef.current.getFormData();
        
        let finalData = { ...latestFormData };

        if (geometryChanged && geometry) {
          finalData.area = parseFloat(turf.area(geometry).toFixed(2));
          finalData.lokasi = JSON.stringify(geometry);
        }

        await onSave(finalData, buktiPemilikanFile, filesToDelete, assetPhotos, gambarTampakAtasFile);
        setGeometryChanged(false);
      } catch (err) {
        console.error(err);
        toast.error("Gagal menyimpan perubahan.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePolygonComplete = (polygon) => {
    if (drawnPolygon) drawnPolygon.setMap(null);
    setDrawnPolygon(polygon);
    setIsNewPolygonCreated(true);
    setIsDrawingMode(false);
    updateGeometryFromPath(); 
    updateHistory();
    if (map) adjustMapToPolygon(geometry);
    toast.success("Poligon baru berhasil dibuat!");
  };

  const adjustMapToPolygon = useCallback((polygonGeometry) => {
    if (!map || !polygonGeometry) return;
    const bounds = new window.google.maps.LatLngBounds();
    polygonGeometry.coordinates[0].forEach(coord => bounds.extend({ lat: coord[1], lng: coord[0] }));
    if (!bounds.isEmpty()) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latDiff = Math.abs(ne.lat() - sw.lat()) * 0.2;
      const lngDiff = Math.abs(ne.lng() - sw.lng()) * 0.2;
      const extendedBounds = new window.google.maps.LatLngBounds();
      extendedBounds.extend(new window.google.maps.LatLng(ne.lat() + latDiff, ne.lng() + lngDiff));
      extendedBounds.extend(new window.google.maps.LatLng(sw.lat() - latDiff, sw.lng() - lngDiff));
      map.fitBounds(extendedBounds);
    }
  }, [map]);

  useEffect(() => {
    if (geometry && map && !isDrawingMode) adjustMapToPolygon(geometry);
  }, [geometry, map, adjustMapToPolygon, isDrawingMode]);

  const mapCenter = geometry ? getCentroid(geometry) : [-7.7956, 110.3695];
  const polygonPaths = geometry ? geometry.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] })) : [];

  if (!isLoaded) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="detail-modal edit-aset-modal"
      dialogClassName="modal-65vw"
      contentClassName="modal-content-65vw"
      scrollable={false}
    >
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title><i className="fas fa-edit me-2"></i>Edit Aset Yardip: {asset?.pengelola || ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <Row className="g-0">
          <Col md={7} className="modal-info-wrapper">
            <div className="modal-info-scrollable">
              <div style={{ padding: "20px", backgroundColor: "white" }}>
                {formData && (
                  <FormYardip
                    ref={formRef}
                    assetToEdit={formData}
                    isEditMode={true}
                    isEnabled={true}
                    onCancel={onHide}
                    provinsiData={provinsiData}
                    kabupatenData={kabupatenData}
                    onLocationChange={handleLocationChange}
                    hideActionButtons={true}
                    isPolygonCreated={true} /* MEMASTIKAN FORM BISA DIEDIT */
                  />
                )}
              </div>
            </div>
          </Col>
          <Col md={5} className="modal-map-wrapper">
            <div style={{ position: "relative", height: "100%", minHeight: "400px" }}>
              <GoogleMap
                mapContainerStyle={{ height: "100%", width: "100%" }}
                center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                zoom={13}
                onLoad={setMap}
                options={{
                  streetViewControl: false,
                  fullscreenControl: false,
                  mapTypeControl: false,
                  zoomControl: false,
                  gestureHandling: 'greedy',
                  disableDefaultUI: true,
                }}
              >
                {geometry && (
                  <Polygon
                    paths={polygonPaths}
                    options={{
                      fillColor: geometryChanged ? "#0000ff" : "#11998e",
                      fillOpacity: 0.4,
                      strokeColor: geometryChanged ? "#0000cc" : "#0f8a80",
                      strokeWeight: 3,
                      editable: drawnPolygon?.getEditable() || false,
                    }}
                    onLoad={setDrawnPolygon}
                    onMouseUp={handleMouseUp}
                  />
                )}

                <DrawingManager
                  onPolygonComplete={(p) => { setIsDrawingMode(false); handlePolygonComplete(p); }}
                  onLoad={dm => drawingManagerRef.current = dm}
                  options={{
                    drawingControl: false,
                    polygonOptions: { fillColor: "#0000ff", fillOpacity: 0.4, strokeColor: "#0000cc", strokeWeight: 3, editable: true },
                  }}
                />

                {/* Floating Controls - SAMAKAN DENGAN BMN */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none', padding: '12px' }}>
                  <div className="d-flex justify-content-between">
                    <div style={{ pointerEvents: 'auto' }}>
                      {!geometry ? (
                        <Button variant="light" size="sm" className="shadow-sm fw-bold" onClick={() => {
                            setIsDrawingMode(true);
                            drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                            toast("Klik pada peta untuk mulai menggambar.");
                          }}>
                          <i className="fas fa-draw-polygon me-2"></i>Gambar
                        </Button>
                      ) : (
                        <div className="d-flex gap-2">
                          {isNewPolygonCreated ? (
                            <Button variant="success" size="sm" className="shadow-sm fw-bold" onClick={() => { setIsNewPolygonCreated(false); toast.success("Poligon baru siap disimpan!"); }}>
                              <i className="fas fa-check me-2"></i>Selesai
                            </Button>
                          ) : !(drawnPolygon && drawnPolygon.getEditable()) ? (
                            <Button variant="light" size="sm" className="shadow-sm fw-bold" onClick={() => { drawnPolygon?.setEditable(true); forceUpdate(); }}>
                              <i className="fas fa-edit me-2"></i>Edit Bentuk
                            </Button>
                          ) : (
                            <Button variant="success" size="sm" className="shadow-sm fw-bold" onClick={() => { drawnPolygon?.setEditable(false); forceUpdate(); toast.success("Perubahan bentuk disimpan."); }}>
                              <i className="fas fa-save me-2"></i>Terapkan
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ pointerEvents: 'auto' }}>
                      <select className="form-select form-select-sm shadow-sm" style={{ width: "auto" }}
                        onChange={(e) => map?.setMapTypeId(e.target.value)} defaultValue="roadmap"
                      >
                        <option value="roadmap">Peta</option>
                        <option value="satellite">Satelit</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Button variant="light" size="sm" className="shadow-sm p-0 d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px", fontSize: "1.2rem" }} onClick={() => map?.setZoom(map.getZoom() + 1)}>+</Button>
                  <Button variant="light" size="sm" className="shadow-sm p-0 d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px", fontSize: "1.2rem" }} onClick={() => map?.setZoom(map.getZoom() - 1)}>-</Button>
                </div>
              </GoogleMap>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSaving}>Batal</Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : "Simpan Perubahan"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditYardipModal;
