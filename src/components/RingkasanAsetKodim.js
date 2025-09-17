import React from 'react';
import { Card } from 'react-bootstrap';
import tanahData from '../data/tanah.json';

const RingkasanAsetKodim = () => {
  const asetByKodim = tanahData.reduce((acc, aset) => {
    const kodimName = (aset.kodim || 'Lainnya').replace(/^Kodim\s/i, '');
    acc[kodimName] = (acc[kodimName] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Title className="mb-3">Jumlah Aset per Kodim</Card.Title>
        <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
          <ul className="list-group list-group-flush">
            {Object.entries(asetByKodim).sort(([a], [b]) => a.localeCompare(b)).map(([kodimName, count]) => (
              <li key={kodimName} className="list-group-item d-flex justify-content-between align-items-center">
                {kodimName}
                <span className="badge bg-primary rounded-pill">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card.Body>
    </Card>
  );
};

export default RingkasanAsetKodim;
