
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import toast from "react-hot-toast";

import FormAset from "../components/FormAset";

const API_URL = "http://localhost:3001";

const EditAsetPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [koremList, setKoremList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assetRes = await axios.get(`${API_URL}/assets/${id}`);
        const koremRes = await axios.get(`${API_URL}/korem`);
        setAsset(assetRes.data);
        setKoremList(koremRes.data);
        setError(null);
      } catch (err) {
        setError("Gagal memuat data aset.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSaveAsset = async (assetData, buktiPemilikanFile) => {
    const toastId = toast.loading("Menyimpan perubahan...");

    try {
      let fileUploadData = {};
      if (buktiPemilikanFile) {
        const formData = new FormData();
        formData.append("bukti_pemilikan", buktiPemilikanFile);
        const uploadRes = await axios.post(`${API_URL}/upload/bukti-pemilikan`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        fileUploadData = {
          bukti_pemilikan_url: uploadRes.data.url,
          bukti_pemilikan_filename: uploadRes.data.filename,
        };
      }

      const finalData = {
        ...assetData,
        ...fileUploadData,
      };

      await axios.put(`${API_URL}/assets/${id}`, finalData);
      toast.success("Aset berhasil diperbarui!", { id: toastId });
      navigate("/data-aset-tanah");
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error("Gagal menyimpan aset", err);
    }
  };

  const handleCancel = () => {
    navigate("/data-aset-tanah");
  };

  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container fluid className="mt-4">
      <h3>Edit Aset Tanah</h3>
      <Row>
        <Col>
          {asset && (
            <FormAset
              onSave={handleSaveAsset}
              onCancel={handleCancel}
              koremList={koremList}
              assetToEdit={asset}
              isEnabled={true}
            />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default EditAsetPage;
