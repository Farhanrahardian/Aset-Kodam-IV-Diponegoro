import React from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';

const ViewFilePage = () => {
  const location = useLocation();
  // The path will be everything after /view-file/
  const filePath = location.pathname.replace('/view-file/', '');
  const fullUrl = `http://localhost:3001/${filePath}`;

  const isPdf = filePath.toLowerCase().endsWith('.pdf');

  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Tampilan File: {filePath.split('/').pop()}</h5>
            </Card.Header>
            <Card.Body style={{ height: 'calc(100vh - 200px)', padding: 0 }}>
              {isPdf ? (
                <iframe
                  src={fullUrl}
                  title="PDF Viewer"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
                  <img
                    src={fullUrl}
                    alt="Tampilan File"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}
            </Card.Body>
            <Card.Footer>
              <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                Buka di tab baru
              </a>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ViewFilePage;
