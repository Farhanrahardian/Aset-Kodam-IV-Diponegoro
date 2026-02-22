import React, { useRef, useState, useEffect, useCallback, useReducer } from 'react';
import { Modal, Button, Row, Col, Form, ButtonGroup } from 'react-bootstrap';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager } from "@react-google-maps/api";
import toast from 'react-hot-toast';
import * as turf from '@turf/turf';
import FormYardip from './FormYardip';
import { parseLocation, getCentroid } from '../utils/locationUtils';
import Swal from "sweetalert2";

const libraries = ["drawing", "places", "geometry"];

const EditYardipModal = ({ show, onHide, asset, onSave, provinsiData, kabupatenData }) => {
  const formRef = useRef();
  const [formData, setFormData] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [geometryChanged, setGeometryChanged] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [map, setMap] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMapPosition, setSavedMapPosition] = useState(null);
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
      
      // If we are undoing, we don't want to create a new branch of history until a real change is made.
      // This simple implementation will overwrite the "redo" history.
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
            coordinates.push(coordinates[0]);
            const newGeometry = { type: "Polygon", coordinates: [coordinates] };
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
      pathListeners.current = [];

      if (drawnPolygon.getEditable()) {
        const path = drawnPolygon.getPath();
        // We listen for insert/remove, but handle vertex dragging on mouseUp
        const listeners = [
          path.addListener('insert_at', updateHistory),
          path.addListener('remove_at', updateHistory),
        ];
        pathListeners.current = listeners;
      }
    }
    return () => {
      pathListeners.current.forEach(listener => listener.remove());
    };
  }, [drawnPolygon, updateHistory]);


  useEffect(() => {
    if (asset) {
      const locationData = parseLocation(asset.lokasi);
      let initialGeometry = null;
      if (locationData && locationData.type === "Polygon") {
        initialGeometry = locationData;
      }
      setGeometry(initialGeometry);
      setFormData({ ...asset, lokasi: initialGeometry });
      setGeometryChanged(false);
      setIsNewPolygonCreated(false);
      setIsDrawingMode(false);
      history.current = [];
      historyIndex.current = -1;
    } else {
      setFormData(null);
      setGeometry(null);
      setGeometryChanged(false);
      setIsNewPolygonCreated(false);
      setIsDrawingMode(false);
      history.current = [];
      historyIndex.current = -1;
    }
  }, [asset]);

  const handleSave = () => {
    if (formRef.current) {
      const { formData: latestFormData, buktiPemilikanFile, filesToDelete } = formRef.current.getFormData();
      let finalData = { ...latestFormData };

      if (geometryChanged && geometry) {
        const calculatedArea = turf.area(geometry);
        finalData.area = parseFloat(calculatedArea.toFixed(2));
        finalData.lokasi = JSON.stringify(geometry);
      } else if (asset.lokasi && typeof asset.lokasi === 'string') {
        finalData.lokasi = asset.lokasi;
      } else if (asset.lokasi && typeof asset.lokasi === 'object') {
        finalData.lokasi = JSON.stringify(asset.lokasi);
      }

      onSave(finalData, buktiPemilikanFile, filesToDelete);
    }
  };

  const handlePolygonComplete = (polygon) => {
    if (drawnPolygon) {
      drawnPolygon.setMap(null);
    }
    setDrawnPolygon(polygon);
    
    setIsNewPolygonCreated(true);
    setIsDrawingMode(false);
    toast("Poligon baru dibuat. Jangan lupa klik 'Simpan Perubahan'.");

    // Must call these after setting the polygon
    updateGeometryFromPath(); 
    updateHistory();

    if (map) {
      adjustMapToPolygon(geometry);
    }
  };

  const mapCenter = geometry
    ? getCentroid(geometry)
    : [-7.7956, 110.3695];

  const polygonPaths = geometry ? geometry.coordinates[0].map(coord => ({
    lat: coord[1],
    lng: coord[0]
  })) : [];

  const adjustMapToPolygon = useCallback((polygonGeometry) => {
    if (!map || !polygonGeometry) return;
    const bounds = new window.google.maps.LatLngBounds();
    polygonGeometry.coordinates[0].forEach(coord => bounds.extend({ lat: coord[1], lng: coord[0] }));

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  }, [map]);

  useEffect(() => {
    if (geometry && map) {
      adjustMapToPolygon(geometry);
    }
  }, [geometry, map, adjustMapToPolygon]);


  if (!isLoaded) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Aset Yardip: {asset?.pengelola || ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <h5>Data Formulir</h5>
            <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '15px' }}>
              {formData && (
                <FormYardip
                  ref={formRef}
                  assetToEdit={formData}
                  isEditMode={true}
                  isEnabled={true}
                  onSave={() => { }}
                  onCancel={onHide}
                  selectedProvinceName={formData.provinsi}
                  selectedKabupatenName={formData.kabkota}
                  initialArea={formData.area}
                  provinsiData={provinsiData}
                  kabupatenData={kabupatenData}
                  onLocationChange={handleLocationChange}
                  isPolygonCreated={true}
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
              onLoad={(mapInstance) => setMap(mapInstance)}
              options={{
                streetViewControl: false,
                fullscreenControl: false,
                mapTypeControl: false,
                zoomControl: false,
                panControl: false,
                scaleControl: false,
                rotateControl: false,
                clickableIcons: false,
                drawingControl: false,
                keyboardShortcuts: false,
                scrollwheel: true,
                disableDoubleClickZoom: false,
                gestureHandling: 'greedy',
                disableDefaultUI: true,
              }}
            >
              {geometry && (
                <Polygon
                  paths={polygonPaths}
                  options={{
                    fillColor: geometryChanged ? "#0000ff" : "#ff0000",
                    fillOpacity: 0.5,
                    strokeColor: geometryChanged ? "#0000cc" : "#cc0000",
                    strokeWeight: geometryChanged ? 3 : 2,
                    editable: drawnPolygon?.getEditable() || false,
                  }}
                  onLoad={(polygon) => {
                    setDrawnPolygon(polygon);
                    // Initialize history when polygon is first loaded
                    if (polygon.getPath()) {
                        const currentPath = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                        history.current = [currentPath];
                        historyIndex.current = 0;
                    }
                  }}
                  onMouseUp={handleMouseUp}
                />
              )}

              <DrawingManager
                onPolygonComplete={handlePolygonComplete}
                onLoad={(dm) => drawingManagerRef.current = dm}
                options={{
                  drawingControl: false,
                  polygonOptions: {
                    fillColor: "#0000ff",
                    fillOpacity: 0.5,
                    strokeWeight: 3,
                    editable: true,
                  },
                }}
              />
              
            <div className="map-controls-wrapper" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <div className="top-left-controls" style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', pointerEvents: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {!geometry ? (
                    <Button
                      variant="light"
                      style={{ border: '1px solid #d1d5db' }}
                      onClick={() => {
                        if (drawingManagerRef.current) {
                           drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                           toast("Klik pada peta untuk mulai menggambar poligon baru.");
                        }
                      }}
                    >
                      <i className="fas fa-draw-polygon me-2"></i>
                      Gambar
                    </Button>
                  ) : (
                    <>
                      {!(drawnPolygon && drawnPolygon.getEditable()) ? (
                        <Button
                           variant="light"
                           style={{ border: '1px solid #d1d5db' }}
                           onClick={() => {
                            if (drawnPolygon) {
                              drawnPolygon.setEditable(true);
                              toast.success("Mode edit aktif.");
                              const currentPath = drawnPolygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                              history.current = [currentPath];
                              historyIndex.current = 0;
                              forceUpdate();
                            }
                          }}
                        >
                          <i className="fas fa-edit me-2"></i>
                          Edit
                        </Button>
                      ) : (
                        <ButtonGroup>
                          <Button
                            variant="success"
                            onClick={() => {
                              if (drawnPolygon) {
                                drawnPolygon.setEditable(false);
                                toast.success("Perubahan poligon disimpan.");
                                history.current = [];
                                historyIndex.current = -1;
                                forceUpdate();
                              }
                            }}
                          >
                            <i className="fas fa-save me-2"></i>
                            Simpan
                          </Button>
                          <Button variant="light" style={{ border: '1px solid #d1d5db' }} onClick={handleUndo} disabled={historyIndex.current <= 0}>Undo</Button>
                          <Button variant="light" style={{ border: '1px solid #d1d5db' }} onClick={handleRedo} disabled={historyIndex.current >= history.current.length - 1}>Redo</Button>
                        </ButtonGroup>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="top-right-controls" style={{ position: 'absolute', top: '15px', right: '15px', pointerEvents: 'auto' }}>
                <div className="map-type-controls">
                  <Form.Select size="sm" onChange={(e) => map && map.setMapTypeId(e.target.value)} defaultValue="roadmap">
                    <option value="roadmap">Peta</option>
                    <option value="satellite">Satelit</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="terrain">Terrain</option>
                  </Form.Select>
                </div>
              </div>

              <div className="bottom-right-controls" style={{ position: 'absolute', bottom: '15px', right: '15px', pointerEvents: 'auto' }}>
                <ButtonGroup vertical>
                  <Button variant="light" style={{ border: '1px solid #d1d5db' }} onClick={() => map && map.setZoom(map.getZoom() + 1)} title="Zoom In">+</Button>
                  <Button variant="light" style={{ border: '1px solid #d1d5db' }} onClick={() => map && map.setZoom(map.getZoom() - 1)} title="Zoom Out">-</Button>
                </ButtonGroup>
              </div>
            </div>
            </GoogleMap>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Simpan Perubahan
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditYardipModal;