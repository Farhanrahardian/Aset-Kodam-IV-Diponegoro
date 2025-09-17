import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button, Alert, Form } from "react-bootstrap";
import toast from "react-hot-toast";

const EditYardip = ({
  editingAsset,
  editedLocationData,
  editSelectedProvince,
  editSelectedCity,
  kotaData,
  onSave,
  onCancel,
  onLocationChange,
  onEditLocation,
  onCancelEditLocation,
  isEditingLocation,
}) => {
  // State untuk form data
  const [formData, setFormData] = useState({
    pengelola: "",
    bidang: "",
    kabkota: "",
    kecamatan: "",
    kelurahan: "",
    peruntukan: "",
    status: "",
    keterangan: "",
    area: 0,
  });

  // State untuk area yang dihitung dari lokasi yang sudah ada
  const [currentArea, setCurrentArea] = useState(0);
  const [hasDrawnArea, setHasDrawnArea] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data dari asset yang sedang diedit
  useEffect(() => {
    if (editingAsset) {
      console.log("Initializing form with asset:", editingAsset);

      setFormData({
        pengelola: editingAsset.pengelola || "",
        bidang: editingAsset.bidang || "",
        kabkota: editingAsset.kabkota || editingAsset.kota || "",
        kecamatan: editingAsset.kecamatan || "",
        kelurahan: editingAsset.kelurahan || "",
        peruntukan: editingAsset.peruntukan || "",
        status: editingAsset.status || "",
        keterangan: editingAsset.keterangan || "",
        area: Number(editingAsset.area) || 0,
      });

      if (editingAsset.area) {
        setCurrentArea(Number(editingAsset.area));
        setHasDrawnArea(true);
      }
    }
  }, [editingAsset]);

  // Update area jika ada lokasi baru yang digambar
  useEffect(() => {
    if (editedLocationData?.area) {
      const newArea = Number(editedLocationData.area);
      setCurrentArea(newArea);
      setFormData((prev) => ({ ...prev, area: newArea }));
      setHasDrawnArea(true);
    }
  }, [editedLocationData]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle area change manually
  const handleAreaChange = (e) => {
    const newArea = Number(e.target.value) || 0;
    setCurrentArea(newArea);
    setFormData((prev) => ({ ...prev, area: newArea }));
  };

  // Get selected city name for display
  const getSelectedCityName = () => {
    if (
      !editSelectedProvince ||
      !editSelectedCity ||
      !kotaData[editSelectedProvince]
    ) {
      return null;
    }
    const cityData = kotaData[editSelectedProvince].find(
      (c) => c.id === editSelectedCity
    );
    return cityData ? cityData.name : null;
  };

  const selectedCityName = getSelectedCityName();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi basic
    if (!formData.pengelola.trim()) {
      toast.error("Pengelola harus diisi");
      return;
    }

    if (!formData.bidang.trim()) {
      toast.error("Bidang harus diisi");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare final data untuk disimpan
      const finalFormData = {
        ...formData,
        area: currentArea,
        // Pastikan field yang required ada
        pengelola: formData.pengelola.trim(),
        bidang: formData.bidang.trim(),
        type: "yardip",
      };

      console.log("Submitting form data:", finalFormData);

      await onSave(finalFormData);
    } catch (error) {
      console.error("Form submission error:", error);
      // Error handling sudah ada di parent component
    } finally {
      setIsLoading(false);
    }
  };

  if (!editingAsset) {
    return (
      <Alert variant="warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Data aset tidak valid atau tidak ditemukan.
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <Card className="mb-3">
        <Card.Header className="bg-warning text-dark">
          <div className="d-flex justify-content-between align-items-center">
            <span>
              <i className="fas fa-edit me-2"></i>
              Edit Aset Yardip: {editingAsset.pengelola || "Unknown"}
            </span>
            <Button
              variant="outline-dark"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
            >
              <i className="fas fa-times me-1"></i>
              Batal Edit
            </Button>
          </div>
        </Card.Header>
      </Card>

      <Row>
        {/* Form Edit */}
        <Col md={12}>
          {/* Location Edit Status */}
          {editedLocationData && (
            <Alert variant="success" className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Lokasi Baru Sudah Digambar!</strong>
                  <br />
                  <small>
                    Luas baru: {editedLocationData.area?.toFixed(2)} m²
                    {editingAsset.area && (
                      <span>
                        {" "}
                        (sebelumnya: {Number(editingAsset.area).toFixed(2)} m²)
                      </span>
                    )}
                  </small>
                </div>
              </div>
            </Alert>
          )}

          {/* Current Location Info */}
          <Card className="mb-3">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">Informasi Lokasi Saat Ini</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <strong>Lokasi Target:</strong>
                  <br />
                  <span className="text-muted">
                    {selectedCityName ||
                      editingAsset.kota ||
                      editingAsset.kabkota ||
                      "Belum dipilih"}
                    {editSelectedProvince && (
                      <span>
                        {" "}
                        (
                        {editSelectedProvince === "jateng"
                          ? "Jawa Tengah"
                          : "DI Yogyakarta"}
                        )
                      </span>
                    )}
                  </span>
                </Col>
                <Col md={6}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Status Lokasi:</strong>
                      <br />
                      <span
                        className={`badge ${
                          hasDrawnArea ? "bg-success" : "bg-warning"
                        }`}
                      >
                        {hasDrawnArea ? "Ada Gambar" : "Belum Ada Gambar"}
                      </span>
                      {currentArea > 0 && (
                        <div className="mt-1">
                          <small className="text-muted">
                            Luas: {Number(currentArea).toLocaleString("id-ID")}{" "}
                            m²
                          </small>
                        </div>
                      )}
                    </div>
                    {hasDrawnArea && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={onEditLocation}
                        disabled={isEditingLocation || isLoading}
                      >
                        <i className="fas fa-map-marker-alt me-1"></i>
                        {isEditingLocation ? "Sedang Edit..." : "Edit Lokasi"}
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>

              {/* Show current location details */}
              {editingAsset.provinsi_id && editingAsset.kota_id && (
                <Row className="mt-2">
                  <Col md={12}>
                    <div className="bg-light p-2 rounded">
                      <small className="text-muted">
                        <strong>Lokasi Database:</strong>{" "}
                        <span className="badge bg-primary me-1">
                          {editingAsset.provinsi_id === "jateng"
                            ? "Jawa Tengah"
                            : "DI Yogyakarta"}
                        </span>
                        <span className="badge bg-secondary">
                          {editingAsset.kota || editingAsset.kabkota}
                        </span>
                      </small>
                    </div>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>

          {/* Form */}
          <Card>
            <Card.Header className="bg-light">
              <h6 className="mb-0">Form Edit Data</h6>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  {/* Pengelola */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>
                          Pengelola <span className="text-danger">*</span>
                        </strong>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="pengelola"
                        value={formData.pengelola}
                        onChange={handleInputChange}
                        placeholder="Masukkan nama pengelola"
                        disabled={isLoading}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* Bidang */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>
                          Bidang <span className="text-danger">*</span>
                        </strong>
                      </Form.Label>
                      <Form.Select
                        name="bidang"
                        value={formData.bidang}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        required
                      >
                        <option value="">Pilih Bidang</option>
                        <option value="Tanah">Tanah</option>
                        <option value="Tanah Bangunan">Tanah Bangunan</option>
                        <option value="Tanah Gudang Kantor">
                          Tanah Gudang Kantor
                        </option>
                        <option value="Ruko">Ruko</option>
                        <option value="Lain-lain">Lain-lain</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {/* Kota/Kabupaten */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>Kota/Kabupaten</strong>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="kabkota"
                        value={formData.kabkota}
                        onChange={handleInputChange}
                        placeholder="Masukkan kota/kabupaten"
                        disabled={isLoading}
                      />
                    </Form.Group>
                  </Col>

                  {/* Kecamatan */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>Kecamatan</strong>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="kecamatan"
                        value={formData.kecamatan}
                        onChange={handleInputChange}
                        placeholder="Masukkan kecamatan"
                        disabled={isLoading}
                      />
                    </Form.Group>
                  </Col>

                  {/* Kelurahan */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>Kelurahan/Desa</strong>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="kelurahan"
                        value={formData.kelurahan}
                        onChange={handleInputChange}
                        placeholder="Masukkan kelurahan/desa"
                        disabled={isLoading}
                      />
                    </Form.Group>
                  </Col>

                  {/* Peruntukan */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>Peruntukan</strong>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="peruntukan"
                        value={formData.peruntukan}
                        onChange={handleInputChange}
                        placeholder="Masukkan peruntukan"
                        disabled={isLoading}
                      />
                    </Form.Group>
                  </Col>

                  {/* Status */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>Status</strong>
                      </Form.Label>
                      <Form.Select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      >
                        <option value="">Pilih Status</option>
                        <option value="Dimiliki/Dikuasai">
                          Dimiliki/Dikuasai
                        </option>
                        <option value="Tidak Dimiliki/Tidak Dikuasai">
                          Tidak Dimiliki/Tidak Dikuasai
                        </option>
                        <option value="Lain-lain">Lain-lain</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {/* Area */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>Luas Area (m²)</strong>
                        {editedLocationData && (
                          <small className="text-success ms-2">
                            <i className="fas fa-info-circle"></i> Diupdate dari
                            gambar baru
                          </small>
                        )}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="area"
                        value={currentArea}
                        onChange={handleAreaChange}
                        placeholder="Masukkan luas area"
                        disabled={isLoading}
                        min="0"
                        step="0.01"
                      />
                      {currentArea > 0 && (
                        <Form.Text className="text-muted">
                          {Number(currentArea).toLocaleString("id-ID")} m²
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>

                  {/* Keterangan */}
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <strong>Keterangan</strong>
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="keterangan"
                        value={formData.keterangan}
                        onChange={handleInputChange}
                        placeholder="Masukkan keterangan tambahan"
                        disabled={isLoading}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Action Buttons */}
                <Row>
                  <Col md={12}>
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isLoading}
                      >
                        <i className="fas fa-times me-1"></i>
                        Batal
                      </Button>
                      <Button
                        variant="success"
                        type="submit"
                        disabled={
                          isLoading ||
                          !formData.pengelola.trim() ||
                          !formData.bidang.trim()
                        }
                      >
                        {isLoading ? (
                          <>
                            <i className="fas fa-spinner fa-spin me-1"></i>
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-1"></i>
                            Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EditYardip;
