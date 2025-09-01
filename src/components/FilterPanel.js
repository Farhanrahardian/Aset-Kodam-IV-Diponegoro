
import React from 'react';
import { ListGroup, Button } from 'react-bootstrap';

const SidebarNavigasi = ({ koremList, onSelectKorem, onShowAll, selectedKorem }) => {

  const activeStyle = {
    backgroundColor: '#2E7D32', // Darker Green
    borderColor: '#2E7D32'
  };

  return (
    <div>
      <h4>Wilayah Korem</h4>
      <ListGroup>
        {koremList.map(korem => (
          <ListGroup.Item 
            key={korem.id} 
            action 
            style={selectedKorem && selectedKorem.id === korem.id ? activeStyle : {}}
            active={selectedKorem && selectedKorem.id === korem.id}
            onClick={() => onSelectKorem(korem)}
          >
            {korem.nama}
          </ListGroup.Item>
        ))}
      </ListGroup>
      <Button variant="success" className="mt-3 w-100" onClick={onShowAll} style={{backgroundColor: '#66BB6A', border: 'none'}}>
        Tampilkan Semua Aset
      </Button>
    </div>
  );
};

export default SidebarNavigasi;
