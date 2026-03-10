import React from "react";
import { Form, Row, Col, ButtonGroup, ToggleButton, Alert, Button } from "react-bootstrap";
import "./InformasiDasarAset.css";

const InformasiDasarAset = ({
  koremList,
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
  isEnabled,
  kodimList,
}) => {
  return (
    <div className="informasi-dasar-wrapper">
      <Form>
        {/* Wilayah Korem & Kodim */}
        <Row className="gx-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Korem *</Form.Label>
              <Form.Select
                name="korem_id"
                value={formData.korem_id || ""}
                onChange={handleChange}
                required
                disabled={!!formData.assetToEdit}
              >
                <option value="">-- Pilih Korem --</option>
                {koremList.map((korem) => (
                  <option key={korem.id} value={korem.id}>
                    {korem.nama === "Berdiri Sendiri"
                      ? "Kodim 0733/Kota Semarang"
                      : korem.nama}
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
                  !!formData.assetToEdit ||
                  !formData.korem_id ||
                  kodimList.length === 0
                }
                required
              >
                <option value="">-- Pilih Kodim --</option>
                {kodimList.map((kodim, index) => (
                  <option key={`${kodim.id}-${index}`} value={kodim.id}>
                    {kodim.nama}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Pilih Metode Input Lokasi */}
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

export default InformasiDasarAset;
