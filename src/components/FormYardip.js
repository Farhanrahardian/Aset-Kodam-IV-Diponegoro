import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col, Card, Alert } from "react-bootstrap";

const FormYardip = ({
  onSave,
  onCancel,
  initialGeometry,
  initialArea,
  isEnabled = true,
  assetToEdit = null,
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

  // Options data
  const bidangOptions = [
    "Tanah",
    "Tanah Bangunan",
    "Tanah Gudang Kantor",
    "Ruko"
  ];

  const statusOptions = [
    "Aktif", 
    "Tidak Aktif", 
    "Cadangan", 
    "Dalam Proses"
  ];

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

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.pengelola?.trim()) newErrors.pengelola = "Pengelola harus diisi";
    if (!formData.bidang?.trim()) newErrors.bidang = "Bidang harus dipilih";
    if (!formData.kabkota?.trim()) newErrors.kabkota = "Kabupaten/Kota harus diisi";
    if (!formData.kecamatan?.trim()) newErrors.kecamatan = "Kecamatan harus diisi";
    if (!formData.kelurahan?.trim()) newErrors.kelurahan = "Kelurahan/Desa harus diisi";
    if (!formData.peruntukan?.trim()) newErrors.peruntukan = "Peruntukan harus diisi";
    if (!formData.status?.trim()) newErrors.status = "Status harus dipilih";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!initialGeometry && !assetToEdit) {
      alert("Silakan gambar lokasi aset di peta terlebih dahulu");
      return;
    }

    if (validateForm()) {
      // Prepare data untuk yarsip dengan struktur yang sesuai dengan db.json
      const yarsipData = {
        ...formData,
        type: 'yarsip', // Identifier untuk jenis aset
        lokasi: initialGeometry || (assetToEdit ? assetToEdit.lokasi : null),
        area: initialArea || (assetToEdit ? assetToEdit.area : null),
        // Tambahkan timestamp untuk tracking
        created_at: assetToEdit ? assetToEdit.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onSave(yarsipData);
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
    setErrors({});
  };

  return (
    <Card>
      <Card.Header>
        <h5>{assetToEdit ? "Edit Aset Yarsip" : "Form Aset Yarsip"}</h5>
      </Card.Header>
      <Card.Body>
        {!isEnabled && !assetToEdit && (
          <div className="text-muted text-center p-4">
            <p>
              Silakan gambar lokasi di peta terlebih dahulu untuk mengaktifkan
              formulir ini.
            </p>
          </div>
        )}

        {/* Debug info untuk development */}
        {process.env.NODE_ENV === "development" && initialGeometry && (
          <Alert variant="info" className="mb-3">
            <small>
              <strong>Debug Info:</strong>
              <br />- Geometry Type: {initialGeometry.type || "Unknown"}
              <br />- Area: {initialArea ? initialArea.toFixed(2) + " m²" : "No area"}
              <br />- Storage: yarsip_assets collection
              <br />- Asset to Edit: {assetToEdit ? assetToEdit.id : "New Asset"}
            </small>
          </Alert>
        )}

        <fieldset disabled={!isEnabled && !assetToEdit}>
          <Form onSubmit={handleSubmit}>
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
                <strong>Informasi Lokasi</strong>
              </Card.Header>
              <Card.Body>
                <Form.Label>Lokasi *</Form.Label>
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

                {/* Area information if available */}
                {initialArea && (
                  <Form.Group className="mb-3">
                    <Form.Label>Luas dari Peta (m²)</Form.Label>
                    <Form.Control
                      type="text"
                      value={initialArea.toFixed(2)}
                      readOnly
                    />
                    <Form.Text className="text-muted">
                      Luas otomatis dari gambar di peta
                    </Form.Text>
                  </Form.Group>
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

            {/* Summary Information */}
            {(initialArea || assetToEdit) && (
              <Card className="mb-3">
                <Card.Header>
                  <strong>Ringkasan</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <small className="text-muted">
                        <strong>Area Tergambar:</strong>
                        <br />
                        {initialArea ? 
                          `${initialArea.toFixed(2)} m²` : 
                          (assetToEdit && assetToEdit.area ? 
                            `${Number(assetToEdit.area).toFixed(2)} m²` : 
                            "Tidak tersedia"
                          )
                        }
                      </small>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted">
                        <strong>Lokasi Lengkap:</strong>
                        <br />
                        {`${formData.kabkota || "-"}, ${formData.kecamatan || "-"}, ${formData.kelurahan || "-"}`}
                      </small>
                    </Col>
                  </Row>
                  {assetToEdit && (
                    <Row className="mt-2">
                      <Col md={12}>
                        <small className="text-muted">
                          <strong>Terakhir Diupdate:</strong>
                          <br />
                          {assetToEdit.updated_at ? 
                            new Date(assetToEdit.updated_at).toLocaleString('id-ID') : 
                            "Tidak tersedia"
                          }
                        </small>
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={onCancel}>
                Batal
              </Button>
              <div>
                <Button 
                  variant="warning" 
                  onClick={handleReset} 
                  className="me-2"
                  disabled={!isEnabled && !assetToEdit}
                >
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  variant="success" 
                  disabled={!isEnabled && !assetToEdit}
                  style={{ backgroundColor: "#28a745", border: "none" }}
                >
                  {assetToEdit ? "Update Yarsip" : "Simpan Yarsip"}
                </Button>
              </div>
            </div>
          </Form>
        </fieldset>
      </Card.Body>
    </Card>
  );
};

export default FormYardip;