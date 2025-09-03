// src/components/DetailOffcanvasAset.js
import React from "react";
import { Offcanvas, Table } from "react-bootstrap";

const DetailOffcanvasAset = ({ show, handleClose, aset }) => {
  if (!aset) return null;

  return (
    <Offcanvas show={show} onHide={handleClose} placement="end" backdrop={true}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Detail Aset Tanah</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Table striped bordered hover size="sm">
          <tbody>
            <tr>
              <td>
                <strong>NUP</strong>
              </td>
              <td>{aset.nama || "-"}</td> {/* Gunakan aset.nama */}
            </tr>
            <tr>
              <td>
                <strong>Luas</strong>
              </td>
              <td>{aset.luas ? `${aset.luas.toLocaleString()} m²` : "-"}</td>
            </tr>

            <tr>
              <td>
                <strong>Korem</strong>
              </td>
              {/* Anda tidak memiliki properti korem_nama. Anda bisa menambahkannya di dashboard.js atau tampilkan id saja jika diperlukan */}
              <td>{aset.korem_id || "-"}</td>
            </tr>
            <tr>
              <td>
                <strong>Kodim</strong>
              </td>
              {/* Anda tidak memiliki properti kodim_nama. */}
              <td>{aset.kodim || aset.kodim_id || "-"}</td>
            </tr>
            <tr>
              <td>
                <strong>Alamat</strong>
              </td>
              <td>{aset.alamat || "-"}</td>
            </tr>
            <tr>
              <td>
                <strong>Status</strong>
              </td>
              <td>{aset.status || "-"}</td>
            </tr>
            <tr>
              <td>
                <strong>Keterangan</strong>
              </td>
              <td>{aset.keterangan || "-"}</td>
            </tr>
          </tbody>
        </Table>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default DetailOffcanvasAset;
