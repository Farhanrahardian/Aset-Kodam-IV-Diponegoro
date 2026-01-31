import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Form,
  Button,
  Row,
  Col,
  Card,
  Alert,
  ButtonGroup,
  ToggleButton,
  InputGroup,
} from "react-bootstrap";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { kml } from "@tmcw/togeojson";
import { DOMParser } from "xmldom";

const initialYardipState = {
  pengelola: "",
  bidang: "",
  kabkota: "",
  kecamatan: "",
  kelurahan: "",
  peruntukan: "",
  status: "",
  keterangan: "",
  provinsi: "",
  area: 0,
  id: null,
};

const FormYardip = forwardRef(
  (
    {
      onSave,
      onCancel,
      isEnabled = false,
      selectedProvinceName,
      selectedKabupatenName,
      initialArea = 0,
      assetToEdit,
      isEditMode = false,
      onKmlImport,
      onCoordsImport,
      onClearPolygon, // Handler untuk menghapus polygon
      provinsiData,
      kabupatenData,
      onLocationChange,
      isPolygonCreated,
      onMapLocationSelect,
      onManualAreaChange, // NEW PROP
    },
    ref
  ) => {
    const [formData, setFormData] = useState(initialYardipState);
    const [errors, setErrors] = useState({});
    const [inputMethod, setInputMethod] = useState("draw");
    const [coordsText, setCoordsText] = useState("");
    const [coordsError, setCoordsError] = useState("");
    const [kmlFileName, setKmlFileName] = useState("");

    useImperativeHandle(ref, () => ({
      getFormData: () => ({ formData }),
    }));

    useEffect(() => {
      if (isEditMode && assetToEdit) {
        setFormData({
          ...initialYardipState, // Ensure all keys are present
          ...assetToEdit,
          area: assetToEdit.area || initialArea || 0,
        });
      } else {
        // For new assets, update based on map selection
        setFormData((prev) => ({
          ...initialYardipState,
          provinsi: selectedProvinceName || "",
          kabkota: selectedKabupatenName || "",
          area: initialArea || 0,
        }));
      }
    }, [
      assetToEdit,
      isEditMode,
      selectedProvinceName,
      selectedKabupatenName,
      initialArea,
    ]);

    // Update area when isPolygonCreated changes and initialArea is updated
    useEffect(() => {
      if (isPolygonCreated && initialArea > 0) {
        setFormData(prev => ({
          ...prev,
          area: initialArea
        }));
      }
    }, [isPolygonCreated, initialArea]);

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

    useEffect(() => {
      if (!isEnabled && !isEditMode) {
        handleReset();
      }
    }, [isEnabled, isEditMode]);

    const handleChange = useCallback(
      (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
          setErrors((prev) => ({ ...prev, [name]: "" }));
        }
      },
      [errors]
    );

    // NEW: Handler untuk perubahan area manual
    const handleAreaChange = useCallback(
      (e) => {
        const value = e.target.value;
        const numValue = parseFloat(value) || 0;

        setFormData((prev) => ({
          ...prev,
          area: numValue,
        }));

        // Notify parent component about manual area change
        if (onManualAreaChange) {
          onManualAreaChange(numValue);
        }
      },
      [onManualAreaChange]
    );

    const validateForm = useCallback(() => {
      const newErrors = {};
      if (!formData.pengelola?.trim())
        newErrors.pengelola = "Pengelola harus diisi";
      if (!formData.bidang?.trim()) newErrors.bidang = "Bidang harus dipilih";
      if (!formData.kabkota?.trim())
        newErrors.kabkota = "Alamat Kabupaten/Kota harus diisi";
      if (!formData.kecamatan?.trim())
        newErrors.kecamatan = "Kecamatan harus diisi";
      if (!formData.kelurahan?.trim())
        newErrors.kelurahan = "Kelurahan/Desa harus diisi";
      if (!formData.peruntukan?.trim())
        newErrors.peruntukan = "Peruntukan harus diisi";
      if (!formData.status?.trim()) newErrors.status = "Status harus dipilih";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = useCallback(
      (e) => {
        e.preventDefault();
        if (validateForm()) {
          onSave(formData);
        }
      },
      [validateForm, formData, onSave]
    );

    const handleReset = useCallback(() => {
      setFormData(initialYardipState);
      setErrors({});
    }, []);

    const handleKmlFileImport = (event) => {
      const file = event.target.files[0];

      // Jika sudah ada file KML yang dipilih dan pengguna ingin mengganti, tampilkan konfirmasi
      if (kmlFileName && file) {
        Swal.fire({
          title: "Apakah Anda yakin?",
          text: "Mengganti file KML akan menghapus area aset yang telah digambar sebelumnya. Lanjutkan?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Ya, ganti!",
          cancelButtonText: "Batal",
        }).then((result) => {
          if (result.isConfirmed) {
            // Hapus polygon yang sudah digambar sebelumnya
            if (isPolygonCreated && onClearPolygon) {
              onClearPolygon();
            }

            // Lanjutkan dengan proses impor file baru
            continueKmlImport(file, event);
          } else {
            // Jika pengguna membatalkan, reset input file
            event.target.value = null;
          }
        });
      } else {
        // Jika belum ada file yang dipilih, langsung proses
        continueKmlImport(file, event);
      }
    };

    const continueKmlImport = (file, event) => {
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
            setKmlFileName(""); // Reset nama file jika error
            return;
          }
          const importedPolygon = geojsonData.features.find(
            (f) =>
              f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon"
          );
          if (importedPolygon) {
            const geometry =
              importedPolygon.geometry.type === "MultiPolygon"
                ? {
                    type: "Polygon",
                    coordinates: importedPolygon.geometry.coordinates[0],
                  }
                : importedPolygon.geometry;
            onKmlImport?.(geometry, 'kml');
            // Notifikasi akan ditangani di parent component
          } else {
            toast.error("Tidak ditemukan geometri poligon dalam file KML.");
            setKmlFileName(""); // Reset nama file jika tidak ada poligon
          }
        } catch (error) {
          toast.error("Gagal memproses file KML.");
          setKmlFileName(""); // Reset nama file jika error
          console.error("KML parsing error:", error);
        }
      };
      reader.readAsText(file);
      event.target.value = null;
    };

    const handleProcessCoords = () => {
      // Jika sudah ada koordinat yang diproses dan pengguna ingin mengganti, tampilkan konfirmasi
      if (coordsText.trim() && isPolygonCreated) {
        Swal.fire({
          title: "Apakah Anda yakin?",
          text: "Memproses koordinat baru akan menghapus area aset yang telah digambar sebelumnya. Lanjutkan?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Ya, proses!",
          cancelButtonText: "Batal",
        }).then((result) => {
          if (result.isConfirmed) {
            // Hapus polygon yang sudah digambar sebelumnya
            if (onClearPolygon) {
              onClearPolygon();
            }

            // Lanjutkan dengan proses koordinat
            continueProcessCoords();
          }
        });
      } else {
        // Jika belum ada koordinat yang diproses sebelumnya, langsung proses
        continueProcessCoords();
      }
    };

    const continueProcessCoords = () => {
      setCoordsError("");
      const lines = coordsText.trim().split("\n");
      if (lines.length < 3) {
        setCoordsError(
          "Minimal dibutuhkan 3 titik koordinat untuk membuat poligon."
        );
        return;
      }

      const coordinates = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const parts = line.split(/[\s,;\t]+/);
        if (parts.length !== 2) {
          setCoordsError(
            `Format salah di baris ${i + 1}. Gunakan format: longitude,latitude`
          );
          return;
        }
        const lon = parseFloat(parts[0].trim());
        const lat = parseFloat(parts[1].trim());
        if (
          isNaN(lon) ||
          isNaN(lat) ||
          lat < -90 ||
          lat > 90 ||
          lon < -180 ||
          lon > 180
        ) {
          setCoordsError(`Koordinat tidak valid di baris ${i + 1}.`);
          return;
        }
        coordinates.push([lon, lat]);
      }

      if (
        coordinates.length > 0 &&
        (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
          coordinates[0][1] !== coordinates[coordinates.length - 1][1])
      ) {
        coordinates.push(coordinates[0]);
      }

      const geojsonPolygon = { type: "Polygon", coordinates: [coordinates] };
      onCoordsImport?.(geojsonPolygon, 'coords');
      // Notifikasi akan ditangani di parent component
    };

    const handleProvinceChange = (e) => {
      const selectedProvince = e.target.value;
      onLocationChange(selectedProvince, "");
      if (selectedProvince && onMapLocationSelect) {
        onMapLocationSelect("provinsi", selectedProvince);
      }
    };

    // Fungsi untuk mengecek apakah kabupaten adalah area konservasi
    const isConservationArea = (kabupatenName) => {
      return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
    };

    const handleKabupatenChange = (e) => {
      const selectedKabupaten = e.target.value;
      onLocationChange(selectedProvinceName, selectedKabupaten);
      if (selectedKabupaten && onMapLocationSelect) {
        onMapLocationSelect("kabupaten", selectedKabupaten);
      }
    };

    // Fungsi untuk mengganti metode input dengan konfirmasi
    const handleInputChangeMethod = (newMethod) => {
      // Jika metode input berubah dan ada polygon yang sudah dibuat, tampilkan konfirmasi
      if (newMethod !== inputMethod && isPolygonCreated) {
        Swal.fire({
          title: "Apakah Anda yakin?",
          text: "Mengganti metode input lokasi akan menghapus area aset yang telah digambar dan kembali ke tampilan awal peta. Lanjutkan?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Ya, ganti!",
          cancelButtonText: "Batal",
        }).then((result) => {
          if (result.isConfirmed) {
            // Hapus polygon yang sudah digambar dengan memanggil handler dari parent
            if (onClearPolygon) {
              onClearPolygon(); // Panggil handler khusus untuk menghapus polygon
            }

            // Reset input KML dan koordinat saat berpindah metode
            if (inputMethod === 'kml') {
              setKmlFileName(""); // Reset nama file KML
            } else if (inputMethod === 'coords') {
              setCoordsText(""); // Reset teks koordinat
              setCoordsError(""); // Reset error koordinat
            }

            setInputMethod(newMethod);
          } else {
            // Jika pengguna membatalkan, kembalikan metode input ke sebelumnya
            setInputMethod(inputMethod);
          }
        });
      } else {
        // Jika tidak ada polygon yang digambar, langsung ganti metode input
        // Reset input KML dan koordinat saat berpindah metode
        if (inputMethod === 'kml') {
          setKmlFileName(""); // Reset nama file KML
        } else if (inputMethod === 'coords') {
          setCoordsText(""); // Reset teks koordinat
          setCoordsError(""); // Reset error koordinat
        }

        setInputMethod(newMethod);
      }
    };

    return (
      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {!isEnabled && !isEditMode && (
              <Alert variant="info">
                Pilih lokasi Provinsi dan Kabupaten/Kota di peta untuk memulai.
              </Alert>
            )}

            <fieldset disabled={!isEnabled && !isEditMode}>
              {!isEditMode && isEnabled && (
                <Form.Group className="mb-3 border p-3 rounded bg-light">
                  <Form.Label className="fw-bold">
                    Pilih Metode Input Poligon
                  </Form.Label>
                  <div className="mt-2">
                    <ButtonGroup>
                      <ToggleButton
                        key="draw"
                        id="yardip-radio-draw"
                        type="radio"
                        variant="outline-primary"
                        name="inputMethod"
                        value="draw"
                        checked={inputMethod === "draw"}
                        onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
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
                        checked={inputMethod === "kml"}
                        onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
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
                        checked={inputMethod === "coords"}
                        onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
                      >
                        Input Koordinat
                      </ToggleButton>
                    </ButtonGroup>
                  </div>

                  {inputMethod === "draw" && (
                    <Alert variant="secondary" className="mt-3 mb-0">
                      Gunakan kontrol gambar di pojok kiri atas peta untuk
                      menggambar area aset.
                    </Alert>
                  )}

                  {inputMethod === "kml" && (
                    <Form.Group className="mt-3 mb-0">
                      <Form.Label>Upload File KML</Form.Label>
                      {!kmlFileName && (
                        <Form.Control
                          type="file"
                          accept=".kml"
                          onChange={handleKmlFileImport}
                        />
                      )}
                      {kmlFileName && (
                        <>
                          <div className="alert alert-info p-2 mb-2">
                            File terpilih: <strong>{kmlFileName}</strong>
                          </div>
                          <Form.Control
                            type="file"
                            accept=".kml"
                            onChange={handleKmlFileImport}
                            className="mb-2"
                          />
                          <Form.Text className="text-muted">
                            Pilih file baru untuk mengganti file yang saat ini dipilih
                          </Form.Text>
                        </>
                      )}
                    </Form.Group>
                  )}

                  {inputMethod === "coords" && (
                    <Form.Group className="mt-3 mb-0">
                      <Form.Label>
                        Input Koordinat Manual (Format: longitude, latitude)
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={coordsText}
                        onChange={(e) => setCoordsText(e.target.value)}
                        placeholder="Satu titik per baris. Contoh:\n110.4283,-6.9904\n110.4285,-6.9910\n110.4279,-6.9908"
                      />
                      {coordsError && (
                        <Alert variant="danger" className="mt-2 p-2">
                          {coordsError}
                        </Alert>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-2"
                        onClick={handleProcessCoords}
                      >
                        Proses Koordinat
                      </Button>
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
                          onChange={handleProvinceChange}
                          disabled={isEditMode}
                        >
                          <option value="">-- Pilih Provinsi --</option>
                          {provinsiData?.features.map((p) => (
                            <option
                              key={p.properties.PROVINCE}
                              value={p.properties.PROVINCE}
                            >
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
                          onChange={handleKabupatenChange}
                          disabled={isEditMode || !selectedProvinceName}
                        >
                          <option value="">-- Pilih Kabupaten/Kota --</option>
                          {selectedProvinceName &&
                            kabupatenData?.features
                              .filter(
                                (f) =>
                                  f.properties.PROVINCE === selectedProvinceName && !isConservationArea(f.properties.Kabupaten)
                              )
                              .map((f) => (
                                <option
                                  key={f.properties.Kabupaten}
                                  value={f.properties.Kabupaten}
                                >
                                  {f.properties.Kabupaten}
                                </option>
                              ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Luas Area (dari Peta) <span className="text-danger">*</span>
                    </Form.Label>
                    {isPolygonCreated ? (
                      <InputGroup>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="area"
                          value={formData.area || 0}
                          onChange={handleAreaChange}
                          placeholder="Area dari peta"
                        />
                        <InputGroup.Text>m²</InputGroup.Text>
                      </InputGroup>
                    ) : (
                      <InputGroup>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="area"
                          value={0}
                          onChange={handleAreaChange}
                          placeholder="Area dari peta"
                          disabled
                        />
                        <InputGroup.Text>m²</InputGroup.Text>
                      </InputGroup>
                    )}
                    <Form.Text className="text-muted">
                      {isPolygonCreated
                        ? "Nilai otomatis dari peta, dapat diedit manual jika diperlukan"
                        : "Silakan buat poligon di peta terlebih dahulu untuk melihat luas area"}
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              {!isPolygonCreated && !isEditMode && (
                <Alert variant="warning" className="text-center">
                  Silakan buat poligon di peta terlebih dahulu (gambar, impor
                  KML, atau input koordinat) untuk mengisi detail aset.
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
                        isInvalid={!!errors.peruntukan}
                        required
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.peruntukan}
                      </Form.Control.Feedback>
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
                  </Card.Body>
                </Card>

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
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>
              </fieldset>

              {!isEditMode && (
                <Row>
                  <Col>
                    <div className="d-flex justify-content-between">
                      <Button variant="secondary" onClick={onCancel}>
                        Batal
                      </Button>
                      <Button type="submit" variant="primary">
                        {isEditMode ? "Simpan Perubahan" : "Simpan Aset"}
                      </Button>
                    </div>
                  </Col>
                </Row>
              )}
            </fieldset>
          </Form>
        </Card.Body>
      </Card>
    );
  }
);

export default FormYardip;