import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import RingkasanAset from "../components/RingkasanAset";
import FormAset from "../components/FormAset";
import FilterPanel from "../components/FilterPanel";

const API_URL = "http://localhost:3001";

const DataAsetTanahPage = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [koremList, setKoremList] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedKorem, setSelectedKorem] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const assetsRes = await axios.get(`${API_URL}/assets`);
      const koremRes = await axios.get(`${API_URL}/korem`);
      setAssets(assetsRes.data);
      setKoremList(koremRes.data);
      setError(null);
    } catch (err) {
      setError("Gagal memuat data dari server. Pastikan server API berjalan.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedKorem) {
      setFilteredAssets(assets.filter((a) => a.korem_id == selectedKorem.id));
    } else {
      setFilteredAssets(assets);
    }
  }, [selectedKorem, assets]);

  const handleSaveAsset = async (assetData) => {
    const toastId = toast.loading('Menyimpan perubahan...');
    try {
      if (editingAsset) {
        const response = await axios.put(
          `${API_URL}/assets/${editingAsset.id}`,
          assetData
        );
        setAssets(
          assets.map((a) => (a.id === editingAsset.id ? response.data : a))
        );
        toast.success('Aset berhasil diperbarui!', { id: toastId });
      }
      setShowModal(false);
      setEditingAsset(null);
    } catch (err) {
      toast.error('Gagal menyimpan perubahan.', { id: toastId });
      console.error("Gagal menyimpan aset", err);
      setError("Gagal menyimpan aset.");
    }
  };

  const handleDeleteAsset = async (id) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const toastId = toast.loading('Menghapus aset...');
        try {
          await axios.delete(`${API_URL}/assets/${id}`);
          setAssets(assets.filter((a) => a.id !== id));
          toast.success('Aset berhasil dihapus.', { id: toastId });
        } catch (err) {
          toast.error('Gagal menghapus aset.', { id: toastId });
          console.error("Gagal menghapus aset", err);
          setError("Gagal menghapus aset.");
        }
      }
    });
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container fluid>
      <Row>
        {assets.length > 0 && (
          <Col md={3} className="bg-light p-3">
            <h4 className="mb-3">Filter Data</h4>
            <FilterPanel
              koremList={koremList}
              onSelectKorem={setSelectedKorem}
              onShowAll={() => setSelectedKorem(null)}
              selectedKorem={selectedKorem}
            />
          </Col>
        )}
        <Col md={assets.length > 0 ? 9 : 12}>
          <h2 className="mt-3"></h2>
          <div style={{ height: "calc(100vh - 180px)", overflowY: "auto" }}>
            <RingkasanAset
              assets={filteredAssets}
              onEdit={user ? handleEditAsset : null}
              onDelete={user ? handleDeleteAsset : null}
            />
          </div>
        </Col>
      </Row>
      {editingAsset && (
        <div className="mt-4">
          <FormAset
            onSave={handleSaveAsset}
            onCancel={() => {
              setEditingAsset(null);
              setShowModal(false);
            }}
            koremList={koremList}
            assetToEdit={editingAsset}
            isEnabled={true}
          />
        </div>
      )}
    </Container>
  );
};

export default DataAsetTanahPage;