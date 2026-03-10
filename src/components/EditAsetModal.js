import React, { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager } from "@react-google-maps/api";
import toast from "react-hot-toast";
import FormAset from "./FormAset";
import { parseLocation, getCentroid } from "../utils/locationUtils";
import { FaDrawPolygon, FaEdit, FaCheck, FaSave } from "react-icons/fa";
import * as turf from "@turf/turf";
import "./DetailModalAset.css";
import "./EditAsetModal.css";

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
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [isNewPolygonCreated, setIsNewPolygonCreated] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isEditingPolygon, setIsEditingPolygon] = useState(false);
  const drawingManagerRef = useRef(null);
  const formAsetRef = useRef();
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  useEffect(() => {
    if (asset) {
      const locationData = parseLocation(asset.lokasi);
      if (locationData && locationData.type === "Polygon") {
        setGeometry(locationData);
        setGeometryChanged(false);
        setIsNewPolygonCreated(false);
        setIsDrawingMode(false);
        setIsEditingPolygon(false);
      } else {
        setGeometry(null);
        setGeometryChanged(false);
        setIsNewPolygonCreated(false);
        setIsDrawingMode(false);
        setIsEditingPolygon(false);
      }
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
      }

      onSave(finalData, buktiPemilikanFile, assetPhotos, gambarTampakAtasFile);
      setGeometryChanged(false);
    }
  };

  const handlePolygonComplete = (polygon) => {
    const path = polygon.getPath();
    const coordinates = path.getArray().map(latLng => [latLng.lng(), latLng.lat()]);
    coordinates.push([...coordinates[0]]);

    const newGeometry = { type: "Polygon", coordinates: [coordinates] };

    if (drawnPolygon) drawnPolygon.setMap(null);
    setGeometry(newGeometry);
    setGeometryChanged(true);
    setDrawnPolygon(polygon);
    setIsNewPolygonCreated(true);
    setIsDrawingMode(false);
    toast.success("Poligon baru dibuat!");
    
    if (map) {
      const bounds = new window.google.maps.LatLngBounds();
      coordinates.forEach(coord => bounds.extend({ lat: coord[1], lng: coord[0] }));
      map.fitBounds(bounds);
    }
  };

  const adjustMapToPolygon = useCallback((polygonGeometry) => {
    if (!map || !polygonGeometry) return;
    const bounds = new window.google.maps.LatLngBounds();
    polygonGeometry.coordinates[0].forEach(coord => bounds.extend({ lat: coord[1], lng: coord[0] }));
    if (!bounds.isEmpty()) map.fitBounds(bounds);
  }, [map]);

  useEffect(() => {
    if (geometry && map && !isDrawingMode && !isEditingPolygon) {
      adjustMapToPolygon(geometry);
    }
  }, [geometry, map, adjustMapToPolygon, isDrawingMode, isEditingPolygon]);

  if (!isLoaded) return null;

  const initialCenter = geometry 
    ? { lat: getCentroid(geometry)[0], lng: getCentroid(geometry)[1] }
    : { lat: -7.7956, lng: 110.3695 };

  const polygonPaths = geometry ? geometry.coordinates[0].map(coord => ({ lat: coord[1], lng: coord[0] })) : [];

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
        <Modal.Title><i className="fas fa-edit me-2"></i>Edit Aset Tanah: {asset?.nama || ""}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <Row className="g-0">
          <Col md={7} className="modal-info-wrapper">
            <div className="modal-info-scrollable">
              <div style={{ padding: "20px", backgroundColor: "white" }}>
                {asset && (
                  <FormAset
                    ref={formAsetRef}
                    assetToEdit={asset}
                    koremList={koremList}
                    onCancel={onHide}
                    isEditMode={true}
                    isEnabled={true}
                    hideActionButtons={true}
                  />
                )}
              </div>
            </div>
          </Col>
          <Col md={5} className="modal-map-wrapper">
            <div style={{ position: "relative", height: "100%", minHeight: "400px" }}>
              <GoogleMap
                mapContainerStyle={{ height: "100%", width: "100%" }}
                defaultCenter={initialCenter}
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
                      editable: isEditingPolygon,
                    }}
                    onLoad={setDrawnPolygon}
                    onMouseUp={() => {
                      if (drawnPolygon && isEditingPolygon) {
                        const path = drawnPolygon.getPath();
                        const coordinates = path.getArray().map(latLng => [latLng.lng(), latLng.lat()]);
                        coordinates.push([...coordinates[0]]);
                        setGeometry({ type: "Polygon", coordinates: [coordinates] });
                        setGeometryChanged(true);
                        toast.success("Area diperbarui.");
                      }
                    }}
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

                {/* Floating Controls */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none', padding: '12px' }}>
                  <div className="d-flex justify-content-between">
                    <div style={{ pointerEvents: 'auto' }}>
                      {!geometry ? (
                        <Button variant="light" size="sm" className="shadow-sm fw-bold" onClick={() => {
                            setIsDrawingMode(true);
                            drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                            toast("Klik pada peta untuk mulai menggambar.");
                          }}>
                          <FaDrawPolygon className="me-2" />Gambar
                        </Button>
                      ) : (
                        <div className="d-flex gap-2">
                          {isNewPolygonCreated ? (
                            <Button variant="success" size="sm" className="shadow-sm fw-bold" onClick={() => { setIsNewPolygonCreated(false); setIsDrawingMode(false); forceUpdate(); toast.success("Siap disimpan!"); }}>
                              <FaCheck className="me-2" />Selesai
                            </Button>
                          ) : !isEditingPolygon ? (
                            <Button variant="light" size="sm" className="shadow-sm fw-bold" onClick={() => { 
                              setIsEditingPolygon(true); 
                              forceUpdate();
                              toast.success("Mode edit aktif."); 
                            }}>
                              <FaEdit className="me-2" />Edit Bentuk
                            </Button>
                          ) : (
                            <Button variant="success" size="sm" className="shadow-sm fw-bold" onClick={() => { 
                              setIsEditingPolygon(false); 
                              forceUpdate();
                              toast.success("Perubahan bentuk diterapkan."); 
                            }}>
                              <FaSave className="me-2" />Terapkan
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
          {isSaving ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Menyimpan...</> : "Simpan Perubahan"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditAsetModal;
