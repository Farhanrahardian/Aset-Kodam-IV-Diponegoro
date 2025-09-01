import React from 'react';
import { Card, Button, Row, Col, Badge } from 'react-bootstrap';

const RingkasanAset = ({ assets, onEdit, onDelete }) => {
  const isAdmin = onEdit && onDelete;

  return (
    <div>
      <h4 className="mb-3">Data Aset Tanah</h4>
      {assets.length > 0 ? (
        assets.map((item) => (
          <Card key={item.id} className="mb-3 shadow-sm">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{item.nama}</h5>
                {isAdmin && (
                  <div>
                    <Button variant="success" size="sm" onClick={() => onEdit(item)} className="me-2" style={{backgroundColor: '#66BB6A', border: 'none'}}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(item.id)}>
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p><strong>Kodim:</strong> {item.kodim || '-'}</p>
                  <p><strong>Luas:</strong> {item.luas ? item.luas.toLocaleString('id-ID') : '0'} m²</p>
                  <p><strong>Fungsi:</strong> {item.fungsi || '-'}</p>
                  <p><strong>Alamat:</strong> {item.alamat || '-'}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Kode Barang:</strong> <Badge bg="secondary">{item.kode_barang || '-'}</Badge></p>
                  <p><strong>No. Registrasi:</strong> <Badge bg="secondary">{item.no_reg || '-'}</Badge></p>
                  <p><strong>Asal Milik:</strong> {item.asal_milik || '-'}</p>
                  <p><strong>Bukti Kepemilikan:</strong> {item.bukti_kepemilikan || '-'}</p>
                  <p><strong>Status Kepemilikan:</strong> {item.status || '-'}</p>
                  <p><strong>Atas Nama Pemilik:</strong> {item.atas_nama_pemilik_sertifikat || '-'}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))
      ) : (
        <div className="text-center p-4 border rounded">
          <p className="mb-0">Tidak ada data untuk ditampilkan.</p>
        </div>
      )}
    </div>
  );
};

export default RingkasanAset;