import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Form,
  Button,
  Row,
  Col,
  Card,
  Alert,
  InputGroup,
} from "react-bootstrap";

// Utility function untuk debounce
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const FormYardip = ({
  onSave,
  onCancel,
  initialGeometry,
  initialArea,
  isEnabled = true,
  assetToEdit = null,
  kotaData = {},
  onLocationChange = () => {},
  hasDrawnArea = false,
  onAreaChange = () => {},
}) => {
  const [formData, setFormData] = useState({
    pengelola: "",
    bidang: "",
    kabkota: "",
    kecamatan: "",
    kelurahan: "",
    peruntukan: "",
    status: "",
    keterangan: "",
  });

  // Location selection states
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Manual area state
  const [manualArea, setManualArea] = useState("");
  const [isManualAreaMode, setIsManualAreaMode] = useState(false);
  const [originalDrawnArea, setOriginalDrawnArea] = useState(null);

  const [errors, setErrors] = useState({});

  // Options data
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

  // Get current effective area - fixed: using useMemo correctly
  const getCurrentArea = useMemo(() => {
    const numValue = parseFloat(manualArea);
    return !isNaN(numValue) && numValue > 0 ? numValue : originalDrawnArea || 0;
  }, [manualArea, originalDrawnArea]);

  // Debounced area change function
  const debouncedAreaChange = useMemo(
    () => debounce((numValue) => {
      if (originalDrawnArea && Math.abs(numValue - originalDrawnArea) > 0.01) {
        onAreaChange(numValue);
      }
    }, 300),
    [originalDrawnArea, onAreaChange]
  );

  // Initialize form data
  useEffect(() => {
    if (assetToEdit) {
      setFormData({
        pengelola: assetToEdit.pengelola || "",
        bidang: assetToEdit.bidang || "",
        kabkota: assetToEdit.kabkota || "",
        kecamatan: assetToEdit.kecamatan || "",
        kelurahan: assetToEdit.kelurahan || "",
        peruntukan: assetToEdit.peruntukan || "",
        status: assetToEdit.status || "",
        keterangan: assetToEdit.keterangan || "",
      });

      // Set location from asset data if editing
      if (assetToEdit.provinsi_id && assetToEdit.kota_id) {
        setSelectedProvince(assetToEdit.provinsi_id);
        setSelectedCity(assetToEdit.kota_id);
      }

      // Set area data if editing
      if (assetToEdit.area) {
        setManualArea(Number(assetToEdit.area).toFixed(2));
        setOriginalDrawnArea(Number(assetToEdit.area));
      }
    } else {
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
    }
  }, [assetToEdit]);

  // Update manual area when initial area changes (from drawing)
  useEffect(() => {
    if (initialArea && initialArea > 0) {
      const areaValue = initialArea.toFixed(2);
      setManualArea(areaValue);
      setOriginalDrawnArea(initialArea);
      setIsManualAreaMode(false); // Reset to drawn area mode when new drawing is created
    }
  }, [initialArea]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedAreaChange?.cancel) {
        debouncedAreaChange.cancel();
      }
    };
  }, [debouncedAreaChange]);

  // Handle province change - menggunakan useCallback
  const handleProvinceChange = useCallback((e) => {
    const province = e.target.value;
    setSelectedProvince(province);
    setSelectedCity(""); // Reset city when province changes
    onLocationChange(province, ""); // Notify parent component
  }, [onLocationChange]);

  // Handle city change - menggunakan useCallback
  const handleCityChange = useCallback((e) => {
    const city = e.target.value;
    setSelectedCity(city);
    onLocationChange(selectedProvince, city); // Notify parent component
  }, [selectedProvince, onLocationChange]);

  // Handle input change - menggunakan useCallback
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  }, [errors]);

  // Handle manual area change - diperbaiki dengan debouncing
  const handleManualAreaChange = useCallback((e) => {
    const value = e.target.value;
    setManualArea(value);

    // Clear area error if exists
    if (errors.manualArea) {
      setErrors((prev) => ({
        ...prev,
        manualArea: "",
      }));
    }

    // If value is valid number and different from original, enable manual mode
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && originalDrawnArea) {
      setIsManualAreaMode(Math.abs(numValue - originalDrawnArea) > 0.01);

      // Use debounced function to notify parent component
      debouncedAreaChange(numValue);
    }
  }, [errors.manualArea, originalDrawnArea, debouncedAreaChange]);

  // Reset to original drawn area - menggunakan useCallback
  const resetToDrawnArea = useCallback(() => {
    if (originalDrawnArea) {
      setManualArea(originalDrawnArea.toFixed(2));
      setIsManualAreaMode(false);
      onAreaChange(originalDrawnArea);
    }
  }, [originalDrawnArea, onAreaChange]);

  // Form validation - menggunakan useCallback
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Location validation
    if (!selectedProvince)
      newErrors.selectedProvince = "Provinsi harus dipilih";
    if (!selectedCity) newErrors.selectedCity = "Kota harus dipilih";

    // Required fields validation
    if (!formData.pengelola?.trim())
      newErrors.pengelola = "Pengelola harus diisi";
    if (!formData.bidang?.trim()) newErrors.bidang = "Bidang harus dipilih";
    if (!formData.kabkota?.trim())
      newErrors.kabkota = "Kabupaten/Kota harus diisi";
    if (!formData.kecamatan?.trim())
      newErrors.kecamatan = "Kecamatan harus diisi";
    if (!formData.kelurahan?.trim())
      newErrors.kelurahan = "Kelurahan/Desa harus diisi";
    if (!formData.peruntukan?.trim())
      newErrors.peruntukan = "Peruntukan harus diisi";
    if (!formData.status?.trim()) newErrors.status = "Status harus dipilih";

    // Manual area validation - hanya cek valid number dan > 0
    if (manualArea) {
      const numValue = parseFloat(manualArea);
      if (isNaN(numValue) || numValue <= 0) {
        newErrors.manualArea =
          "Luas harus berupa angka yang valid dan lebih dari 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedProvince, selectedCity, formData, manualArea]);

  // Submit - fixed: using getCurrentArea as value, not function
  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!selectedProvince || !selectedCity) {
      alert("Silakan pilih provinsi dan kota terlebih dahulu");
      return;
    }

    if (!hasDrawnArea && !assetToEdit) {
      alert("Silakan gambar lokasi aset di peta terlebih dahulu");
      return;
    }

    if (validateForm()) {
      // Prepare data untuk yardip dengan struktur yang sesuai dengan db.json
      const yardipData = {
        ...formData,
        type: "yardip", // Identifier untuk jenis aset
        lokasi: initialGeometry || (assetToEdit ? assetToEdit.lokasi : null),
        area: getCurrentArea, // Fixed: Use getCurrentArea as value (useMemo result)
        isManualArea: isManualAreaMode,
        originalDrawnArea: originalDrawnArea,
        // Tambahkan timestamp untuk tracking
        created_at: assetToEdit
          ? assetToEdit.created_at
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onSave(yardipData);
    }
  }, [
    selectedProvince,
    selectedCity,
    hasDrawnArea,
    assetToEdit,
    validateForm,
    formData,
    initialGeometry,
    getCurrentArea, // Fixed: This is now correctly the useMemo value
    isManualAreaMode,
    originalDrawnArea,
    onSave,
  ]);

  // Handle reset - menggunakan useCallback
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
    setManualArea("");
    setIsManualAreaMode(false);
    setOriginalDrawnArea(null);
    setErrors({});
  }, []);

  // Get selected city name - menggunakan useMemo
  const selectedCityName = useMemo(() => {
    if (!selectedProvince || !selectedCity || !kotaData[selectedProvince]) {
      return null;
    }
    const cityData = kotaData[selectedProvince].find(
      (c) => c.id === selectedCity
    );
    return cityData ? cityData.name : null;
  }, [selectedProvince, selectedCity, kotaData]);

  // Helper function untuk format area dengan unit yang sesuai
  const formatArea = useCallback((areaInM2) => {
    if (areaInM2 < 1000) {
      return `${areaInM2.toFixed(2)} m²`;
    } else if (areaInM2 < 10000) {
      return `${areaInM2.toFixed(2)} m² (${(areaInM2 / 1000).toFixed(
        2
      )} ribu m²)`;
    } else if (areaInM2 < 1000000) {
      return `${areaInM2.toFixed(2)} m² (${(areaInM2 / 10000).toFixed(2)} ha)`;
    } else {
      return `${areaInM2.toFixed(2)} m² (${(areaInM2 / 1000000).toFixed(
        2
      )} km²)`;
    }
  }, []);

  return (
    <Card>
      <Card.Header>
        <h5>
          {assetToEdit ? "Edit Aset Yardip" : "Form Aset Yardip"}
          {selectedCityName && (
            <small className="text-muted ms-2">- {selectedCityName}</small>
          )}
        </h5>
      </Card.Header>
      <Card.Body>
        {/* Debug info untuk development */}
        {process.env.NODE_ENV === "development" && (
          <Alert variant="info" className="mb-3">
            <small>
              <strong>Debug Info:</strong>
              <br />- Selected Province: {selectedProvince}
              <br />- Selected City: {selectedCity}
              <br />- Has Drawn Area: {hasDrawnArea ? "Yes" : "No"}
              {initialGeometry && (
                <>
                  <br />- Geometry Type: {initialGeometry.type || "Unknown"}
                  <br />- Original Drawn Area:{" "}
                  {originalDrawnArea
                    ? formatArea(originalDrawnArea)
                    : "No area"}
                  <br />- Manual Area: {manualArea || "No manual area"}
                  <br />- Is Manual Mode: {isManualAreaMode ? "Yes" : "No"}
                  <br />- Current Effective Area: {formatArea(getCurrentArea)}
                </>
              )}
              <br />- Storage: yardip_assets collection
              <br />- Asset to Edit:{" "}
              {assetToEdit ? assetToEdit.id : "New Asset"}
              <br />- Area Validation: No maximum limit (unlimited)
            </small>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Location Selection - Moved to form */}
          <Card className="mb-3">
            <Card.Header>
              <strong>Pilih Lokasi Target</strong>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Provinsi *</Form.Label>
                    <Form.Select
                      value={selectedProvince}
                      onChange={handleProvinceChange}
                      isInvalid={!!errors.selectedProvince}
                      required
                    >
                      <option value="">-- Pilih Provinsi --</option>
                      <option value="jateng">Jawa Tengah</option>
                      <option value="diy">DI Yogyakarta</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.selectedProvince}
                    </Form.Control.Feedback>
                    {selectedProvince && (
                      <Form.Text className="text-success">
                        {selectedProvince === "jateng"
                          ? "Jawa Tengah"
                          : "DI Yogyakarta"}{" "}
                        dipilih
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Kota/Kabupaten *</Form.Label>
                    <Form.Select
                      value={selectedCity}
                      onChange={handleCityChange}
                      disabled={!selectedProvince}
                      isInvalid={!!errors.selectedCity}
                      required
                    >
                      <option value="">-- Pilih Kota --</option>
                      {selectedProvince &&
                        kotaData[selectedProvince] &&
                        kotaData[selectedProvince].map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.selectedCity}
                    </Form.Control.Feedback>
                    {selectedCity && (
                      <Form.Text className="text-success">
                        {selectedCityName} dipilih
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {selectedProvince && selectedCity && (
                <Alert
                  variant="success"
                  className="mb-0 border-0"
                  style={{ background: "rgba(25,135,84,0.1)" }}
                >
                  <div className="d-flex align-items-center">
                    <div className="me-3"></div>
                    <div>
                      <strong>Lokasi Terpilih!</strong> Peta telah auto-zoom ke
                      area {selectedCityName}. Sekarang Anda dapat
                      menggambar lokasi aset di peta.
                    </div>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>

          {/* Drawing Status */}
          {selectedProvince && selectedCity && (
            <Card className="mb-3">
              <Card.Header>
                <strong>Status Gambar Peta</strong>
              </Card.Header>
              <Card.Body>
                {!hasDrawnArea ? (
                  <Alert variant="warning" className="mb-0">
                    <div className="d-flex align-items-center">
                      <div className="me-3"></div>
                      <div>
                        <strong>Belum Ada Gambar!</strong> Gunakan tombol
                        "Gambar Lokasi Aset" di peta untuk menggambar area aset.
                      </div>
                    </div>
                  </Alert>
                ) : (
                  <Alert variant="success" className="mb-0">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <div className="me-3"></div>
                        <div>
                          <strong>Area Sudah Digambar!</strong>
                          <br />
                          <small>
                            Luas dari gambar:{" "}
                            {originalDrawnArea
                              ? formatArea(originalDrawnArea)
                              : "N/A"}
                            {isManualAreaMode && (
                              <span className="text-warning">
                                → Diubah manual menjadi:{" "}
                                {formatArea(getCurrentArea)}
                              </span>
                            )}
                          </small>
                        </div>
                      </div>
                    </div>
                  </Alert>
                )}
              </Card.Body>
            </Card>
          )}

          <fieldset disabled={!isEnabled}>
            {/* Basic Information */}
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
                    placeholder="Masukkan nama pengelola"
                    isInvalid={!!errors.pengelola}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.pengelola}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Bidang *</Form.Label>
                  <Form.Select
                    name="bidang"
                    value={formData.bidang}
                    onChange={handleChange}
                    isInvalid={!!errors.bidang}
                    required
                  >
                    <option value="">-- Pilih Bidang --</option>
                    {bidangOptions.map((bidang) => (
                      <option key={bidang} value={bidang}>
                        {bidang}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.bidang}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Peruntukan *</Form.Label>
                  <Form.Control
                    type="text"
                    name="peruntukan"
                    value={formData.peruntukan}
                    onChange={handleChange}
                    placeholder="Masukkan peruntukan aset"
                    isInvalid={!!errors.peruntukan}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.peruntukan}
                  </Form.Control.Feedback>
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Location Information */}
            <Card className="mb-3">
              <Card.Header>
                <strong>Informasi Lokasi Detail</strong>
              </Card.Header>
              <Card.Body>
                <Form.Label>Alamat Lengkap *</Form.Label>
                <Row className="mb-3">
                  <Col>
                    <Form.Control
                      type="text"
                      placeholder="Kabupaten/Kota *"
                      name="kabkota"
                      value={formData.kabkota}
                      onChange={handleChange}
                      isInvalid={!!errors.kabkota}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.kabkota}
                    </Form.Control.Feedback>
                  </Col>
                  <Col>
                    <Form.Control
                      type="text"
                      placeholder="Kecamatan *"
                      name="kecamatan"
                      value={formData.kecamatan}
                      onChange={handleChange}
                      isInvalid={!!errors.kecamatan}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.kecamatan}
                    </Form.Control.Feedback>
                  </Col>
                  <Col>
                    <Form.Control
                      type="text"
                      placeholder="Kelurahan/Desa *"
                      name="kelurahan"
                      value={formData.kelurahan}
                      onChange={handleChange}
                      isInvalid={!!errors.kelurahan}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.kelurahan}
                    </Form.Control.Feedback>
                  </Col>
                </Row>

                {/* Enhanced Area Section - diperbaiki dengan no max limit */}
                {(originalDrawnArea || assetToEdit) && (
                  <Card className="border-info">
                    <Card.Header className="bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong>Luas Area (Tanpa Batas Maksimum)</strong>
                        {isManualAreaMode && (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={resetToDrawnArea}
                          >
                            Reset ke Gambar
                          </Button>
                        )}
                      </div>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Luas (m²)
                          {originalDrawnArea && (
                            <small className="text-muted">
                              - Dari gambar: {formatArea(originalDrawnArea)}
                            </small>
                          )}
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="number"
                            step="0.01"
                            min="0"
                            value={manualArea}
                            onChange={handleManualAreaChange}
                            placeholder="Masukkan luas area dalam m²"
                            isInvalid={!!errors.manualArea}
                          />
                          <InputGroup.Text>m²</InputGroup.Text>
                        </InputGroup>
                        <Form.Control.Feedback type="invalid">
                          {errors.manualArea}
                        </Form.Control.Feedback>

                        {isManualAreaMode ? (
                          <Form.Text className="text-warning">
                            Luas telah diubah manual dari{" "}
                            {originalDrawnArea
                              ? formatArea(originalDrawnArea)
                              : "N/A"}{" "}
                            menjadi {formatArea(getCurrentArea)}. Polygon di
                            peta akan disesuaikan.
                          </Form.Text>
                        ) : originalDrawnArea ? (
                          <Form.Text className="text-success">
                            Menggunakan luas dari gambar peta:{" "}
                            {formatArea(originalDrawnArea)}
                          </Form.Text>
                        ) : (
                          <Form.Text className="text-muted">
                            Masukkan luas area secara manual (tanpa batas
                            maksimum)
                          </Form.Text>
                        )}

                        {/* Area info helper */}
                        {getCurrentArea > 0 && (
                          <div className="mt-2">
                            <small className="text-info">
                              <strong>Area Info:</strong>{" "}
                              {formatArea(getCurrentArea)}
                              {getCurrentArea >= 1000000 && (
                                <span className="text-warning">
                                  {" "}
                                  - Area sangat besar! Pastikan data sudah
                                  benar.
                                </span>
                              )}
                            </small>
                          </div>
                        )}
                      </Form.Group>
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>

            {/* Status and Additional Information */}
            <Card className="mb-3">
              <Card.Header>
                <strong>Status dan Keterangan</strong>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    isInvalid={!!errors.status}
                    required
                  >
                    <option value="">-- Pilih Status --</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.status}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Keterangan</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="keterangan"
                    value={formData.keterangan}
                    onChange={handleChange}
                    placeholder="Masukkan keterangan tambahan (opsional)"
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Form Actions */}
            <Row>
              <Col>
                <div className="d-flex justify-content-between">
                  <div>
                    <Button
                      variant="outline-secondary"
                      onClick={handleReset}
                      className="me-2"
                    >
                      Reset Form
                    </Button>
                    <Button variant="secondary" onClick={onCancel}>
                      Batal
                    </Button>
                  </div>
                  <Button type="submit" variant="primary">
                    {assetToEdit ? "Update" : "Simpan"} Aset
                  </Button>
                </div>
              </Col>
            </Row>
          </fieldset>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default FormYardip;