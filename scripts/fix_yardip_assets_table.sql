-- Migration: Perbaiki struktur tabel yardip_assets
-- Tanggal: 2026-03-07
-- Deskripsi: Memastikan semua kolom yang diperlukan ada di tabel yardip_assets

-- Tambah kolom type jika belum ada
ALTER TABLE yardip_assets
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'yardip' AFTER lokasi;

-- Tambah kolom created_at jika belum ada
ALTER TABLE yardip_assets
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER type;

-- Tambah kolom updated_at jika belum ada
ALTER TABLE yardip_assets
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Verifikasi struktur tabel
DESCRIBE yardip_assets;

-- Tampilkan informasi tabel
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT, 
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'yardip_assets'
ORDER BY ORDINAL_POSITION;
