import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Row,
  Col,
  Card,
  Alert,
  InputGroup,
} from "react-bootstrap";

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
  onAreaChange = () => {}, // New prop for area change callback
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
      setManualArea(initialArea.toFixed(2));
      setOriginalDrawnArea(initialArea);
      setIsManualAreaMode(false); // Reset to drawn area mode when new drawing is created
    }
  }, [initialArea]);

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

  // Handle province change
  const handleProvinceChange = (e) => {
    const province = e.target.value;
    setSelectedProvince(province);
    setSelectedCity(""); // Reset city when province changes
    onLocationChange(province, ""); // Notify parent component
  };

  // Handle city change
  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    onLocationChange(selectedProvince, city); // Notify parent component
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Handle manual area change
  const handleManualAreaChange = (e) => {
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
    if (!isNaN(numValue) && numValue > 0) {
      setIsManualAreaMode(numValue !== originalDrawnArea);

      // Notify parent component about area change for map update
      if (Math.abs(numValue - originalDrawnArea) > 0.01) {
        // Only if significantly different
        onAreaChange(numValue);
      }
    }
  };

  // Reset to original drawn area
  const resetToDrawnArea = () => {
    if (originalDrawnArea) {
      setManualArea(originalDrawnArea.toFixed(2));
      setIsManualAreaMode(false);
      onAreaChange(originalDrawnArea);
    }
  };

  // Get current effective area
  const getCurrentArea = () => {
    const numValue = parseFloat(manualArea);
    return !isNaN(numValue) && numValue > 0 ? numValue : originalDrawnArea || 0;
  };

  // Form validation - DIPERBAIKI: HILANGKAN MAX AREA LIMIT
  const validateForm = () => {
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

    // Manual area validation - HANYA CEK APAKAH VALID NUMBER DAN > 0, TANPA MAX LIMIT
    if (manualArea) {
      const numValue = parseFloat(manualArea);
      if (isNaN(numValue) || numValue <= 0) {
        newErrors.manualArea =
          "Luas harus berupa angka yang valid dan lebih dari 0";
      }
      // REMOVED: Maximum area limit validation
      // } else if (numValue > 10000000) { // 10 million m² limit
      //   newErrors.manualArea = "Luas terlalu besar (maksimal 10.000.000 m²)";
      // }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = (e) => {
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
        area: getCurrentArea(), // Use current effective area (manual or drawn)
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
  };

  const handleReset = () => {
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
  };

  const getSelectedCityName = () => {
    if (!selectedProvince || !selectedCity || !kotaData[selectedProvince]) {
      return null;
    }
    const cityData = kotaData[selectedProvince].find(
      (c) => c.id === selectedCity
    );
    return cityData ? cityData.name : null;
  };

  // Helper function to format area with appropriate units
  const formatArea = (areaInM2) => {
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
  };

  return (
    <Card>
      <Card.Header>
        <h5>
          {assetToEdit ? "Edit Aset Yardip" : "Form Aset Yardip"}
          {getSelectedCityName() && (
            <small className="text-muted ms-2">- {getSelectedCityName()}</small>
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
                  <br />- Current Effective Area: {formatArea(getCurrentArea())}
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
              <strong> Pilih Lokasi Target</strong>
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
                      <option value="jateng"> Jawa Tengah</option>
                      <option value="diy"> DI Yogyakarta</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.selectedProvince}
                    </Form.Control.Feedback>
                    {selectedProvince && (
                      <Form.Text className="text-success">
                        {" "}
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
                        {getSelectedCityName()} dipilih
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
                      area {getSelectedCityName()}. Sekarang Anda dapat
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
                                {formatArea(getCurrentArea())}
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
                <strong> Informasi Dasar</strong>
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
                <strong> Informasi Lokasi Detail</strong>
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

                {/* Enhanced Area Section - UPDATED WITH NO MAX LIMIT INFO */}
                {(originalDrawnArea || assetToEdit) && (
                  <Card className="border-info">
                    <Card.Header className="bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong> Luas Area (Tanpa Batas Maksimum)</strong>
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
                            menjadi {formatArea(getCurrentArea())}. Polygon di
                            peta akan disesuaikan.
                          </Form.Text>
                        ) : originalDrawnArea ? (
                          <Form.Text className="text-success">
                            Menggunakan luas dari gambar peta:{" "}
                            {formatArea(originalDrawnArea)}
                          </Form.Text>
                        ) : (
                          <Form.Text className="text-muted">
                            📝 Masukkan luas area secara manual (tanpa batas
                            maksimum)
                          </Form.Text>
                        )}

                        {/* Area info helper */}
                        {getCurrentArea() > 0 && (
                          <div className="mt-2">
                            <small className="text-info">
                              <strong>Area Info:</strong>{" "}
                              {formatArea(getCurrentArea())}
                              {getCurrentArea() >= 1000000 && (
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
                <strong> Status dan Keterangan</strong>
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

            {/* Summary Information - UPDATED WITH BETTER AREA DISPLAY */}
            {(getCurrentArea() || assetToEdit || getSelectedCityName()) && (
              <Card className="mb-3">
                <Card.Header>
                  <strong> Ringkasan</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <small className="text-muted">
                        <strong>Lokasi Target:</strong>
                        <br />
                        {getSelectedCityName()
                          ? `${getSelectedCityName()}`
                          : "Belum dipilih"}
                        {selectedProvince && (
                          <span className="text-success">
                            {" "}
                            (
                            {selectedProvince === "jateng"
                              ? "Jawa Tengah"
                              : "DI Yogyakarta"}
                            )
                          </span>
                        )}
                      </small>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted">
                        <strong> Luas Area:</strong>
                        <br />
                        {getCurrentArea() > 0 ? (
                          <>
                            {formatArea(getCurrentArea())}
                            {isManualAreaMode && (
                              <span className="text-warning">
                                {" "}
                                (Manual Edit)
                              </span>
                            )}
                          </>
                        ) : (
                          "Belum digambar"
                        )}
                      </small>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col md={12}>
                      <small className="text-muted">
                        <strong> Alamat Lengkap:</strong>
                        <br />
                        {`${formData.kabkota || "-"}, ${
                          formData.kecamatan || "-"
                        }, ${formData.kelurahan || "-"}`}
                      </small>
                    </Col>
                  </Row>
                  {assetToEdit && (
                    <Row className="mt-2">
                      <Col md={12}>
                        <small className="text-muted">
                          <strong>🕒 Terakhir Diupdate:</strong>
                          <br />
                          {assetToEdit.updated_at
                            ? new Date(assetToEdit.updated_at).toLocaleString(
                                "id-ID"
                              )
                            : "Tidak tersedia"}
                        </small>
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Validation Summary */}
            {(!selectedProvince || !selectedCity || !hasDrawnArea) &&
              !assetToEdit && (
                <Alert variant="warning" className="mb-3">
                  <div className="fw-bold mb-2"> Sebelum Menyimpan:</div>
                  <ul className="mb-0 small">
                    {!selectedProvince && <li>Pilih provinsi</li>}
                    {!selectedCity && <li>Pilih kota/kabupaten</li>}
                    {!hasDrawnArea && <li>Gambar area di peta</li>}
                  </ul>
                </Alert>
              )}

            {/* Action Buttons */}
            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={onCancel}>
                <i className="bi bi-x-circle me-1"></i>
                Batal
              </Button>
              <div>
                <Button
                  variant="warning"
                  onClick={handleReset}
                  className="me-2"
                  disabled={!isEnabled && !assetToEdit}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  disabled={
                    (!selectedProvince ||
                      !selectedCity ||
                      (!hasDrawnArea && !assetToEdit)) &&
                    !assetToEdit
                  }
                  style={{ backgroundColor: "#28a745", border: "none" }}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  {assetToEdit ? "Update Yardip" : "Simpan Yardip"}
                </Button>
              </div>
            </div>
          </fieldset>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default FormYardip;
