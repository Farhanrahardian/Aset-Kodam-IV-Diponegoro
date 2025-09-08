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
import { FaEye, FaTrash, FaDownload } from "react-icons/fa";
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
  isEnabled = false, // Default to false, enabled after drawing
  viewMode = false,
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const getImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith("http://") || filename.startsWith("https://")) {
      return filename;
    }
    return `/uploads/${filename}`;
  };

  useEffect(() => {
    if (assetToEdit) {
      setFormData(assetToEdit);
      if (assetToEdit.bukti_pemilikan_filename) {
        setImagePreview(getImageUrl(assetToEdit.bukti_pemilikan_filename));
      }
    } else {
      const initialFormData = {
        nama: "",
        korem_id: selectedKorem || "",
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
  }, [assetToEdit, selectedKorem, selectedKodim, initialGeometry, initialArea]);

  useEffect(() => {
    if (initialGeometry && !formData.lokasi_nama) {
      try {
        let lat, lng;
        if (initialGeometry.type === "Polygon") {
          if (initialGeometry.coordinates?.[0]?.[0]?.length >= 2) {
            lng = initialGeometry.coordinates[0][0][0];
            lat = initialGeometry.coordinates[0][0][1];
          }
        }
        if (typeof lat === "number" && typeof lng === "number") {
          setFormData((prev) => ({
            ...prev,
            lokasi_nama: `Lokasi sekitar ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          }));
        }
      } catch (error) {
        console.error("Error processing geometry:", error);
      }
    }
  }, [initialGeometry, formData.lokasi_nama]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSave = () => {
    if (!isEnabled) {
      toast.error("Gambar lokasi aset di peta terlebih dahulu.");
      return;
    }
    // Add validation logic here if needed
    onSave(formData);
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

  return (
    <>
      <Card>
        <Card.Header>
          <h5>Lengkapi Detail Aset</h5>
        </Card.Header>
        <Card.Body>
          {!isEnabled && !viewMode && (
            <Alert variant="warning" className="text-center p-4">
              <p className="mb-0">Gambar lokasi di peta untuk mengaktifkan formulir ini.</p>
            </Alert>
          )}
          <fieldset disabled={!isEnabled || viewMode}>
            <Form>
              <Card className="mb-3">
                <Card.Header><strong>Informasi Dasar Aset</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Wilayah Korem</Form.Label>
                        <Form.Select name="korem_id" value={formData.korem_id || ""} disabled>
                          <option value="">-- Dipilih pada langkah sebelumnya --</option>
                          {koremList.map((korem) => (<option key={korem.id} value={korem.id}>{korem.nama}</option>))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Kodim</Form.Label>
                        <Form.Select name="kodim" value={formData.kodim || ""} disabled>
                          <option value="">-- Dipilih pada langkah sebelumnya --</option>
                          {kodimList.map((kodim) => (<option key={kodim.id} value={kodim.id}>{kodim.nama}</option>))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>NUP *</Form.Label>
                    <Form.Control type="text" name="nama" value={formData.nama || ""} onChange={handleChange} placeholder="Masukkan NUP" required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Lokasi *</Form.Label>
                    <Form.Control type="text" name="lokasi_nama" value={formData.lokasi_nama || ""} onChange={handleChange} placeholder="Otomatis dari peta atau isi manual" />
                  </Form.Group>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header><strong>Detail Registrasi Aset</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>KIB/Kode Barang *</Form.Label>
                        <Form.Control type="text" name="kib_kode_barang" value={formData.kib_kode_barang || ""} onChange={handleChange} placeholder="Contoh: 1.3.1.01.001" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nomor Registrasi *</Form.Label>
                        <Form.Control type="text" name="nomor_registrasi" value={formData.nomor_registrasi || ""} onChange={handleChange} placeholder="Masukkan nomor registrasi" />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Alamat Registrasi Aset*</Form.Label>
                    <Form.Control as="textarea" rows={2} name="alamat" value={formData.alamat || ""} onChange={handleChange} placeholder="Masukkan alamat lengkap" />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Peruntukan *</Form.Label>
                        <Form.Control type="text" name="peruntukan" value={formData.peruntukan || ""} onChange={handleChange} placeholder="Contoh: Kantor, Gudang, Latihan" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Luas dari Peta (m²)</Form.Label>
                        <Form.Control type="number" name="luas" value={formData.luas || 0} readOnly />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header><strong>Detail Kepemilikan</strong></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Status *</Form.Label>
                        <Form.Select name="status" value={formData.status || ""} onChange={handleChange}>
                          <option value="">-- Pilih Status --</option>
                          {statusOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Asal Milik *</Form.Label>
                        <Form.Select name="asal_milik" value={formData.asal_milik || ""} onChange={handleChange}>
                          <option value="">-- Pilih Asal Milik --</option>
                          {asalMilikOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Status Sertifikat</Form.Label>
                    <div>
                      <Form.Check type="radio" id="sertifikat-ya" name="pemilikan_sertifikat" value="Ya" label="Sudah Bersertifikat" onChange={handleChange} checked={formData.pemilikan_sertifikat === "Ya"} inline />
                      <Form.Check type="radio" id="sertifikat-tidak" name="pemilikan_sertifikat" value="Tidak" label="Belum Bersertifikat" onChange={handleChange} checked={formData.pemilikan_sertifikat === "Tidak"} inline />
                    </div>
                  </Form.Group>

                  {formData.pemilikan_sertifikat === "Ya" && (
                  <Card className="mb-3">
                    <Card.Header><strong>Data Sertifikat</strong></Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Atas Nama Pemilik Sertifikat</Form.Label>
                        <Form.Control type="text" name="atas_nama_pemilik_sertifikat" value={formData.atas_nama_pemilik_sertifikat || ""} onChange={handleChange} placeholder="Masukkan atas nama pemilik sertifikat" />
                      </Form.Group>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Sertifikat (Bidang)</Form.Label>
                            <Form.Control type="number" name="sertifikat_bidang" value={formData.sertifikat_bidang || ""} onChange={handleChange} placeholder="Jumlah bidang" />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Sertifikat (Luas m²)</Form.Label>
                            <Form.Control type="number" name="sertifikat_luas" value={formData.sertifikat_luas || ""} onChange={handleChange} placeholder="Luas dalam meter persegi" />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                  )}

                  {formData.pemilikan_sertifikat === "Tidak" && (
                  <Card className="mb-3">
                    <Card.Header><strong>Data Belum Sertifikat</strong></Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Belum Sertifikat (Bidang)</Form.Label>
                            <Form.Control type="number" name="belum_sertifikat_bidang" value={formData.belum_sertifikat_bidang || ""} onChange={handleChange} placeholder="Jumlah bidang" />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Belum Sertifikat (Luas m²)</Form.Label>
                            <Form.Control type="number" name="belum_sertifikat_luas" value={formData.belum_sertifikat_luas || ""} onChange={handleChange} placeholder="Luas dalam meter persegi" />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                  )}
                </Card.Body>
              </Card>

              <div className="d-flex gap-2 justify-content-end">
                <Button variant="secondary" onClick={onCancel}>Batalkan</Button>
                <Button variant="primary" onClick={handleSave} disabled={!isEnabled}>Simpan Aset</Button>
              </div>
            </Form>
          </fieldset>
        </Card.Body>
      </Card>
    </>
  );
};

export default FormAset;
