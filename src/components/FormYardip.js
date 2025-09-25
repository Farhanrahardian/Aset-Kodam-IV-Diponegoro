import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Form, Button, Row, Col, Card, Alert, ButtonGroup, ToggleButton } from "react-bootstrap";
import toast from "react-hot-toast";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "xmldom";

const FormYardip = forwardRef(({
  onSave,
  onCancel,
  isEnabled = false, // Disabled by default
  selectedProvinceName,
  selectedKabupatenName,
  initialArea = 0,
  assetToEdit, // New prop for editing
  isEditMode = false, // New prop to indicate edit mode
  onKmlImport, // New prop for KML import
  onCoordsImport, // New prop for Coords import
  provinsiData, // New prop for province boundaries
  kabupatenData, // New prop for district boundaries
  onLocationChange, // New prop for form location changes
  isPolygonCreated, // New prop to check if polygon exists
}, ref) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [inputMethod, setInputMethod] = useState('draw');
  const [coordsText, setCoordsText] = useState("");
  const [coordsError, setCoordsError] = useState("");
  const [kmlFileName, setKmlFileName] = useState("");

  useImperativeHandle(ref, () => ({
    getFormData: () => ({ formData }),
  }));

  useEffect(() => {
    if (isEditMode && assetToEdit) {
      setFormData({
        pengelola: assetToEdit.pengelola || "",
        bidang: assetToEdit.bidang || "",
        kabkota: assetToEdit.kabkota || "",
        kecamatan: assetToEdit.kecamatan || "",
        kelurahan: assetToEdit.kelurahan || "",
        peruntukan: assetToEdit.peruntukan || "",
        status: assetToEdit.status || "",
        keterangan: assetToEdit.keterangan || "",
        // Include other fields from the asset that are part of the form
        provinsi: assetToEdit.provinsi || selectedProvinceName,
        area: assetToEdit.area || initialArea,
        id: assetToEdit.id, // Keep the ID for the update request
      });
    } else {
      setFormData({
        pengelola: "",
        bidang: "",
        kabkota: selectedKabupatenName || "",
        kecamatan: "",
        kelurahan: "",
        peruntukan: "",
        status: "",
        keterangan: "",
        provinsi: selectedProvinceName || "",
        area: initialArea,
      });
    }
  }, [assetToEdit, isEditMode, selectedProvinceName, selectedKabupatenName, initialArea]);


  const bidangOptions = [
    "Tanah",
    "Tanah Bangunan",
    "Tanah Gudang Kantor",
    "Ruko",
  ];

  const statusOptions = [
    "Dimiliki/Dikuasai",
    "Tidak Dimiliki/Tidak Dikuasai",
    "Lain-lain",
  ];

  // Reset form when drawing is cleared or location changes
  useEffect(() => {
    if (!isEnabled && !isEditMode) {
      handleReset();
    }
  }, [isEnabled, isEditMode]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.pengelola?.trim()) newErrors.pengelola = "Pengelola harus diisi";
    if (!formData.bidang?.trim()) newErrors.bidang = "Bidang harus dipilih";
    if (!formData.kabkota?.trim()) newErrors.kabkota = "Alamat Kabupaten/Kota harus diisi";
    if (!formData.kecamatan?.trim()) newErrors.kecamatan = "Kecamatan harus diisi";
    if (!formData.kelurahan?.trim()) newErrors.kelurahan = "Kelurahan/Desa harus diisi";
    if (!formData.peruntukan?.trim()) newErrors.peruntukan = "Peruntukan harus diisi";
    if (!formData.status?.trim()) newErrors.status = "Status harus dipilih";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  }, [validateForm, formData, onSave]);

  const handleReset = useCallback(() => {
    setFormData({
      pengelola: "",
      bidang: "",
      kabkota: "",
      kecamatan: "",
      kelurahan: "",
      peruntukan: "",
      status: "",
      keterangan: "",
    });
    setErrors({});
  }, []);

  const handleKmlFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setKmlFileName("");
      return;
    }
    setKmlFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const kmlString = e.target.result;
        const kmlDom = new DOMParser().parseFromString(kmlString, "text/xml");
        const geojsonData = kml(kmlDom);

        if (!geojsonData?.features?.length) {
          toast.error("File KML tidak valid atau tidak berisi poligon.");
          return;
        }
        const importedPolygon = geojsonData.features.find(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
        if (importedPolygon) {
          // For MultiPolygon, just take the first polygon for simplicity
          const geometry = importedPolygon.geometry.type === 'MultiPolygon' 
            ? { type: 'Polygon', coordinates: importedPolygon.geometry.coordinates[0] }
            : importedPolygon.geometry;
          onKmlImport?.(geometry);
          toast.success("Poligon dari KML berhasil diimpor!");
        } else {
          toast.error("Tidak ditemukan geometri poligon dalam file KML.");
        }
      } catch (error) {
        toast.error("Gagal memproses file KML.");
        console.error("KML parsing error:", error);
      }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset file input
  };

  const handleProcessCoords = () => {
    setCoordsError("");
    const lines = coordsText.trim().split('\n');
    if (lines.length < 3) {
      setCoordsError("Minimal dibutuhkan 3 titik koordinat untuk membuat poligon.");
      return;
    }

    const coordinates = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Support comma, space, or tab as separators
      const parts = line.split(/[\s,;\t]+/);
      if (parts.length !== 2) {
        setCoordsError(`Format salah di baris ${i + 1}. Gunakan format: longitude,latitude`);
        return;
      }
      const lon = parseFloat(parts[0].trim());
      const lat = parseFloat(parts[1].trim());
      if (isNaN(lon) || isNaN(lat) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        setCoordsError(`Koordinat tidak valid di baris ${i + 1}.`);
        return;
      }
      coordinates.push([lon, lat]);
    }

    // Close the ring if it's not already closed
    if (coordinates.length > 0 && (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
      coordinates.push(coordinates[0]);
    }

    const geojsonPolygon = { type: "Polygon", coordinates: [coordinates] };
    onCoordsImport?.(geojsonPolygon);
    toast.success("Koordinat berhasil diproses!");
  };

  return (
    <Card>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          {(!isEnabled && !isEditMode) && (
              <Alert variant="info">
                  Pilih lokasi Provinsi dan Kabupaten/Kota di peta untuk memulai.
              </Alert>
          )}

          <fieldset disabled={!isEnabled && !isEditMode}>
            {!isEditMode && isEnabled && (
              <Form.Group className="mb-3 border p-3 rounded bg-light">
                <Form.Label className="fw-bold">Pilih Metode Input Poligon</Form.Label>
                <div className="mt-2">
                  <ButtonGroup>
                    <ToggleButton
                      key="draw"
                      id="yardip-radio-draw"
                      type="radio"
                      variant="outline-primary"
                      name="inputMethod"
                      value="draw"
                      checked={inputMethod === 'draw'}
                      onChange={(e) => setInputMethod(e.currentTarget.value)}
                    >
                      Gambar di Peta
                    </ToggleButton>
                    <ToggleButton
                      key="kml"
                      id="yardip-radio-kml"
                      type="radio"
                      variant="outline-primary"
                      name="inputMethod"
                      value="kml"
                      checked={inputMethod === 'kml'}
                      onChange={(e) => setInputMethod(e.currentTarget.value)}
                    >
                      Impor KML
                    </ToggleButton>
                    <ToggleButton
                      key="coords"
                      id="yardip-radio-coords"
                      type="radio"
                      variant="outline-primary"
                      name="inputMethod"
                      value="coords"
                      checked={inputMethod === 'coords'}
                      onChange={(e) => setInputMethod(e.currentTarget.value)}
                    >
                      Input Koordinat
                    </ToggleButton>
                  </ButtonGroup>
                </div>

                {inputMethod === 'draw' && (
                  <Alert variant='secondary' className='mt-3 mb-0'>Gunakan kontrol gambar di pojok kiri atas peta untuk menggambar area aset.</Alert>
                )}

                {inputMethod === 'kml' && (
                  <Form.Group className="mt-3 mb-0">
                    <Form.Label>Upload File KML</Form.Label>
                    <Form.Control type="file" accept=".kml" onChange={handleKmlFileImport} />
                    {kmlFileName && <Form.Text className="text-success mt-1">File terpilih: <strong>{kmlFileName}</strong></Form.Text>}
                  </Form.Group>
                )}

                {inputMethod === 'coords' && (
                  <Form.Group className="mt-3 mb-0">
                    <Form.Label>Input Koordinat Manual (Format: longitude, latitude)</Form.Label>
                    <Form.Control as="textarea" rows={4} value={coordsText} onChange={(e) => setCoordsText(e.target.value)} placeholder="Satu titik per baris. Contoh:\n110.4283,-6.9904\n110.4285,-6.9910\n110.4279,-6.9908" />
                    {coordsError && <Alert variant="danger" className="mt-2 p-2">{coordsError}</Alert>}
                    <Button variant="primary" size="sm" className="mt-2" onClick={handleProcessCoords}>Proses Koordinat</Button>
                  </Form.Group>
                )}
              </Form.Group>
            )}

            <Card className="mb-3">
              <Card.Header>
                <strong>Lokasi Terpilih (dari Peta)</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Provinsi</Form.Label>
                            <Form.Select 
                                name="provinsi"
                                value={selectedProvinceName || ""} 
                                onChange={(e) => onLocationChange(e.target.value, "")} 
                                disabled={isEditMode}
                            >
                                <option value="">-- Pilih Provinsi --</option>
                                {provinsiData?.features.map(p => (
                                    <option key={p.properties.PROVINCE} value={p.properties.PROVINCE}>
                                        {p.properties.PROVINCE}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Kabupaten/Kota</Form.Label>
                            <Form.Select 
                                name="kabupaten"
                                value={selectedKabupatenName || ""} 
                                onChange={(e) => onLocationChange(selectedProvinceName, e.target.value)}
                                disabled={isEditMode || !selectedProvinceName}
                            >
                                <option value="">-- Pilih Kabupaten/Kota --</option>
                                {selectedProvinceName && kabupatenData?.features
                                    .filter(f => f.properties.PROVINCE === selectedProvinceName)
                                    .map(f => (
                                        <option key={f.properties.Kabupaten} value={f.properties.Kabupaten}>
                                            {f.properties.Kabupaten}
                                        </option>
                                    ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Form.Group className="mb-3">
                    <Form.Label>Luas Area (dari Peta)</Form.Label>
                    <Form.Control type="text" value={`${(formData.area || 0).toFixed(2)} m²`} readOnly disabled />
                </Form.Group>
              </Card.Body>
            </Card>

            {!isPolygonCreated && !isEditMode && (
              <Alert variant="warning" className="text-center">
                Silakan buat poligon di peta terlebih dahulu (gambar, impor KML, atau input koordinat) untuk mengisi detail aset.
              </Alert>
            )}

            <fieldset disabled={!isPolygonCreated}>
              <Card className="mb-3">
                <Card.Header>
                  <strong>Informasi Dasar</strong>
                </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Pengelola *</Form.Label>
                  <Form.Control
                    type="text"
                    name="pengelola"
                    value={formData.pengelola}
                    onChange={handleChange}
                    isInvalid={!!errors.pengelola}
                    required
                  />
                  <Form.Control.Feedback type="invalid">{errors.pengelola}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Bidang *</Form.Label>
                  <Form.Select name="bidang" value={formData.bidang} onChange={handleChange} isInvalid={!!errors.bidang} required>
                    <option value="">-- Pilih Bidang --</option>
                    {bidangOptions.map((bidang) => (
                      <option key={bidang} value={bidang}>{bidang}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.bidang}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Peruntukan *</Form.Label>
                  <Form.Control
                    type="text"
                    name="peruntukan"
                    value={formData.peruntukan}
                    onChange={handleChange}
                    isInvalid={!!errors.peruntukan}
                    required
                  />
                  <Form.Control.Feedback type="invalid">{errors.peruntukan}</Form.Control.Feedback>
                </Form.Group>
              </Card.Body>
            </Card>

            <Card className="mb-3">
              <Card.Header>
                <strong>Informasi Lokasi Detail</strong>
              </Card.Header>
              <Card.Body>
                <Form.Label>Alamat Lengkap *</Form.Label>
                <Row className="mb-3">
                  <Col>
                    <Form.Control type="text" placeholder="Kabupaten/Kota *" name="kabkota" value={formData.kabkota} onChange={handleChange} isInvalid={!!errors.kabkota} required />
                    <Form.Control.Feedback type="invalid">{errors.kabkota}</Form.Control.Feedback>
                  </Col>
                  <Col>
                    <Form.Control type="text" placeholder="Kecamatan *" name="kecamatan" value={formData.kecamatan} onChange={handleChange} isInvalid={!!errors.kecamatan} required />
                    <Form.Control.Feedback type="invalid">{errors.kecamatan}</Form.Control.Feedback>
                  </Col>
                  <Col>
                    <Form.Control type="text" placeholder="Kelurahan/Desa *" name="kelurahan" value={formData.kelurahan} onChange={handleChange} isInvalid={!!errors.kelurahan} required />
                    <Form.Control.Feedback type="invalid">{errors.kelurahan}</Form.Control.Feedback>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="mb-3">
              <Card.Header>
                <strong>Status dan Keterangan</strong>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select name="status" value={formData.status} onChange={handleChange} isInvalid={!!errors.status} required>
                    <option value="">-- Pilih Status --</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.status}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Keterangan</Form.Label>
                  <Form.Control as="textarea" rows={3} name="keterangan" value={formData.keterangan} onChange={handleChange} />
                </Form.Group>
              </Card.Body>
            </Card>
            </fieldset>

            {!isEditMode && (
              <Row>
                <Col>
                  <div className="d-flex justify-content-between">
                    <Button variant="secondary" onClick={onCancel}>Batal</Button>
                    <Button type="submit" variant="primary">{isEditMode ? "Simpan Perubahan" : "Simpan Aset"}</Button>
                  </div>
                </Col>
              </Row>
            )}
          </fieldset>
        </Form>
      </Card.Body>
    </Card>
  );
});

export default FormYardip;