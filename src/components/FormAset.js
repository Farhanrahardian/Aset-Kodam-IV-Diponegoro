import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button, Form, Row, Col, Card, Alert, Image, ButtonGroup, ToggleButton } from "react-bootstrap";
import toast from "react-hot-toast";
import axios from "axios";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "xmldom";
import { normalizeKodimName } from "../utils/kodimUtils";
import * as turf from "@turf/turf";

const isImageFile = (filename) => {
  if (!filename) return false;
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
};

const isPdfFile = (filename) => {
  if (!filename) return false;
  return filename.toLowerCase().endsWith(".pdf");
};

const FormAset = forwardRef(({
  onSave,
  onCancel,
  koremList,
  onLocationChange,
  onKmlImport,
  assetToEdit,
  initialGeometry,
  initialArea,
  isEnabled = false,
  viewMode = false,
  selectedKoremId,
  selectedKodimId,
  isEditMode = false,
}, ref) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [kodimList, setKodimList] = useState([]);
  const [buktiPemilikanFile, setBuktiPemilikanFile] = useState(null);
  const [assetPhotos, setAssetPhotos] = useState([]);
  const [kmlFileName, setKmlFileName] = useState("");
  const [inputMethod, setInputMethod] = useState('draw'); // 'draw', 'kml', 'coords'
  const [coordsText, setCoordsText] = useState("");
  const [coordsError, setCoordsError] = useState("");

  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      formData,
      buktiPemilikanFile,
      assetPhotos,
    }),
  }));

  const statusOptions = [
    { value: "Digunakan", label: "Digunakan" },
    { value: "Tidak Digunakan", label: "Tidak Digunakan" },
    { value: "Rusak", label: "Rusak" },
    { value: "Dihapuskan", label: "Dihapuskan" },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBuktiPemilikanFile(file);
    }
  };

  const handleAssetPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setAssetPhotos(files);
    }
  };

  const getCurrentAreaValue = () => {
    if (formData.pemilikan_sertifikat === "Ya") {
      return formData.sertifikat_luas;
    }
    return formData.belum_sertifikat_luas;
  };

  const handleSave = () => {
    // Basic validation
    const newErrors = {};
    if (!formData.nama) newErrors.nama = "NUP tidak boleh kosong.";
    if (!formData.korem_id) newErrors.korem_id = "Korem tidak boleh kosong.";
    if (!formData.kodim) newErrors.kodim = "Kodim tidak boleh kosong.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Silakan lengkapi semua field yang wajib diisi.");
      return;
    }

    onSave(formData, buktiPemilikanFile, assetPhotos);
  };

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
    if (!assetToEdit) {
      if (selectedKoremId !== formData.korem_id) {
        setFormData((prev) => ({ ...prev, korem_id: selectedKoremId, kodim: selectedKodimId || "" }));
      } else if (selectedKodimId !== formData.kodim) {
        setFormData((prev) => ({ ...prev, kodim: selectedKodimId }));
      }
    }
  }, [assetToEdit, selectedKoremId, selectedKodimId, formData.korem_id, formData.kodim]);

  useEffect(() => {
    if (formData.korem_id) {
      const selectedKoremData = koremList.find((k) => k.id === formData.korem_id);
      if (selectedKoremData) {
        const kodimObjects = selectedKoremData.kodim?.map((kName) => ({ id: kName, nama: kName })) || [];
        setKodimList(kodimObjects);
        if (!assetToEdit) {
          if (formData.kodim && kodimObjects.length > 0 && !kodimObjects.some((k) => k.id === formData.kodim)) {
            setFormData((prev) => ({ ...prev, kodim: "" }));
            onLocationChange?.(formData.korem_id, "");
          } else if (kodimObjects.length === 0) {
            const newKodim = selectedKoremData.nama === "Berdiri Sendiri" || selectedKoremData.nama === "Kodim 0733/Kota Semarang" ? "Kodim 0733/Kota Semarang" : selectedKoremData.nama;
            setFormData((prev) => ({ ...prev, kodim: newKodim }));
            onLocationChange?.(formData.korem_id, newKodim);
          }
        }
      }
    } else {
      setKodimList([]);
      if (!assetToEdit) {
        setFormData((prev) => ({ ...prev, kodim: "" }));
      }
    }
  }, [assetToEdit, formData.korem_id, koremList, onLocationChange, formData.kodim]);

  useEffect(() => {
    if (initialArea > 0) {
      const areaValue = parseFloat(initialArea.toFixed(2));
      setFormData((prev) => {
        const updatedData = { ...prev };
        if (prev.pemilikan_sertifikat === "Ya") {
          updatedData.sertifikat_luas = areaValue;
          updatedData.belum_sertifikat_luas = "";
        } else {
          updatedData.belum_sertifikat_luas = areaValue;
          updatedData.sertifikat_luas = "";
        }
        updatedData.luas = areaValue;
        return updatedData;
      });
    }
  }, [initialArea, formData.pemilikan_sertifikat]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "korem_id") {
      const selectedKoremData = koremList.find(k => k.id === value);
      let kodimValue = "";
      if (selectedKoremData && (selectedKoremData.nama === "Berdiri Sendiri" || selectedKoremData.nama === "Kodim 0733/Kota Semarang")) {
        kodimValue = "Kodim 0733/Kota Semarang";
      }
      setFormData({ ...formData, korem_id: value, kodim: kodimValue });
      onLocationChange?.(value, kodimValue);
    } else if (name === "pemilikan_sertifikat") {
      const currentArea = formData.sertifikat_luas || formData.belum_sertifikat_luas || formData.luas || initialArea;
      setFormData((prev) => {
        const updatedData = { ...prev, [name]: value };
        if (value === "Ya") {
          updatedData.sertifikat_luas = currentArea || "";
          updatedData.belum_sertifikat_luas = "";
        } else {
          updatedData.belum_sertifikat_luas = currentArea || "";
          updatedData.sertifikat_luas = "";
        }
        return updatedData;
      });
    } else {
      setFormData({ ...formData, [name]: value });
      if (name === "kodim") {
        onLocationChange?.(formData.korem_id, value);
      }
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const analyzeAndSetGeometry = async (geometry) => {
    const toastId = toast.loading("Menganalisis poligon...");
    try {
      toast.loading("Memuat data batas wilayah...", { id: toastId });
      const [koremBoundaryRes, kodimBoundaryRes] = await Promise.all([
        axios.get("/data/korem.geojson"),
        axios.get("/data/Kodim.geojson"),
      ]);
      const koremBoundaryData = koremBoundaryRes.data;
      const kodimBoundaryData = kodimBoundaryRes.data;

      toast.loading("Mencari wilayah...", { id: toastId });
      const centerPoint = turf.centroid(geometry);
      let foundKorem = null;
      let foundKodim = null;

      for (const koremFeature of koremBoundaryData.features) {
        if (turf.booleanPointInPolygon(centerPoint, koremFeature)) {
          foundKorem = koremFeature.properties;
          break;
        }
      }

      if (foundKorem) {
        for (const kodimFeature of kodimBoundaryData.features) {
          if (turf.booleanPointInPolygon(centerPoint, kodimFeature)) {
            foundKodim = kodimFeature.properties;
            break;
          }
        }

        const koremNameInGeoJSON = foundKorem.listkodim_Korem;
        const koremIdToSet = koremList.find(k => k.nama === koremNameInGeoJSON)?.id;
        const kodimNameInGeoJSON = foundKodim ? normalizeKodimName(foundKodim.listkodim_Kodim) : (koremNameInGeoJSON === "Berdiri Sendiri" || koremNameInGeoJSON === "Kodim 0733/Kota Semarang" ? "Kodim 0733/Kota Semarang" : koremNameInGeoJSON);

        if (koremIdToSet) {
          setFormData(prev => ({ ...prev, korem_id: koremIdToSet, kodim: kodimNameInGeoJSON }));
          onLocationChange?.(koremIdToSet, kodimNameInGeoJSON);
          onKmlImport?.(geometry);
          toast.success(`Poligon berhasil diproses. Wilayah: ${koremNameInGeoJSON}.`, { id: toastId });
        } else {
          toast.error(`Korem "${koremNameInGeoJSON}" ditemukan tapi tidak ada di daftar pilihan.`, { id: toastId });
        }
      } else {
        toast.error("Gagal menentukan wilayah Korem untuk poligon.", { id: toastId });
      }
    } catch (error) {
      console.error("Error during geometry analysis:", error);
      toast.error("Terjadi kesalahan saat memproses geometri.", { id: toastId });
    }
  };

  const handleKmlImport = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setKmlFileName("");
      return;
    }
    setKmlFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const kmlString = e.target.result;
      const kmlDom = new DOMParser().parseFromString(kmlString, "text/xml");
      const geojsonData = kml(kmlDom);

      if (!geojsonData?.features?.length) {
        toast.error("File KML tidak valid atau tidak berisi poligon.");
        setKmlFileName("");
        return;
      }
      const importedPolygon = geojsonData.features.find(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
      if (importedPolygon) {
        analyzeAndSetGeometry(importedPolygon.geometry);
      } else {
        toast.error("Tidak ditemukan geometri poligon dalam file KML.");
        setKmlFileName("");
      }
    };
    reader.readAsText(file);
    event.target.value = null;
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
      const parts = line.split(',');
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
    if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
      coordinates.push(coordinates[0]);
    }

    const geojsonPolygon = { type: "Polygon", coordinates: [coordinates] };
    analyzeAndSetGeometry(geojsonPolygon);
  };

  // Omitted for brevity: handleSave, statusOptions, getCurrentAreaValue, etc.
  // ... (The rest of the component logic remains the same)

  return (
    <>
      <Card>
        <Card.Header><h5>Lengkapi Detail Aset</h5></Card.Header>
        <Card.Body>
          <Form>
            <Card className="mb-3">
              <Card.Header><strong>Informasi Dasar Aset</strong></Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Wilayah Korem *</Form.Label>
                      <Form.Select name="korem_id" value={formData.korem_id || ""} onChange={handleChange} required disabled={viewMode || !!assetToEdit}>
                        <option value="">-- Pilih Korem --</option>
                        {koremList.map((korem) => (
                          <option key={korem.id} value={korem.id}>
                            {korem.nama === "Berdiri Sendiri" ? "Kodim 0733/Kota Semarang" : korem.nama}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Kodim *</Form.Label>
                      <Form.Select name="kodim" value={formData.kodim || ""} onChange={handleChange} disabled={viewMode || !!assetToEdit || !formData.korem_id || kodimList.length === 0} required>
                        <option value="">-- Pilih Kodim --</option>
                        {kodimList.map((kodim) => (
                          <option key={kodim.id} value={kodim.id}>{kodim.nama}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {!viewMode && !isEditMode && (
                                  <Form.Group className="mb-3">
                  <Form.Label>Pilih Metode Input Lokasi</Form.Label>
                  <div className="mt-2">
                    <ButtonGroup>
                      <ToggleButton
                        key="draw"
                        id="radio-draw"
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
                        id="radio-kml"
                        type="radio"
                        variant="outline-primary"
                        name="inputMethod"
                        value="kml"
                        checked={inputMethod === 'kml'}
                        onChange={(e) => setInputMethod(e.currentTarget.value)}
                      >
                        Impor File KML
                      </ToggleButton>
                      <ToggleButton
                        key="coords"
                        id="radio-coords"
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
                </Form.Group>
                )}

                {!viewMode && !isEditMode && inputMethod === 'kml' && (
                  <Form.Group className="mb-3 border p-3 rounded">
                    <Form.Label>Impor Poligon dari KML</Form.Label>
                    <Form.Control type="file" accept=".kml" onChange={handleKmlImport} />
                    {kmlFileName && <Form.Text className="text-success mt-1 d-block">File terimpor: <strong>{kmlFileName}</strong></Form.Text>}
                  </Form.Group>
                )}

                {!viewMode && !isEditMode && inputMethod === 'coords' && (
                  <Form.Group className="mb-3 border p-3 rounded">
                    <Form.Label>Input Koordinat Manual</Form.Label>
                    <Form.Control as="textarea" rows={5} value={coordsText} onChange={(e) => setCoordsText(e.target.value)} placeholder="Satu titik per baris. Format: longitude,latitude\nContoh:\n110.4283,-6.9904
110.4285,-6.9910
110.4279,-6.9908" />
                    <Form.Text className="text-muted">Minimal 3 titik untuk membentuk poligon.</Form.Text>
                    {coordsError && <Alert variant="danger" className="mt-2 p-2">{coordsError}</Alert>}
                    <Button variant="primary" size="sm" className="mt-2" onClick={handleProcessCoords}>Proses Koordinat</Button>
                  </Form.Group>
                )}
                                {isEnabled && (
                  <fieldset disabled={viewMode}>
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
                )}
              </Card.Body>
            </Card>

            {!isEnabled && !viewMode && (
              <Alert variant="warning" className="text-center p-4 mt-3">
                <p className="mb-0">
                  Gambar lokasi di peta untuk
                  mengaktifkan sisa formulir.
                </p>
                <p className="mb-0 mt-2">
                  <small>
                    Anda bisa memilih metode untuk menginputkan lokasi aset dengan menggambar poligon secara langsung di peta, mengimpor file KML, atau memasukkan koordinat secara manual.
                  </small>
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
                    {isEditMode && formData.bukti_pemilikan_url && (
                      <div className="mb-2">
                        <Card body>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              {isImageFile(formData.bukti_pemilikan_filename) ? (
                                <Image src={formData.bukti_pemilikan_url.startsWith('http') ? formData.bukti_pemilikan_url : `http://localhost:3001${formData.bukti_pemilikan_url}`} alt="Preview" style={{ height: '50px', marginRight: '10px', cursor: 'pointer' }} fluid onClick={() => window.open(formData.bukti_pemilikan_url.startsWith('http') ? formData.bukti_pemilikan_url : `http://localhost:3001${formData.bukti_pemilikan_url}`, '_blank')} />
                              ) : isPdfFile(formData.bukti_pemilikan_filename) ? (
                                <Button variant="outline-secondary" size="sm" onClick={() => window.open(formData.bukti_pemilikan_url.startsWith('http') ? formData.bukti_pemilikan_url : `http://localhost:3001${formData.bukti_pemilikan_url}`, '_blank')}>Lihat PDF</Button>
                              ) : (
                                <a href={formData.bukti_pemilikan_url.startsWith('http') ? formData.bukti_pemilikan_url : `http://localhost:3001${formData.bukti_pemilikan_url}`} target="_blank" rel="noopener noreferrer">
                                  Lihat File
                                </a>
                              )}
                              <span className="ms-2 fst-italic">{formData.bukti_pemilikan_filename}</span>
                            </div>
                            <Button variant="danger" size="sm" onClick={() => {
                              setFormData(prev => ({...prev, bukti_pemilikan_url: '', bukti_pemilikan_filename: ''}));
                              toast.success('Bukti pemilikan akan dihapus setelah disimpan.');
                            }}>
                              Hapus
                            </Button>
                          </div>
                        </Card>
                      </div>
                    )}
                    <Form.Control
                      type="file"
                      name="bukti_pemilikan_file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <Form.Text className="text-muted">
                      {isEditMode ? 'Upload file baru untuk mengganti yang lama.' : 'Format: PDF, JPG, JPEG, PNG (Maks. 5MB)'}
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Foto Aset</Form.Label>
                    {isEditMode && formData.foto_aset && formData.foto_aset.length > 0 && (
                      <div className="mb-2 p-2 border rounded">
                        <p><strong>Foto saat ini:</strong></p>
                        <div className="d-flex flex-wrap gap-2">
                          {formData.foto_aset.map((photoUrl, index) => (
                            <Card key={index} className="position-relative" style={{ width: '100px', height: '100px' }}>
                              <Card.Img 
                                src={photoUrl.startsWith('http') ? photoUrl : `http://localhost:3001${photoUrl}`} 
                                alt={`Foto Aset ${index + 1}`} 
                                style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
                              />
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="position-absolute top-0 end-0 m-1"
                                onClick={() => {
                                  const newPhotos = formData.foto_aset.filter(url => url !== photoUrl);
                                  setFormData(prev => ({...prev, foto_aset: newPhotos}));
                                  toast.success('Foto akan dihapus setelah disimpan.');
                                }}
                              >
                                X
                              </Button>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    <Form.Control
                      type="file"
                      name="asset_photos"
                      onChange={handleAssetPhotosChange}
                      multiple
                      accept=".jpg,.jpeg,.png"
                    />
                    <Form.Text className="text-muted">
                      {isEditMode ? 'Upload file baru untuk menambah foto.' : 'Format: JPG, JPEG, PNG. Bisa pilih beberapa file sekaligus'}
                    </Form.Text>
                  </Form.Group>

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

            {!assetToEdit && (
              <div className="d-flex gap-2 justify-content-end mt-3">
                <Button variant="secondary" onClick={onCancel}>
                  Batalkan
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleSave}
                  disabled={!isEnabled}
                >
                  Simpan Aset
                </Button>
              </div>
            )}
          </Form>
        </Card.Body>
      </Card>
    </>
  );
});

export default FormAset;;