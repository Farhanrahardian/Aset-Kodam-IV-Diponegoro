
import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Card } from 'react-bootstrap';

// This is now a simple form component, not a modal or a page.
const FormAset = ({ onSave, onCancel, koremList, assetToEdit, initialGeometry, initialArea, isEnabled = true }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (assetToEdit) {
      setFormData(assetToEdit);
    } else {
      // Reset form for new entry
      setFormData({
        nama: '',
        korem_id: koremList.length > 0 ? koremList[0].id : '',
        kodim: '',
        luas: initialArea ? parseFloat(initialArea.toFixed(2)) : 0, // Pre-fill with calculated area
        status: '',
        fungsi: '', // New field for usage
        lokasi: initialGeometry || null,
        kode_barang: '',
        no_reg: '',
        alamat: '',
        asal_milik: '',
        bukti_kepemilikan: '',
        atas_nama_pemilik_sertifikat: ''
      });
    }
  }, [assetToEdit, koremList, initialGeometry, initialArea]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = (name === 'korem_id' || name === 'luas') ? Number(value) : value;
    setFormData({ ...formData, [name]: newValue });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Card>
        <Card.Header>
            <h5>{assetToEdit ? 'Edit Detail Aset' : 'Lengkapi Detail Aset'}</h5>
        </Card.Header>
      <Card.Body>
        {!isEnabled && !assetToEdit && (
            <div className="text-muted text-center p-4">
                <p>Silakan gambar lokasi di peta terlebih dahulu untuk mengaktifkan formulir ini.</p>
            </div>
        )}
        <fieldset disabled={!isEnabled && !assetToEdit}>
            <Form>
            <Form.Group className="mb-3">
                <Form.Label>Nama Aset</Form.Label>
                <Form.Control type="text" name="nama" value={formData.nama || ''} onChange={handleChange} required />
            </Form.Group>

            <Row>
                <Col md={6}>
                <Form.Group className="mb-3">
                    <Form.Label>Wilayah Korem</Form.Label>
                    <Form.Select name="korem_id" value={formData.korem_id || ''} onChange={handleChange}>
                    {koremList.map(korem => (
                        <option key={korem.id} value={korem.id}>{korem.nama}</option>
                    ))}
                    </Form.Select>
                </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Kodim</Form.Label>
                        <Form.Control type="text" name="kodim" value={formData.kodim || ''} onChange={handleChange} placeholder="Contoh: Kodim 0701/Banyumas" required/>
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                <Form.Group className="mb-3">
                    <Form.Label>Luas (m²)</Form.Label>
                    <Form.Control type="number" name="luas" value={formData.luas || 0} onChange={handleChange} required />
                </Form.Group>
                </Col>
                <Col md={6}>
                <Form.Group className="mb-3">
                    <Form.Label>Status Kepemilikan</Form.Label>
                    <Form.Control type="text" name="status" value={formData.status || ''} onChange={handleChange} placeholder="Contoh: Sertifikat Hak Pakai" required/>
                </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Kode Barang</Form.Label>
                        <Form.Control type="text" name="kode_barang" value={formData.kode_barang || ''} onChange={handleChange} placeholder="Masukkan Kode Barang" />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>No. Registrasi</Form.Label>
                        <Form.Control type="text" name="no_reg" value={formData.no_reg || ''} onChange={handleChange} placeholder="Masukkan No. Registrasi" />
                    </Form.Group>
                </Col>
            </Row>

            <Form.Group className="mb-3">
                <Form.Label>Fungsi Tanah</Form.Label>
                <Form.Control type="text" name="fungsi" value={formData.fungsi || ''} onChange={handleChange} placeholder="Contoh: Asrama, Lapangan, Kosong" required/>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Alamat</Form.Label>
                <Form.Control as="textarea" rows={3} name="alamat" value={formData.alamat || ''} onChange={handleChange} placeholder="Masukkan Alamat" />
            </Form.Group>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Asal Kepemilikan</Form.Label>
                        <Form.Control type="text" name="asal_milik" value={formData.asal_milik || ''} onChange={handleChange} placeholder="Contoh: Hibah, Ganti Rugi" />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Bukti Kepemilikan</Form.Label>
                        <Form.Control type="text" name="bukti_kepemilikan" value={formData.bukti_kepemilikan || ''} onChange={handleChange} placeholder="Contoh: Sertifikat, IMB" />
                    </Form.Group>
                </Col>
            </Row>

            <Form.Group className="mb-3">
                <Form.Label>Atas Nama Pemilik Sertifikat</Form.Label>
                <Form.Control type="text" name="atas_nama_pemilik_sertifikat" value={formData.atas_nama_pemilik_sertifikat || ''} onChange={handleChange} placeholder="Masukkan Nama Pemilik" />
            </Form.Group>

            </Form>
        </fieldset>
      </Card.Body>
      <Card.Footer className="text-end">
        <Button variant="secondary" onClick={onCancel} className="me-2">
            Batal
        </Button>
        <Button variant="success" onClick={handleSave} disabled={!isEnabled && !assetToEdit} style={{backgroundColor: '#4CAF50', border: 'none'}}>
            Simpan Aset
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default FormAset;
