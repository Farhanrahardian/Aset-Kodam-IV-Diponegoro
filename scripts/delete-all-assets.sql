-- ============================================
-- SCRIPT UNTUK MENGHAPUS SEMUA DATA ASET
-- ============================================
-- PERINGATAN: Script ini akan menghapus SEMUA data aset!
-- Pastikan Anda sudah backup database sebelum menjalankan script ini.
-- ============================================

USE kodam_assets;  -- Ganti dengan nama database Anda

-- ============================================
-- OPSI 1: Hapus semua data (TRUNCATE - Lebih Cepat)
-- ============================================
-- TRUNCATE akan menghapus semua data dan reset AUTO_INCREMENT

TRUNCATE TABLE assets;

-- Reset auto increment (opsional)
ALTER TABLE assets AUTO_INCREMENT = 1;

-- ============================================
-- OPSI 2: Hapus dengan DELETE (Jika ada foreign key)
-- ============================================
-- Gunakan DELETE jika ada relasi foreign key

-- DELETE FROM assets;

-- ============================================
-- VERIFIKASI
-- ============================================
-- Cek apakah sudah kosong

SELECT COUNT(*) as jumlah_aset FROM assets;

-- ============================================
-- SELESAI
-- ============================================
