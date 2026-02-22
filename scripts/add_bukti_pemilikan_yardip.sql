-- Migration: Tambah kolom bukti_pemilikan ke tabel yardip_assets
-- Tanggal: 2026-02-22

-- Tambah kolom untuk bukti pemilikan
ALTER TABLE yardip_assets 
ADD COLUMN bukti_pemilikan_url VARCHAR(500) DEFAULT NULL AFTER keterangan,
ADD COLUMN bukti_pemilikan_filename VARCHAR(255) DEFAULT NULL AFTER bukti_pemilikan_url,
ADD COLUMN keterangan_bukti_pemilikan VARCHAR(500) DEFAULT NULL AFTER bukti_pemilikan_filename;

-- Verifikasi kolom yang sudah ditambahkan
DESCRIBE yardip_assets;
