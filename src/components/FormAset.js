import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col, Card, Alert } from "react-bootstrap";
import toast from "react-hot-toast";

const FormAset = ({
  onSave,
  onCancel,
  koremList,
  onLocationChange,
  assetToEdit,
  initialGeometry,
  initialArea,
  isEnabled = false,
  viewMode = false,
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [kodimList, setKodimList] = useState([]);
  const [buktiPemilikanFile, setBuktiPemilikanFile] = useState(null);
  const [assetPhotos, setAssetPhotos] = useState([]);

  useEffect(() => {
    if (assetToEdit) {
      setFormData(assetToEdit);
    } else {
      const initialFormData = {
        nama: "",
        korem_id: "",
        kodim: "",
        luas: initialArea ? parseFloat(initialArea.toFixed(2)) : 0,
        kib_kode_barang: "",
        nomor_registrasi: "",
        alamat: "",
        peruntukan: "",
        status: "",
        asal_milik: "",
        pemilikan_sertifikat: "Ya",
        keterangan_bukti_pemilikan: "",
        sertifikat_bidang: "",
        sertifikat_luas: "",
        belum_sertifikat_bidang: "",
        belum_sertifikat_luas: "",
        keterangan: "",
        atas_nama_pemilik_sertifikat: "",
        lokasi: initialGeometry || null,
      };
      setFormData(initialFormData);
    }
  }, [assetToEdit, initialGeometry, initialArea]);

  useEffect(() => {
    if (formData.korem_id) {
      const selectedKoremData = koremList.find(
        (k) => k.id === formData.korem_id
      );
      if (selectedKoremData) {
        const kodimObjects =
          selectedKoremData.kodim?.map((kName) => ({
            id: kName,
            nama: kName,
          })) || [];
        setKodimList(kodimObjects);

        if (kodimObjects.length === 0) {
          const newKodim = selectedKoremData.nama;
          setFormData((prev) => ({ ...prev, kodim: newKodim }));
          onLocationChange && onLocationChange(formData.korem_id, newKodim);
        }
      }
    } else {
      setKodimList([]);
    }
  }, [formData.korem_id, koremList, onLocationChange]);

  // Update luas otomatis dari peta ketika initialArea berubah
  useEffect(() => {
    if (initialArea && initialArea > 0) {
      const areaValue = parseFloat(initialArea.toFixed(2));

      setFormData((prev) => {
        const updatedData = { ...prev };

        // Update sesuai dengan status sertifikat
        if (prev.pemilikan_sertifikat === "Ya") {
          updatedData.sertifikat_luas = areaValue;
          updatedData.belum_sertifikat_luas = ""; // Clear yang tidak terpakai
        } else {
          updatedData.belum_sertifikat_luas = areaValue;
          updatedData.sertifikat_luas = ""; // Clear yang tidak terpakai
        }

        // Tetap update field luas untuk keperluan internal/backup
        updatedData.luas = areaValue;

        return updatedData;
      });
    }
  }, [initialArea, formData.pemilikan_sertifikat]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "korem_id") {
      setFormData({
        ...formData,
        korem_id: value,
        kodim: "",
      });
      onLocationChange && onLocationChange(value, "");
    } else if (name === "pemilikan_sertifikat") {
      // Ketika status sertifikat berubah, pindahkan data luas ke field yang sesuai
      const currentArea =
        formData.sertifikat_luas ||
        formData.belum_sertifikat_luas ||
        formData.luas ||
        initialArea;

      setFormData((prev) => {
        const updatedData = {
          ...prev,
          [name]: value,
        };

        if (value === "Ya") {
          // Pindah ke sertifikat
          updatedData.sertifikat_luas = currentArea || "";
          updatedData.belum_sertifikat_luas = "";
        } else {
          // Pindah ke belum sertifikat
          updatedData.belum_sertifikat_luas = currentArea || "";
          updatedData.sertifikat_luas = "";
        }

        return updatedData;
      });
    } else {
      setFormData({ ...formData, [name]: value });
      if (name === "kodim") {
        onLocationChange && onLocationChange(formData.korem_id, value);
      }
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    setBuktiPemilikanFile(e.target.files[0]);
  };

  const handleAssetPhotosChange = (e) => {
    setAssetPhotos(Array.from(e.target.files));
  };

  const handleSave = () => {
    if (!isEnabled) {
      toast.error("Gambar lokasi aset di peta terlebih dahulu.");
      return;
    }

    // Prepare data untuk disimpan dengan memastikan konsistensi luas
    const dataToSave = { ...formData };

    // Pastikan data luas konsisten dengan pilihan sertifikat
    if (formData.pemilikan_sertifikat === "Ya") {
      // Jika bersertifikat, pastikan sertifikat_luas terisi
      if (!dataToSave.sertifikat_luas && (dataToSave.luas || initialArea)) {
        dataToSave.sertifikat_luas = dataToSave.luas || initialArea;
      }
      dataToSave.belum_sertifikat_luas = ""; // Clear yang tidak terpakai
    } else {
      // Jika tidak bersertifikat, pastikan belum_sertifikat_luas terisi
      if (
        !dataToSave.belum_sertifikat_luas &&
        (dataToSave.luas || initialArea)
      ) {
        dataToSave.belum_sertifikat_luas = dataToSave.luas || initialArea;
      }
      dataToSave.sertifikat_luas = ""; // Clear yang tidak terpakai
    }

    onSave(dataToSave, buktiPemilikanFile, assetPhotos);
  };

  const statusOptions = [
    { value: "Dimiliki/Dikuasai", label: "Dimiliki/Dikuasai" },
    {
      value: "Tidak Dimiliki/Tidak Dikuasai",
      label: "Tidak Dimiliki/Tidak Dikuasai",
    },
    { value: "Lain-lain", label: "Lain-lain" },
  ];

  // Helper function untuk mendapatkan nilai luas yang sedang aktif
  const getCurrentAreaValue = () => {
    if (formData.pemilikan_sertifikat === "Ya") {
      return formData.sertifikat_luas || "";
    } else {
      return formData.belum_sertifikat_luas || "";
    }
  };

  return (
    <>
      <Card>
        <Card.Header>
          <h5>Lengkapi Detail Aset</h5>
        </Card.Header>
        <Card.Body>
          <Form>
            <Card className="mb-3">
              <Card.Header>
                <strong>Informasi Dasar Aset</strong>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Wilayah Korem *</Form.Label>
                      <Form.Select
                        name="korem_id"
                        value={formData.korem_id || ""}
                        onChange={handleChange}
                        required
                        disabled={viewMode}
                      >
                        <option value="">-- Pilih Korem --</option>
                        {koremList.map((korem) => (
                          <option key={korem.id} value={korem.id}>
                            {korem.nama}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Kodim *</Form.Label>
                      <Form.Select
                        name="kodim"
                        value={formData.kodim || ""}
                        onChange={handleChange}
                        disabled={
                          viewMode ||
                          !formData.korem_id ||
                          kodimList.length === 0
                        }
                        required
                      >
                        <option value="">-- Pilih Kodim --</option>
                        {kodimList.map((kodim) => (
                          <option key={kodim.id} value={kodim.id}>
                            {kodim.nama}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <fieldset disabled={!isEnabled || viewMode}>
                  <Form.Group className="mb-3">
                    <Form.Label>NUP *</Form.Label>
                    <Form.Control
                      type="text"
                      name="nama"
                      value={formData.nama || ""}
                      onChange={handleChange}
                      placeholder="Masukkan NUP"
                      required
                    />
                  </Form.Group>
                </fieldset>
              </Card.Body>
            </Card>

            {!isEnabled && !viewMode && (
              <Alert variant="warning" className="text-center p-4 mt-3">
                <p className="mb-0">
                  Pilih Korem/Kodim lalu gambar lokasi di peta untuk
                  mengaktifkan sisa formulir.
                </p>
              </Alert>
            )}

            <fieldset disabled={!isEnabled || viewMode}>
              <Card className="mb-3">
                <Card.Header>
                  <strong>Detail Registrasi Aset</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>KIB/Kode Barang *</Form.Label>
                        <Form.Control
                          type="text"
                          name="kib_kode_barang"
                          value={formData.kib_kode_barang || ""}
                          onChange={handleChange}
                          placeholder="Contoh: 1.3.1.01.001"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nomor Registrasi *</Form.Label>
                        <Form.Control
                          type="text"
                          name="nomor_registrasi"
                          value={formData.nomor_registrasi || ""}
                          onChange={handleChange}
                          placeholder="Masukkan nomor registrasi"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Alamat Registrasi Aset *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="alamat"
                      value={formData.alamat || ""}
                      onChange={handleChange}
                      placeholder="Masukkan alamat lengkap"
                    />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Peruntukan *</Form.Label>
                        <Form.Control
                          type="text"
                          name="peruntukan"
                          value={formData.peruntukan || ""}
                          onChange={handleChange}
                          placeholder="Contoh: Kantor, Gudang, Latihan"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>
                  <strong>Detail Kepemilikan</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Status *</Form.Label>
                        <Form.Select
                          name="status"
                          value={formData.status || ""}
                          onChange={handleChange}
                        >
                          <option value="">-- Pilih Status --</option>
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Asal Milik *</Form.Label>
                        <Form.Control
                          type="text"
                          name="asal_milik"
                          value={formData.asal_milik || ""}
                          onChange={handleChange}
                          placeholder="Masukkan asal usul milik"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Status Sertifikat *</Form.Label>
                    <div>
                      <Form.Check
                        type="radio"
                        id="sertifikat-ya"
                        name="pemilikan_sertifikat"
                        value="Ya"
                        label="Bersertifikat"
                        onChange={handleChange}
                        checked={formData.pemilikan_sertifikat === "Ya"}
                        inline
                      />
                      <Form.Check
                        type="radio"
                        id="sertifikat-tidak"
                        name="pemilikan_sertifikat"
                        value="Tidak"
                        label="Tidak Bersertifikat"
                        onChange={handleChange}
                        checked={formData.pemilikan_sertifikat === "Tidak"}
                        inline
                      />
                    </div>
                    <Form.Text className="text-muted">
                      Pilihan ini akan menentukan field luas mana yang akan
                      digunakan
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Nama Bukti Kepemilikan</Form.Label>
                    <Form.Control
                      type="text"
                      name="keterangan_bukti_pemilikan"
                      value={formData.keterangan_bukti_pemilikan || ""}
                      onChange={handleChange}
                      placeholder="Contoh: Sertifikat Hak Milik No. 123"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Upload Bukti Pemilikan</Form.Label>
                    <Form.Control
                      type="file"
                      name="bukti_pemilikan_file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <Form.Text className="text-muted">
                      Format: PDF, JPG, JPEG, PNG (Maks. 5MB)
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Foto Aset</Form.Label>
                    <Form.Control
                      type="file"
                      name="asset_photos"
                      onChange={handleAssetPhotosChange}
                      multiple
                      accept=".jpg,.jpeg,.png"
                    />
                    <Form.Text className="text-muted">
                      Format: JPG, JPEG, PNG. Bisa pilih beberapa file sekaligus
                    </Form.Text>
                  </Form.Group>

                  {/* Data Sertifikat - Kondisional berdasarkan pilihan */}
                  {formData.pemilikan_sertifikat === "Ya" && (
                    <Card className="mb-3 border-success">
                      <Card.Header className="bg-success bg-opacity-10">
                        <strong>Data Sertifikat</strong>
                      </Card.Header>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Label>Atas Nama Pemilik Sertifikat</Form.Label>
                          <Form.Control
                            type="text"
                            name="atas_nama_pemilik_sertifikat"
                            value={formData.atas_nama_pemilik_sertifikat || ""}
                            onChange={handleChange}
                            placeholder="Masukkan atas nama pemilik sertifikat"
                          />
                        </Form.Group>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                Jumlah Bidang Bersertifikat
                              </Form.Label>
                              <Form.Control
                                type="number"
                                name="sertifikat_bidang"
                                value={formData.sertifikat_bidang || ""}
                                onChange={handleChange}
                                placeholder="Jumlah bidang"
                                min="0"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Luas Bersertifikat (m²) *</Form.Label>
                              <Form.Control
                                type="number"
                                name="sertifikat_luas"
                                value={formData.sertifikat_luas || ""}
                                onChange={handleChange}
                                placeholder="Otomatis dari peta atau isi manual"
                                title="Luas otomatis diisi dari area yang digambar di peta"
                                min="0"
                                step="0.01"
                              />
                              <Form.Text className="text-success">
                                Otomatis terisi dari area yang digambar di peta,
                                dapat diubah manual
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  )}

                  {formData.pemilikan_sertifikat === "Tidak" && (
                    <Card className="mb-3 border-warning">
                      <Card.Header className="bg-warning bg-opacity-10">
                        <strong>Data Belum Bersertifikat</strong>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                Jumlah Bidang Belum Bersertifikat
                              </Form.Label>
                              <Form.Control
                                type="number"
                                name="belum_sertifikat_bidang"
                                value={formData.belum_sertifikat_bidang || ""}
                                onChange={handleChange}
                                placeholder="Jumlah bidang"
                                min="0"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                Luas Belum Bersertifikat (m²) *
                              </Form.Label>
                              <Form.Control
                                type="number"
                                name="belum_sertifikat_luas"
                                value={formData.belum_sertifikat_luas || ""}
                                onChange={handleChange}
                                placeholder="Otomatis dari peta atau isi manual"
                                title="Luas otomatis diisi dari area yang digambar di peta"
                                min="0"
                                step="0.01"
                              />
                              <Form.Text className="text-warning">
                                Otomatis terisi dari area yang digambar di peta,
                                dapat diubah manual
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Info Area saat ini */}
                  {(initialArea || getCurrentAreaValue()) && (
                    <div className="alert alert-info">
                      <small>
                        <strong>Info Luas:</strong>
                        <br />• Area dari peta:{" "}
                        {initialArea
                          ? `${parseFloat(initialArea).toFixed(2)} m²`
                          : "Belum digambar"}
                        <br />• Luas{" "}
                        {formData.pemilikan_sertifikat === "Ya"
                          ? "bersertifikat"
                          : "tidak bersertifikat"}
                        : {getCurrentAreaValue() || "Belum diisi"} m²
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </fieldset>

            <div className="d-flex gap-2 justify-content-end mt-3">
              <Button variant="secondary" onClick={onCancel}>
                Batalkan
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!isEnabled}
              >
                Simpan Aset
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </>
  );
};

export default FormAset;
