import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col, Card, Alert } from "react-bootstrap";

const FormAset = ({
  onSave,
  onCancel,
  koremList,
  kodimList = [],
  selectedKorem,
  selectedKodim,
  assetToEdit,
  initialGeometry,
  initialArea,
  isEnabled = true,
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (assetToEdit) {
      setFormData(assetToEdit);
    } else {
      // Reset form for new entry with all required fields
      setFormData({
        // From original form
        nama: "",
        korem_id:
          selectedKorem || (koremList.length > 0 ? koremList[0].id : ""),
        kodim: selectedKodim || "",
        luas: initialArea ? parseFloat(initialArea.toFixed(2)) : 0,

        // New required fields based on specification
        lokasi_nama: "", // Will be auto-filled from coordinates
        kib_kode_barang: "", // KIB/Kode Barang
        kode_barang: "", // Alternative field name
        nomor_registrasi: "", // Nomor Registrasi
        no_registrasi: "", // Alternative field name
        registrasi: "", // Another alternative
        nomorRegistrasi: "", // camelCase alternative
        noRegistrasi: "", // camelCase alternative
        no_reg: "", // EXACT field name used in RingkasanAset
        alamat: "",
        peruntukan: "", // Renamed from 'fungsi'
        fungsi: "", // Alternative field name
        status: "",
        asal_milik: "",
        bukti_pemilikan: "", // Renamed from 'bukti_kepemilikan'
        bukti_kepemilikan: "", // Alternative field name
        pemilikan_sertifikat: "Ya", // New field

        // Tanah dengan sertifikat
        sertifikat_bidang: "",
        sertifikat_luas: "",

        // Tanah belum sertifikat
        belum_sertifikat_bidang: "",
        belum_sertifikat_luas: "",

        // Additional info
        keterangan: "", // New field
        atas_nama_pemilik_sertifikat: "", // Keep from original

        lokasi: initialGeometry || null,
      });
    }
  }, [
    assetToEdit,
    koremList,
    kodimList,
    selectedKorem,
    selectedKodim,
    initialGeometry,
    initialArea,
  ]);

  // Auto-generate location name from coordinates with proper validation
  useEffect(() => {
    if (initialGeometry && !formData.lokasi_nama) {
      try {
        let lat, lng;

        // Debug: Log the geometry structure
        console.log("Processing geometry:", initialGeometry);

        // Handle different GeoJSON geometry types
        if (initialGeometry.type === "Point") {
          // Point geometry: coordinates = [lng, lat]
          if (
            Array.isArray(initialGeometry.coordinates) &&
            initialGeometry.coordinates.length >= 2
          ) {
            lng = initialGeometry.coordinates[0];
            lat = initialGeometry.coordinates[1];
          }
        } else if (initialGeometry.type === "Polygon") {
          // Polygon geometry: coordinates = [[[lng, lat], [lng, lat], ...]]
          if (
            Array.isArray(initialGeometry.coordinates) &&
            initialGeometry.coordinates.length > 0 &&
            Array.isArray(initialGeometry.coordinates[0]) &&
            initialGeometry.coordinates[0].length > 0 &&
            Array.isArray(initialGeometry.coordinates[0][0]) &&
            initialGeometry.coordinates[0][0].length >= 2
          ) {
            lng = initialGeometry.coordinates[0][0][0];
            lat = initialGeometry.coordinates[0][0][1];
          }
        } else if (initialGeometry.type === "LineString") {
          // LineString geometry: coordinates = [[lng, lat], [lng, lat], ...]
          if (
            Array.isArray(initialGeometry.coordinates) &&
            initialGeometry.coordinates.length > 0 &&
            Array.isArray(initialGeometry.coordinates[0]) &&
            initialGeometry.coordinates[0].length >= 2
          ) {
            lng = initialGeometry.coordinates[0][0];
            lat = initialGeometry.coordinates[0][1];
          }
        } else {
          // Fallback: try to access as nested array
          if (
            initialGeometry.coordinates &&
            Array.isArray(initialGeometry.coordinates) &&
            initialGeometry.coordinates.length > 0
          ) {
            // Try different access patterns
            const coords = initialGeometry.coordinates;
            if (Array.isArray(coords[0])) {
              if (Array.isArray(coords[0][0])) {
                // Triple nested: [[[lng, lat]]]
                lng = coords[0][0][0];
                lat = coords[0][0][1];
              } else {
                // Double nested: [[lng, lat]]
                lng = coords[0][0];
                lat = coords[0][1];
              }
            } else {
              // Single level: [lng, lat]
              lng = coords[0];
              lat = coords[1];
            }
          }
        }

        // Validate and set location name
        if (
          typeof lat === "number" &&
          typeof lng === "number" &&
          !isNaN(lat) &&
          !isNaN(lng)
        ) {
          setFormData((prev) => ({
            ...prev,
            lokasi_nama: `Lokasi ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          }));
        } else {
          console.warn(
            "Could not extract valid coordinates from geometry:",
            initialGeometry
          );
          setFormData((prev) => ({
            ...prev,
            lokasi_nama: "Lokasi dari Peta",
          }));
        }
      } catch (error) {
        console.error("Error processing geometry coordinates:", error);
        console.error("Geometry object:", initialGeometry);
        setFormData((prev) => ({
          ...prev,
          lokasi_nama: "Lokasi dari Peta",
        }));
      }
    }
  }, [initialGeometry, formData.lokasi_nama]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue =
      name === "korem_id" || name === "luas" ? Number(value) : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };

      // Sync alternative field names for compatibility
      if (name === "kib_kode_barang") {
        updated.kode_barang = newValue;
      } else if (name === "kode_barang") {
        updated.kib_kode_barang = newValue;
      } else if (name === "nomor_registrasi") {
        updated.no_registrasi = newValue;
        updated.registrasi = newValue;
        updated.nomorRegistrasi = newValue;
        updated.noRegistrasi = newValue;
        updated.no_reg = newValue; // EXACT field name used in RingkasanAset
      } else if (name === "no_registrasi") {
        updated.nomor_registrasi = newValue;
        updated.registrasi = newValue;
        updated.nomorRegistrasi = newValue;
        updated.noRegistrasi = newValue;
        updated.no_reg = newValue;
      } else if (name === "registrasi") {
        updated.nomor_registrasi = newValue;
        updated.no_registrasi = newValue;
        updated.nomorRegistrasi = newValue;
        updated.noRegistrasi = newValue;
        updated.no_reg = newValue;
      } else if (name === "peruntukan") {
        updated.fungsi = newValue;
      } else if (name === "fungsi") {
        updated.peruntukan = newValue;
      } else if (name === "bukti_pemilikan") {
        updated.bukti_kepemilikan = newValue;
      } else if (name === "bukti_kepemilikan") {
        updated.bukti_pemilikan = newValue;
      }

      return updated;
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.nama?.trim()) newErrors.nama = "Nama aset harus diisi";
    if (!formData.korem_id) newErrors.korem_id = "Korem harus dipilih";
    if (!formData.kodim?.trim()) newErrors.kodim = "Kodim harus diisi";
    if (!formData.lokasi_nama?.trim())
      newErrors.lokasi_nama = "Nama lokasi harus diisi";
    if (!formData.kib_kode_barang?.trim())
      newErrors.kib_kode_barang = "KIB/Kode Barang harus diisi";
    if (!formData.nomor_registrasi?.trim())
      newErrors.nomor_registrasi = "Nomor Registrasi harus diisi";
    if (!formData.alamat?.trim()) newErrors.alamat = "Alamat harus diisi";
    if (!formData.peruntukan?.trim())
      newErrors.peruntukan = "Peruntukan harus diisi";
    if (!formData.status?.trim()) newErrors.status = "Status harus dipilih";
    if (!formData.asal_milik?.trim())
      newErrors.asal_milik = "Asal Milik harus diisi";

    // Validate numbers
    if (formData.sertifikat_bidang && isNaN(formData.sertifikat_bidang)) {
      newErrors.sertifikat_bidang = "Bidang sertifikat harus berupa angka";
    }
    if (formData.sertifikat_luas && isNaN(formData.sertifikat_luas)) {
      newErrors.sertifikat_luas = "Luas sertifikat harus berupa angka";
    }
    if (
      formData.belum_sertifikat_bidang &&
      isNaN(formData.belum_sertifikat_bidang)
    ) {
      newErrors.belum_sertifikat_bidang =
        "Bidang belum sertifikat harus berupa angka";
    }
    if (
      formData.belum_sertifikat_luas &&
      isNaN(formData.belum_sertifikat_luas)
    ) {
      newErrors.belum_sertifikat_luas =
        "Luas belum sertifikat harus berupa angka";
    }

    // Validate that at least one of sertifikat or belum sertifikat is filled
    const hasSertifikat =
      formData.sertifikat_bidang || formData.sertifikat_luas;
    const hasBelumSertifikat =
      formData.belum_sertifikat_bidang || formData.belum_sertifikat_luas;

    if (!hasSertifikat && !hasBelumSertifikat) {
      newErrors.tanah_data =
        "Minimal salah satu data tanah (sertifikat atau belum sertifikat) harus diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!initialGeometry && !assetToEdit) {
      alert("Silakan gambar lokasi aset di peta terlebih dahulu");
      return;
    }

    if (validateForm()) {
      // Calculate total luas
      const totalLuas =
        (parseFloat(formData.sertifikat_luas) || 0) +
        (parseFloat(formData.belum_sertifikat_luas) || 0);

      const assetData = {
        ...formData,
        luas_total: totalLuas,
        luas_gambar: initialArea, // From map drawing

        // Ensure compatibility with RingkasanAset component
        kode_barang: formData.kib_kode_barang || formData.kode_barang || "",
        no_registrasi:
          formData.nomor_registrasi ||
          formData.no_registrasi ||
          formData.registrasi ||
          "",
        registrasi:
          formData.nomor_registrasi ||
          formData.no_registrasi ||
          formData.registrasi ||
          "",
        no_reg:
          formData.nomor_registrasi ||
          formData.no_registrasi ||
          formData.registrasi ||
          formData.no_reg ||
          "",
        fungsi: formData.peruntukan || formData.fungsi || "",
        bukti_kepemilikan:
          formData.bukti_pemilikan || formData.bukti_kepemilikan || "",
      };

      onSave(assetData);
    }
  };

  const handleReset = () => {
    setFormData({
      nama: "",
      korem_id: selectedKorem || (koremList.length > 0 ? koremList[0].id : ""),
      kodim: selectedKodim || "",
      luas: initialArea ? parseFloat(initialArea.toFixed(2)) : 0,
      lokasi_nama: "",
      kib_kode_barang: "",
      kode_barang: "", // Alternative field name
      nomor_registrasi: "",
      no_registrasi: "", // Alternative field name
      registrasi: "", // Another alternative
      nomorRegistrasi: "", // camelCase alternative
      noRegistrasi: "", // camelCase alternative
      alamat: "",
      peruntukan: "",
      fungsi: "", // Alternative field name
      status: "",
      asal_milik: "",
      bukti_pemilikan: "",
      bukti_kepemilikan: "", // Alternative field name
      pemilikan_sertifikat: "Ya",
      sertifikat_bidang: "",
      sertifikat_luas: "",
      belum_sertifikat_bidang: "",
      belum_sertifikat_luas: "",
      keterangan: "",
      atas_nama_pemilik_sertifikat: "",
      lokasi: initialGeometry || null,
    });
    setErrors({});
  };

  const statusOptions = [
    { value: "Aktif", label: "Aktif" },
    { value: "Tidak Aktif", label: "Tidak Aktif" },
    { value: "Dalam Proses", label: "Dalam Proses" },
    { value: "Sengketa", label: "Sengketa" },
  ];

  const asalMilikOptions = [
    { value: "Pembelian", label: "Pembelian" },
    { value: "Hibah", label: "Hibah" },
    { value: "Warisan", label: "Warisan" },
    { value: "Tukar Menukar", label: "Tukar Menukar" },
    { value: "Lainnya", label: "Lainnya" },
  ];

  const buktiPemilikanOptions = [
    { value: "Sertifikat Hak Milik", label: "Sertifikat Hak Milik" },
    {
      value: "Sertifikat Hak Guna Bangunan",
      label: "Sertifikat Hak Guna Bangunan",
    },
    { value: "Sertifikat Hak Pakai", label: "Sertifikat Hak Pakai" },
    { value: "Girik", label: "Girik" },
    { value: "Letter C", label: "Letter C" },
    { value: "Lainnya", label: "Lainnya" },
  ];

  return (
    <Card>
      <Card.Header>
        <h5>{assetToEdit ? "Edit Detail Aset" : "Lengkapi Detail Aset"}</h5>
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

        {/* Debug geometry info in development */}
        {process.env.NODE_ENV === "development" && initialGeometry && (
          <Alert variant="info" className="mb-3">
            <small>
              <strong>Debug Geometry:</strong>
              <br />- Type: {initialGeometry.type || "Unknown"}
              <br />- Has coordinates:{" "}
              {initialGeometry.coordinates ? "Yes" : "No"}
              <br />- Coordinates length:{" "}
              {Array.isArray(initialGeometry.coordinates)
                ? initialGeometry.coordinates.length
                : "Not array"}
              <br />- Area:{" "}
              {initialArea ? initialArea.toFixed(2) + " m²" : "No area"}
            </small>
          </Alert>
        )}

        <fieldset disabled={!isEnabled && !assetToEdit}>
          <Form>
            {/* Basic Asset Info */}
            <Card className="mb-3">
              <Card.Header>
                <strong>Informasi Dasar Aset</strong>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Nama Aset *</Form.Label>
                  <Form.Control
                    type="text"
                    name="nama"
                    value={formData.nama || ""}
                    onChange={handleChange}
                    placeholder="Masukkan nama aset"
                    isInvalid={!!errors.nama}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.nama}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>1. Wilayah Korem *</Form.Label>
                      <Form.Select
                        name="korem_id"
                        value={formData.korem_id || ""}
                        onChange={handleChange}
                        isInvalid={!!errors.korem_id}
                      >
                        <option value="">-- Pilih Korem --</option>
                        {koremList.map((korem) => (
                          <option key={korem.id} value={korem.id}>
                            {korem.nama}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.korem_id}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>2. Kodim *</Form.Label>
                      {kodimList.length > 0 ? (
                        <Form.Select
                          name="kodim"
                          value={formData.kodim || ""}
                          onChange={handleChange}
                          isInvalid={!!errors.kodim}
                        >
                          <option value="">-- Pilih Kodim --</option>
                          {kodimList.map((kodim) => (
                            <option key={kodim.id} value={kodim.id}>
                              {kodim.nama}
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <Form.Control
                          type="text"
                          name="kodim"
                          value={formData.kodim || ""}
                          onChange={handleChange}
                          placeholder="Contoh: Kodim 0701/Banyumas"
                          isInvalid={!!errors.kodim}
                          required
                        />
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.kodim}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>3. Nama Lokasi *</Form.Label>
                  <Form.Control
                    type="text"
                    name="lokasi_nama"
                    value={formData.lokasi_nama || ""}
                    onChange={handleChange}
                    placeholder="Masukkan nama lokasi"
                    isInvalid={!!errors.lokasi_nama}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.lokasi_nama}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Nama lokasi akan otomatis terisi berdasarkan titik yang
                    digambar di peta
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Asset Registration Details */}
            <Card className="mb-3">
              <Card.Header>
                <strong>Detail Registrasi Aset</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>4. KIB/Kode Barang *</Form.Label>
                      <Form.Control
                        type="text"
                        name="kib_kode_barang"
                        value={formData.kib_kode_barang || ""}
                        onChange={handleChange}
                        placeholder="Contoh: 1.3.1.01.001"
                        isInvalid={!!errors.kib_kode_barang}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.kib_kode_barang}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>5. Nomor Registrasi *</Form.Label>
                      <Form.Control
                        type="text"
                        name="nomor_registrasi"
                        value={formData.nomor_registrasi || ""}
                        onChange={handleChange}
                        placeholder="Masukkan nomor registrasi"
                        isInvalid={!!errors.nomor_registrasi}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.nomor_registrasi}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>6. Alamat *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="alamat"
                    value={formData.alamat || ""}
                    onChange={handleChange}
                    placeholder="Masukkan alamat lengkap"
                    isInvalid={!!errors.alamat}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.alamat}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>7. Peruntukan *</Form.Label>
                      <Form.Control
                        type="text"
                        name="peruntukan"
                        value={formData.peruntukan || ""}
                        onChange={handleChange}
                        placeholder="Contoh: Kantor, Gudang, Latihan"
                        isInvalid={!!errors.peruntukan}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.peruntukan}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Luas dari Peta (m²)</Form.Label>
                      <Form.Control
                        type="number"
                        name="luas"
                        value={formData.luas || 0}
                        onChange={handleChange}
                        placeholder="Luas akan otomatis terisi"
                        readOnly
                      />
                      <Form.Text className="text-muted">
                        Luas otomatis dari gambar di peta
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Ownership Details */}
            <Card className="mb-3">
              <Card.Header>
                <strong>Detail Kepemilikan</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>8. Status *</Form.Label>
                      <Form.Select
                        name="status"
                        value={formData.status || ""}
                        onChange={handleChange}
                        isInvalid={!!errors.status}
                      >
                        <option value="">-- Pilih Status --</option>
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.status}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>9. Asal Milik *</Form.Label>
                      <Form.Select
                        name="asal_milik"
                        value={formData.asal_milik || ""}
                        onChange={handleChange}
                        isInvalid={!!errors.asal_milik}
                      >
                        <option value="">-- Pilih Asal Milik --</option>
                        {asalMilikOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.asal_milik}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>10. Bukti Pemilikan</Form.Label>
                      <Form.Select
                        name="bukti_pemilikan"
                        value={formData.bukti_pemilikan || ""}
                        onChange={handleChange}
                      >
                        <option value="">-- Pilih Bukti Pemilikan --</option>
                        {buktiPemilikanOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>11. Pemilikan Sertifikat</Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          name="pemilikan_sertifikat"
                          value="Ya"
                          label="Ya"
                          checked={formData.pemilikan_sertifikat === "Ya"}
                          onChange={handleChange}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          name="pemilikan_sertifikat"
                          value="Tidak"
                          label="Tidak"
                          checked={formData.pemilikan_sertifikat === "Tidak"}
                          onChange={handleChange}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Atas Nama Pemilik Sertifikat</Form.Label>
                  <Form.Control
                    type="text"
                    name="atas_nama_pemilik_sertifikat"
                    value={formData.atas_nama_pemilik_sertifikat || ""}
                    onChange={handleChange}
                    placeholder="Masukkan Nama Pemilik"
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Land Certificate Info */}
            <Card className="mb-3">
              <Card.Header>
                <strong>12. Jumlah Tanah Sertifikat</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bidang</Form.Label>
                      <Form.Control
                        type="number"
                        name="sertifikat_bidang"
                        value={formData.sertifikat_bidang || ""}
                        onChange={handleChange}
                        placeholder="Jumlah bidang"
                        min="0"
                        isInvalid={!!errors.sertifikat_bidang}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.sertifikat_bidang}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Luas (M²)</Form.Label>
                      <Form.Control
                        type="number"
                        name="sertifikat_luas"
                        value={formData.sertifikat_luas || ""}
                        onChange={handleChange}
                        placeholder="Luas dalam m²"
                        min="0"
                        step="0.01"
                        isInvalid={!!errors.sertifikat_luas}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.sertifikat_luas}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Uncertified Land Info */}
            <Card className="mb-3">
              <Card.Header>
                <strong>13. Belum Sertifikat</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bidang</Form.Label>
                      <Form.Control
                        type="number"
                        name="belum_sertifikat_bidang"
                        value={formData.belum_sertifikat_bidang || ""}
                        onChange={handleChange}
                        placeholder="Jumlah bidang"
                        min="0"
                        isInvalid={!!errors.belum_sertifikat_bidang}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.belum_sertifikat_bidang}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Luas (M²)</Form.Label>
                      <Form.Control
                        type="number"
                        name="belum_sertifikat_luas"
                        value={formData.belum_sertifikat_luas || ""}
                        onChange={handleChange}
                        placeholder="Luas dalam m²"
                        min="0"
                        step="0.01"
                        isInvalid={!!errors.belum_sertifikat_luas}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.belum_sertifikat_luas}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                {errors.tanah_data && (
                  <div className="text-danger small mb-2">
                    {errors.tanah_data}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Additional Info */}
            <Card className="mb-3">
              <Card.Header>
                <strong>14. Informasi Tambahan</strong>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Keterangan</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="keterangan"
                    value={formData.keterangan || ""}
                    onChange={handleChange}
                    placeholder="Masukkan keterangan tambahan jika ada"
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Summary Info */}
            {initialArea && (
              <Card className="mb-3">
                <Card.Header>
                  <strong>Ringkasan</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <small className="text-muted">
                        <strong>Luas dari Gambar Peta:</strong>
                        <br />
                        {initialArea.toFixed(2)} m²
                      </small>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted">
                        <strong>Total Luas Sertifikat:</strong>
                        <br />
                        {(
                          (parseFloat(formData.sertifikat_luas) || 0) +
                          (parseFloat(formData.belum_sertifikat_luas) || 0)
                        ).toFixed(2)}{" "}
                        m²
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
          </Form>
        </fieldset>
      </Card.Body>

      <Card.Footer className="text-end">
        <Button variant="secondary" onClick={onCancel} className="me-2">
          Batal
        </Button>
        <Button
          variant="warning"
          onClick={() => window.location.reload()}
          className="me-2"
        >
          Reset Form
        </Button>

        <Button
          variant="success"
          onClick={handleSave}
          disabled={!isEnabled && !assetToEdit}
          style={{ backgroundColor: "#4CAF50", border: "none" }}
        >
          Simpan Aset
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default FormAset;
