import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  Row,
  Col,
  Card,
  Alert,
  Modal,
  Image,
} from "react-bootstrap";
import { FaEye, FaEdit, FaTrash, FaDownload } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

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
  viewMode = false,
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [filteredKodimList, setFilteredKodimList] = useState([]);

  // File size limit in MB
  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // Static kodim data based on your db.json structure
  const staticKodimData = [
    { id: "0701", nama: "Kodim 0701/Banyumas", korem_id: 1 },
    { id: "0729", nama: "Kodim 0729/Bantul", korem_id: 2 },
    { id: "0732", nama: "Kodim 0732/Sleman", korem_id: 2 },
    { id: "0733", nama: "Kodim 0733/Kota Semarang", korem_id: 5 },
    { id: "0725", nama: "Kodim 0725/Sragen", korem_id: 4 },
    { id: "0734", nama: "Kodim 0734/Yogyakarta", korem_id: 2 },
    { id: "0702", nama: "Kodim 0702/Purbalingga", korem_id: 1 },
    { id: "0703", nama: "Kodim 0703/Cilacap", korem_id: 1 },
  ];

  // Filter kodim based on selected korem
  useEffect(() => {
    const koremId = formData.korem_id || selectedKorem;
    if (koremId) {
      const filtered = staticKodimData.filter(
        (kodim) => kodim.korem_id === parseInt(koremId)
      );
      setFilteredKodimList(filtered);
    } else {
      setFilteredKodimList(staticKodimData);
    }
  }, [formData.korem_id, selectedKorem]);

  // Helper function untuk membuat URL gambar dari public/uploads
  const getImageUrl = (filename) => {
    if (!filename) return null;

    // Jika sudah URL lengkap, return as is
    if (filename.startsWith("http://") || filename.startsWith("https://")) {
      return filename;
    }

    // Jika path relatif dari public/uploads
    if (filename.startsWith("/uploads/") || filename.startsWith("uploads/")) {
      return `/${filename.replace(/^\/+/, "")}`;
    }

    // Jika hanya nama file, tambahkan path uploads
    return `/uploads/${filename}`;
  };

  useEffect(() => {
    if (assetToEdit) {
      setFormData(assetToEdit);
      // Set preview untuk file yang sudah ada
      if (assetToEdit.bukti_pemilikan_filename) {
        const imageUrl = getImageUrl(assetToEdit.bukti_pemilikan_filename);
        setImagePreview(imageUrl);
      }
    } else {
      // Reset form for new entry with all required fields
      const initialFormData = {
        nama: "",
        korem_id:
          selectedKorem || (koremList.length > 0 ? koremList[0].id : ""),
        kodim: selectedKodim || "",
        luas: initialArea ? parseFloat(initialArea.toFixed(2)) : 0,
        lokasi_nama: "",
        kib_kode_barang: "",
        nomor_registrasi: "",
        alamat: "",
        peruntukan: "",
        status: "",
        asal_milik: "",
        bukti_pemilikan: "",
        bukti_pemilikan_url: "",
        bukti_pemilikan_filename: "",
        pemilikan_sertifikat: "Ya",
        sertifikat_bidang: "",
        sertifikat_luas: "",
        belum_sertifikat_bidang: "",
        belum_sertifikat_luas: "",
        keterangan: "",
        keterangan_bukti_pemilikan: "",
        atas_nama_pemilik_sertifikat: "",
        lokasi: initialGeometry || null,
      };
      setFormData(initialFormData);
    }
  }, [
    assetToEdit,
    koremList,
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

        // Handle different GeoJSON geometry types
        if (initialGeometry.type === "Point") {
          if (
            Array.isArray(initialGeometry.coordinates) &&
            initialGeometry.coordinates.length >= 2
          ) {
            lng = initialGeometry.coordinates[0];
            lat = initialGeometry.coordinates[1];
          }
        } else if (initialGeometry.type === "Polygon") {
          if (initialGeometry.coordinates?.[0]?.[0]?.length >= 2) {
            lng = initialGeometry.coordinates[0][0][0];
            lat = initialGeometry.coordinates[0][0][1];
          }
        } else if (initialGeometry.type === "LineString") {
          if (initialGeometry.coordinates?.[0]?.length >= 2) {
            lng = initialGeometry.coordinates[0][0];
            lat = initialGeometry.coordinates[0][1];
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
          setFormData((prev) => ({
            ...prev,
            lokasi_nama: "Lokasi dari Peta",
          }));
        }
      } catch (error) {
        console.error("Error processing geometry coordinates:", error);
        setFormData((prev) => ({
          ...prev,
          lokasi_nama: "Lokasi dari Peta",
        }));
      }
    }
  }, [initialGeometry, formData.lokasi_nama]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = ["korem_id", "luas"].includes(name)
      ? Number(value)
      : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };

      // Sync alternative field names for compatibility
      const fieldMappings = {
        kib_kode_barang: ["kode_barang"],
        kode_barang: ["kib_kode_barang"],
        nomor_registrasi: [
          "no_registrasi",
          "registrasi",
          "nomorRegistrasi",
          "noRegistrasi",
          "no_reg",
        ],
        peruntukan: ["fungsi"],
        fungsi: ["peruntukan"],
        bukti_pemilikan: ["bukti_kepemilikan"],
        bukti_kepemilikan: ["bukti_pemilikan"],
      };

      if (fieldMappings[name]) {
        fieldMappings[name].forEach((field) => {
          updated[field] = newValue;
        });
      }

      // Reset kodim when korem changes
      if (name === "korem_id") {
        updated.kodim = "";
      }

      return updated;
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Enhanced file handling dengan upload ke public/uploads
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File terlalu besar. Maksimal ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpg",
      "image/jpeg",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung. Gunakan PNG, JPG, atau PDF.");
      e.target.value = "";
      return;
    }

    const uploadToastId = toast.loading("Mengupload file...");

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("bukti_pemilikan", file);

      const response = await axios.post(
        "/api/upload-bukti-pemilikan",
        formDataUpload,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const { filename, url } = response.data;

      // Set preview
      if (file.type.startsWith("image/")) {
        setImagePreview(url);
      } else {
        setImagePreview(null);
      }

      // Update form data
      setFormData((prev) => ({
        ...prev,
        bukti_pemilikan_file: null,
        bukti_pemilikan_filename: filename,
        bukti_pemilikan_url: url,
      }));

      toast.success("File berhasil diupload!", { id: uploadToastId });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal mengupload file. Silakan coba lagi.", {
        id: uploadToastId,
      });
      e.target.value = "";
    }
  };

  // Handle image view
  const handleViewImage = () => {
    const imageUrl =
      imagePreview || getImageUrl(formData.bukti_pemilikan_filename);
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setShowImageModal(true);
    }
  };

  // Handle image download
  const handleDownloadImage = () => {
    const imageUrl =
      imagePreview || getImageUrl(formData.bukti_pemilikan_filename);
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = formData.bukti_pemilikan_filename || "bukti_pemilikan";
      link.click();
    }
  };

  // Handle image removal
  const handleRemoveImage = async () => {
    if (formData.bukti_pemilikan_filename) {
      try {
        await axios.delete(
          `/api/delete-bukti-pemilikan/${formData.bukti_pemilikan_filename}`
        );
        toast.success("File berhasil dihapus dari server");
      } catch (error) {
        console.error("Error deleting file:", error);
        toast.error("Gagal menghapus file dari server");
      }
    }

    setImagePreview(null);
    setFormData((prev) => ({
      ...prev,
      bukti_pemilikan_file: null,
      bukti_pemilikan_filename: "",
      bukti_pemilikan_url: "",
    }));

    const fileInput = document.querySelector(
      'input[name="bukti_pemilikan_file"]'
    );
    if (fileInput) fileInput.value = "";
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = {
      nama: "Nama aset harus diisi",
      korem_id: "Korem harus dipilih",
      lokasi_nama: "Alamat harus diisi",
      kib_kode_barang: "KIB/Kode Barang harus diisi",
      nomor_registrasi: "Nomor Registrasi harus diisi",
      alamat: "Alamat harus diisi",
      peruntukan: "Peruntukan harus diisi",
      status: "Status harus dipilih",
      asal_milik: "Asal Milik harus diisi",
    };

    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!formData[field]?.toString().trim()) {
        newErrors[field] = message;
      }
    });

    // Validate numbers
    const numberFields = {
      sertifikat_bidang: "Bidang sertifikat harus berupa angka",
      sertifikat_luas: "Luas sertifikat harus berupa angka",
      belum_sertifikat_bidang: "Bidang belum sertifikat harus berupa angka",
      belum_sertifikat_luas: "Luas belum sertifikat harus berupa angka",
    };

    Object.entries(numberFields).forEach(([field, message]) => {
      if (formData[field] && isNaN(formData[field])) {
        newErrors[field] = message;
      }
    });

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
      toast.error("Silakan gambar lokasi aset di peta terlebih dahulu");
      return;
    }

    if (validateForm()) {
      const totalLuas =
        (parseFloat(formData.sertifikat_luas) || 0) +
        (parseFloat(formData.belum_sertifikat_luas) || 0);

      const assetData = {
        ...formData,
        luas_total: totalLuas,
        luas_gambar: initialArea,
      };

      onSave(assetData);
    }
  };

  const handleReset = () => {
    const initialFormData = {
      nama: "",
      korem_id: selectedKorem || (koremList.length > 0 ? koremList[0].id : ""),
      kodim: selectedKodim || "",
      luas: initialArea ? parseFloat(initialArea.toFixed(2)) : 0,
      lokasi_nama: "",
      kib_kode_barang: "",
      nomor_registrasi: "",
      alamat: "",
      peruntukan: "",
      status: "",
      asal_milik: "",
      bukti_pemilikan: "",
      bukti_pemilikan_url: "",
      bukti_pemilikan_filename: "",
      pemilikan_sertifikat: "Ya",
      sertifikat_bidang: "",
      sertifikat_luas: "",
      belum_sertifikat_bidang: "",
      belum_sertifikat_luas: "",
      keterangan: "",
      keterangan_bukti_pemilikan: "",
      atas_nama_pemilik_sertifikat: "",
      lokasi: initialGeometry || null,
    };

    setFormData(initialFormData);
    setErrors({});
    setImagePreview(null);
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

  const hasExistingFile = formData.bukti_pemilikan_filename || imagePreview;

  return (
    <>
      <Card>
        <Card.Header>
          <h5>
            {assetToEdit
              ? viewMode
                ? "Detail Aset"
                : "Edit Detail Aset"
              : "Lengkapi Detail Aset"}
          </h5>
        </Card.Header>
        <Card.Body>
          {!isEnabled && !assetToEdit && !viewMode && (
            <div className="text-muted text-center p-4">
              <p>
                Silakan gambar lokasi di peta terlebih dahulu untuk mengaktifkan
                formulir ini.
              </p>
            </div>
          )}

          <fieldset disabled={(!isEnabled && !assetToEdit) || viewMode}>
            <Form>
              {/* Basic Asset Info */}
              <Card className="mb-3">
                <Card.Header>
                  <strong>Informasi Dasar Aset</strong>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>NUP *</Form.Label>
                    <Form.Control
                      type="text"
                      name="nama"
                      value={formData.nama || ""}
                      onChange={handleChange}
                      placeholder="Masukkan NUP"
                      isInvalid={!!errors.nama}
                      required
                      readOnly={viewMode}
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
                          disabled={viewMode}
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
                        <Form.Label>2. Kodim</Form.Label>
                        <Form.Select
                          name="kodim"
                          value={formData.kodim || ""}
                          onChange={handleChange}
                          disabled={viewMode || !formData.korem_id}
                        >
                          <option value="">-- Pilih Kodim (Opsional) --</option>
                          {filteredKodimList.map((kodim) => (
                            <option key={kodim.id} value={kodim.id}>
                              {kodim.nama}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          {!formData.korem_id
                            ? "Pilih Korem terlebih dahulu"
                            : "Kodim tidak wajib diisi"}
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>3. Lokasi *</Form.Label>
                    <Form.Control
                      type="text"
                      name="lokasi_nama"
                      value={formData.lokasi_nama || ""}
                      onChange={handleChange}
                      placeholder="Otomatis dari peta atau isi manual"
                      isInvalid={!!errors.lokasi_nama}
                      readOnly={viewMode}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.lokasi_nama}
                    </Form.Control.Feedback>
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
                          readOnly={viewMode}
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
                          readOnly={viewMode}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.nomor_registrasi}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>6. Alamat Registrasi Aset*</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="alamat"
                      value={formData.alamat || ""}
                      onChange={handleChange}
                      placeholder="Masukkan alamat lengkap"
                      isInvalid={!!errors.alamat}
                      readOnly={viewMode}
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
                          readOnly={viewMode}
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
                          disabled={viewMode}
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
                          disabled={viewMode}
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

                  <Form.Group className="mb-3">
                    <Form.Label>
                      10. Bukti Pemilikan (Upload PNG, JPG, PDF - Max{" "}
                      {MAX_FILE_SIZE_MB}MB)
                    </Form.Label>
                    <Form.Control
                      type="file"
                      name="bukti_pemilikan_file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileChange}
                      disabled={viewMode}
                    />
                    <Form.Text className="text-muted">
                      Format yang didukung: PNG, JPG, PDF (maksimal{" "}
                      {MAX_FILE_SIZE_MB}MB).
                    </Form.Text>

                    {/* File Preview Section */}
                    {hasExistingFile && (
                      <div className="mt-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="file-preview-thumbnail"
                            style={{
                              width: "60px",
                              height: "60px",
                              cursor: "pointer",
                            }}
                            onClick={handleViewImage}
                          >
                            {formData.bukti_pemilikan_filename
                              ?.toLowerCase()
                              .includes(".pdf") ? (
                              <div
                                className="pdf-thumbnail d-flex align-items-center justify-content-center border rounded"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: "#f8f9fa",
                                }}
                              >
                                <span className="text-muted small">PDF</span>
                              </div>
                            ) : (
                              <Image
                                src={
                                  imagePreview ||
                                  getImageUrl(formData.bukti_pemilikan_filename)
                                }
                                alt="Thumbnail"
                                thumbnail
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.parentNode.innerHTML =
                                    '<div class="d-flex align-items-center justify-content-center border rounded h-100"><span class="text-muted small">Error</span></div>';
                                }}
                              />
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <small className="text-muted d-block">
                              {formData.bukti_pemilikan_filename ||
                                "File bukti pemilikan"}
                            </small>
                            <div className="mt-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={handleViewImage}
                                className="me-2"
                              >
                                <FaEye /> Lihat
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={handleDownloadImage}
                                className="me-2"
                              >
                                <FaDownload /> Unduh
                              </Button>
                              {!viewMode && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={handleRemoveImage}
                                >
                                  <FaTrash /> Hapus
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Form.Group>

                  {hasExistingFile && (
                    <Form.Group className="mb-3">
                      <Form.Label>Keterangan Bukti Pemilikan</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="keterangan_bukti_pemilikan"
                        value={formData.keterangan_bukti_pemilikan || ""}
                        onChange={handleChange}
                        placeholder="Keterangan tambahan mengenai bukti pemilikan"
                        readOnly={viewMode}
                      />
                    </Form.Group>
                  )}
                </Card.Body>
              </Card>

              {/* Land Certificate Details */}
              <Card className="mb-3">
                <Card.Header>
                  <strong>Detail Tanah</strong>
                </Card.Header>
                <Card.Body>
                  {errors.tanah_data && (
                    <Alert variant="danger">{errors.tanah_data}</Alert>
                  )}

                  {/* Tanah dengan Sertifikat */}
                  <Card className="mb-3">
                    <Card.Header>
                      <strong>Tanah dengan Sertifikat</strong>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Jumlah Bidang</Form.Label>
                        <Form.Control
                          type="number"
                          name="sertifikat_bidang"
                          value={formData.sertifikat_bidang || ""}
                          onChange={handleChange}
                          placeholder="Jumlah bidang"
                          isInvalid={!!errors.sertifikat_bidang}
                          readOnly={viewMode}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.sertifikat_bidang}
                        </Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Luas (m²)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="sertifikat_luas"
                          value={formData.sertifikat_luas || ""}
                          onChange={handleChange}
                          placeholder="Luas dalam m²"
                          isInvalid={!!errors.sertifikat_luas}
                          readOnly={viewMode}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.sertifikat_luas}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Card.Body>
                  </Card>

                  {/* Tanah Belum Sertifikat */}
                  <Card className="mb-3">
                    <Card.Header>
                      <strong>Tanah Belum Sertifikat</strong>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Jumlah Bidang</Form.Label>
                        <Form.Control
                          type="number"
                          name="belum_sertifikat_bidang"
                          value={formData.belum_sertifikat_bidang || ""}
                          onChange={handleChange}
                          placeholder="Jumlah bidang"
                          isInvalid={!!errors.belum_sertifikat_bidang}
                          readOnly={viewMode}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.belum_sertifikat_bidang}
                        </Form.Control.Feedback>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Luas (m²)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="belum_sertifikat_luas"
                          value={formData.belum_sertifikat_luas || ""}
                          onChange={handleChange}
                          placeholder="Luas dalam m²"
                          isInvalid={!!errors.belum_sertifikat_luas}
                          readOnly={viewMode}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.belum_sertifikat_luas}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Card.Body>
                  </Card>

                  {/* Summary of total area */}
                  {(formData.sertifikat_luas ||
                    formData.belum_sertifikat_luas) && (
                    <Alert variant="info">
                      <strong>Total Luas Tanah: </strong>
                      {(
                        (parseFloat(formData.sertifikat_luas) || 0) +
                        (parseFloat(formData.belum_sertifikat_luas) || 0)
                      ).toFixed(2)}{" "}
                      m²
                      {initialArea && (
                        <span className="ms-2">
                          (Luas dari peta: {initialArea.toFixed(2)} m²)
                        </span>
                      )}
                    </Alert>
                  )}
                </Card.Body>
              </Card>

              {/* Additional Information */}
              <Card className="mb-3">
                <Card.Header>
                  <strong>Informasi Tambahan</strong>
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
                      placeholder="Keterangan tambahan tentang aset"
                      readOnly={viewMode}
                    />
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* Action Buttons */}
              {!viewMode && (
                <div className="d-flex gap-2 justify-content-end">
                  <Button
                    variant="secondary"
                    onClick={onCancel}
                    disabled={!isEnabled && !assetToEdit}
                  >
                    {assetToEdit ? "Batal" : "Tutup"}
                  </Button>
                  <Button
                    variant="outline-warning"
                    onClick={handleReset}
                    disabled={!isEnabled && !assetToEdit}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!isEnabled && !assetToEdit}
                  >
                    {assetToEdit ? "Update Aset" : "Simpan Aset"}
                  </Button>
                </div>
              )}

              {viewMode && (
                <div className="d-flex gap-2 justify-content-end">
                  <Button variant="secondary" onClick={onCancel}>
                    Tutup
                  </Button>
                </div>
              )}
            </Form>
          </fieldset>
        </Card.Body>
      </Card>

      {/* Image View Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Bukti Pemilikan - {formData.nama || "Aset"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedImage && (
            <>
              {selectedImage.toLowerCase().includes(".pdf") ? (
                <div>
                  <p>File PDF tidak dapat ditampilkan dalam preview.</p>
                  <Button variant="primary" onClick={handleDownloadImage}>
                    <FaDownload /> Unduh PDF
                  </Button>
                </div>
              ) : (
                <Image
                  src={selectedImage}
                  alt="Bukti Pemilikan"
                  fluid
                  style={{ maxHeight: "70vh" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentNode.innerHTML =
                      '<div class="alert alert-warning">Gambar tidak dapat dimuat</div>';
                  }}
                />
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="w-100 d-flex justify-content-between">
            <div>
              <small className="text-muted">
                {formData.bukti_pemilikan_filename || "bukti_pemilikan"}
              </small>
            </div>
            <div>
              <Button
                variant="outline-success"
                size="sm"
                onClick={handleDownloadImage}
                className="me-2"
              >
                <FaDownload /> Unduh
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowImageModal(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FormAset;
