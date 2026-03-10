import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Spinner, Alert, Card } from "react-bootstrap";
import axiosAuth from "../utils/axiosAuth";
import toast from "react-hot-toast";

import FormAset from "../components/FormAset";
import "./EditAsetPage.css";

const API_URL = "http://localhost:3001";

const EditAsetPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [koremList, setKoremList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const formAsetRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const assetRes = await axiosAuth.get(`${API_URL}/assets/${id}`);
        const koremRes = await axiosAuth.get(`${API_URL}/korem`);
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

  // TAMBAHKAN: Helper function untuk extract filename dari URL
  const extractFilename = (url) => {
    if (!url) return null;
    // URL format: /uploads/filename.ext
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  // TAMBAHKAN: Function untuk delete file lama
  const deleteOldFile = async (fileUrl, fileType) => {
    if (!fileUrl) return;

    const filename = extractFilename(fileUrl);
    if (!filename) return;

    try {
      let endpoint = "";

      if (fileType === "bukti_pemilikan") {
        endpoint = `${API_URL}/upload/bukti-pemilikan/${filename}`;
      } else if (fileType === "foto_tampak_atas") {
        endpoint = `${API_URL}/upload/foto-tampak-atas/${filename}`;
      } else if (fileType === "asset_photo") {
        endpoint = `${API_URL}/upload/asset-photos/${filename}`;
      }

      if (endpoint) {
        await axiosAuth.delete(endpoint);
        console.log(`✅ Old file deleted: ${filename}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to delete old file: ${filename}`, err.message);
      // Don't throw error, just warn - file might already be deleted
    }
  };

  const handleSaveAsset = async (
    assetData,
    buktiPemilikanFile,
    assetPhotos,
    gambarTampakAtasFile,
    filesToDelete = {}
  ) => {
    const toastId = toast.loading("Menyimpan perubahan...");

    let updatedData = { ...assetData };

    // Hapus file-file yang ditandai untuk dihapus
    if (filesToDelete) {
      // Hapus bukti pemilikan yang ditandai
      if (filesToDelete.buktiPemilikan) {
        try {
          await deleteOldFile(filesToDelete.buktiPemilikan, "bukti_pemilikan");
        } catch (err) {
          console.warn("Gagal menghapus bukti pemilikan yang ditandai:", err);
        }
      }

      // Hapus foto tampak atas yang ditandai
      if (filesToDelete.fotoTampakAtas) {
        try {
          await deleteOldFile(filesToDelete.fotoTampakAtas, "foto_tampak_atas");
        } catch (err) {
          console.warn("Gagal menghapus foto tampak atas yang ditandai:", err);
        }
      }

      // Hapus foto aset yang ditandai
      if (filesToDelete.assetPhotos && filesToDelete.assetPhotos.length > 0) {
        for (const photoUrl of filesToDelete.assetPhotos) {
          try {
            await deleteOldFile(photoUrl, "asset_photo");
          } catch (err) {
            console.warn("Gagal menghapus foto aset yang ditandai:", err);
          }
        }
      }
    }

    // 1. Upload new Bukti Pemilikan if it exists
    if (buktiPemilikanFile) {
      try {
        toast.loading("Mengupload bukti pemilikan baru...", { id: toastId });

        // Delete old file first
        await deleteOldFile(asset.bukti_pemilikan_url, "bukti_pemilikan");

        const formData = new FormData();
        formData.append("bukti_pemilikan", buktiPemilikanFile);
        const uploadRes = await axiosAuth.post(
          `${API_URL}/upload/bukti-pemilikan`,
          formData
        );
        updatedData.bukti_pemilikan_url = uploadRes.data.url;
        updatedData.bukti_pemilikan_filename = uploadRes.data.filename;
      } catch (err) {
        toast.error("Gagal mengupload bukti pemilikan baru.", { id: toastId });
        console.error("File upload error:", err);
        return;
      }
    }

    // 2. Upload new Gambar Tampak Atas if it exists
    if (gambarTampakAtasFile) {
      try {
        toast.loading("Mengupload foto tampak atas baru...", { id: toastId });

        // TAMBAHKAN: Delete old file first
        await deleteOldFile(asset.gambar_tampak_atas_url, "foto_tampak_atas");

        const formData = new FormData();
        formData.append("foto_tampak_atas", gambarTampakAtasFile);
        const uploadRes = await axiosAuth.post(
          `${API_URL}/upload/foto-tampak-atas`,
          formData
        );
        updatedData.gambar_tampak_atas_url = uploadRes.data.url;
        updatedData.gambar_tampak_atas_filename = uploadRes.data.filename;
        console.log("Foto tampak atas uploaded:", uploadRes.data);
      } catch (err) {
        toast.error("Gagal mengupload foto tampak atas baru.", { id: toastId });
        console.error("File upload error:", err);
        return;
      }
    }

    // 3. Upload new Asset Photos if they exist
    if (assetPhotos && assetPhotos.length > 0) {
      try {
        toast.loading(`Mengupload ${assetPhotos.length} foto aset baru...`, {
          id: toastId,
        });

        // Note: Untuk foto aset, biasanya kita append bukan replace
        // Jika ingin replace semua, delete old photos dulu:
        // if (asset.foto_aset && asset.foto_aset.length > 0) {
        //   for (const photoUrl of asset.foto_aset) {
        //     await deleteOldFile(photoUrl, 'asset_photo');
        //   }
        // }

        const photosFormData = new FormData();
        assetPhotos.forEach((photo) => {
          photosFormData.append("asset_photos", photo);
        });
        const photosUploadRes = await axiosAuth.post(
          `${API_URL}/upload/asset-photos`,
          photosFormData
        );
        // Append new photos to existing ones
        const newPhotoUrls = photosUploadRes.data.files.map((file) => file.url);
        const existingPhotoUrls = updatedData.foto_aset || [];
        updatedData.foto_aset = [...existingPhotoUrls, ...newPhotoUrls];
        console.log("Asset photos uploaded:", newPhotoUrls);
      } catch (err) {
        const errorMessage =
          err.response?.data?.error || "Gagal mengupload foto aset baru.";
        toast.error(errorMessage, { id: toastId });
        console.error(
          "Asset photos upload error:",
          err.response?.data || err.message
        );
        return;
      }
    }

    // 4. Save the final updated asset data
    try {
      toast.loading("Menyimpan data ke database...", { id: toastId });

      console.log("Final data being sent to server:", updatedData);

      await axiosAuth.put(`${API_URL}/assets/${id}`, updatedData);
      toast.success("Aset berhasil diperbarui!", { id: toastId });
      navigate("/data-aset-tanah");
    } catch (err) {
      toast.error("Gagal menyimpan perubahan.", { id: toastId });
      console.error("Gagal menyimpan aset", err);
      console.error("Error response:", err.response?.data);
    }
  };

  const handleCancel = () => {
    // Reset filesToDelete di FormAset jika ada
    if (formAsetRef.current && formAsetRef.current.resetFilesToDelete) {
      formAsetRef.current.resetFilesToDelete();
    }
    navigate("/data-aset-tanah");
  };

  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="edit-aset-page">
      <div className="page-header-wrapper">
        <div className="header-content">
          <div className="header-icon edit-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Edit Aset Tanah</h1>
            <p className="page-subtitle">Perbarui informasi aset tanah BMN</p>
          </div>
        </div>
      </div>

      <div className="form-card">
        <Card>
          <Card.Body>
            {asset && (
              <FormAset
                ref={formAsetRef}
                onSave={handleSaveAsset}
                onCancel={handleCancel}
                koremList={koremList}
                assetToEdit={asset}
                isEnabled={true}
              />
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default EditAsetPage;
