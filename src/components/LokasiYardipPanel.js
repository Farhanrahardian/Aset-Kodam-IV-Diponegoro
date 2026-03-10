import React from "react";
import { Form, Row, Col, ButtonGroup, ToggleButton, Alert, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import "./LokasiYardipPanel.css";

const LokasiYardipPanel = ({
  provinsiList,
  kabupatenList,
  formData,
  handleChange,
  inputMethod,
  handleInputChangeMethod,
  handleKmlImport,
  kmlFileName,
  coordsText,
  setCoordsText,
  coordsError,
  handleProcessCoords,
  onMapLocationSelect,
}) => {
  return (
    <div className="lokasi-yardip-wrapper">
      <Form>
        {/* Provinsi & Kabupaten/Kota */}
        <Row className="gx-3">
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label>Provinsi *</Form.Label>
              <Form.Select
                name="provinsi"
                value={formData.provinsi || ""}
                onChange={(e) => {
                  handleChange(e);
                  if (onMapLocationSelect && e.target.value) {
                    onMapLocationSelect("provinsi", e.target.value);
                  }
                }}
                required
              >
                <option value="">-- Pilih Provinsi --</option>
                {provinsiList.map((provinsi) => (
                  <option key={provinsi.id} value={provinsi.nama}>
                    {provinsi.nama}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        <Row className="gx-3">
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label>Kabupaten/Kota *</Form.Label>
              <Form.Select
                name="kabkota"
                value={formData.kabkota || ""}
                onChange={(e) => {
                  handleChange(e);
                  if (onMapLocationSelect && e.target.value) {
                    onMapLocationSelect("kabupaten", e.target.value);
                  }
                }}
                required
                disabled={!formData.provinsi}
              >
                <option value="">-- Pilih Kabupaten/Kota --</option>
                {kabupatenList.map((kab) => (
                  <option key={kab.id} value={kab.nama}>
                    {kab.nama}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Pilih Metode Input Poligon */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Metode Input Poligon</Form.Label>
          <ButtonGroup className="d-flex flex-column gap-2 mt-2">
            <ToggleButton
              id="radio-draw"
              type="radio"
              variant="outline-primary"
              name="inputMethod"
              value="draw"
              checked={inputMethod === "draw"}
              onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
              className="w-100 rounded"
            >
              <i className="fas fa-pen me-2"></i>Gambar di Peta
            </ToggleButton>

            <ToggleButton
              id="radio-kml"
              type="radio"
              variant="outline-primary"
              name="inputMethod"
              value="kml"
              checked={inputMethod === "kml"}
              onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
              className="w-100 rounded"
            >
              <i className="fas fa-file-import me-2"></i>Impor File KML/KMZ
            </ToggleButton>

            <ToggleButton
              id="radio-coords"
              type="radio"
              variant="outline-primary"
              name="inputMethod"
              value="coords"
              checked={inputMethod === "coords"}
              onChange={(e) => handleInputChangeMethod(e.currentTarget.value)}
              className="w-100 rounded"
            >
              <i className="fas fa-keyboard me-2"></i>Input Koordinat
            </ToggleButton>
          </ButtonGroup>
        </Form.Group>

        {/* Impor KML/KMZ */}
        {inputMethod === "kml" && (
          <Form.Group className="mb-3 border p-3 rounded bg-light">
            <Form.Label className="fw-bold">Impor Poligon dari KML/KMZ</Form.Label>
            {!kmlFileName && (
              <Form.Control
                type="file"
                accept=".kml,.kmz"
                onChange={handleKmlImport}
              />
            )}
            {kmlFileName && (
              <>
                <div className="alert alert-info p-2 mb-2">
                  <i className="fas fa-check-circle me-2"></i>
                  File terpilih: <strong>{kmlFileName}</strong>
                </div>
                <Form.Control
                  type="file"
                  accept=".kml,.kmz"
                  onChange={handleKmlImport}
                  className="mb-2"
                />
                <Form.Text className="text-muted">
                  Pilih file baru untuk mengganti file yang saat ini dipilih
                </Form.Text>
              </>
            )}
            <Form.Text className="text-muted d-block mt-2">
              <i className="fas fa-info-circle me-1"></i>
              Format yang didukung: KML dan KMZ dari Google Earth
            </Form.Text>
          </Form.Group>
        )}

        {/* Input Koordinat Manual */}
        {inputMethod === "coords" && (
          <Form.Group className="mb-3 border p-3 rounded bg-light">
            <Form.Label className="fw-bold">Input Koordinat Manual</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={coordsText}
              onChange={(e) => setCoordsText(e.target.value)}
              placeholder="Satu titik per baris. Format: longitude,latitude"
              isInvalid={!!coordsError}
            />
            {coordsError && (
              <Alert variant="danger" className="mt-2 p-2 mb-0">
                <i className="fas fa-exclamation-circle me-2"></i>
                {coordsError}
              </Alert>
            )}
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={handleProcessCoords}
            >
              <i className="fas fa-cog me-2"></i>Proses Koordinat
            </Button>
          </Form.Group>
        )}
      </Form>
    </div>
  );
};

export default LokasiYardipPanel;
