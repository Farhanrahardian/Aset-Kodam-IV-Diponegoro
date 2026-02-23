require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "asset_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test koneksi
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Database MySQL connected");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

// ==================== ASSETS ENDPOINTS ====================

// GET all assets
app.get("/assets", async (req, res) => {
  try {
    const [assets] = await pool.query(`
      SELECT a.*, 
             GROUP_CONCAT(DISTINCT f.foto_url ORDER BY f.urutan) as foto_urls,
             k.nama as korem_nama
      FROM assets a
      LEFT JOIN foto_aset f ON a.id = f.asset_id
      LEFT JOIN korem k ON a.korem_id = k.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    const formattedAssets = assets.map((asset) => ({
      ...asset,
      foto_aset: asset.foto_urls ? asset.foto_urls.split(",") : [],
      foto_urls: undefined,
      lokasi: asset.lokasi ? JSON.parse(asset.lokasi) : null,
    }));

    res.json(formattedAssets);
  } catch (error) {
    console.error("Error getting assets:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET single asset by ID
app.get("/assets/:id", async (req, res) => {
  try {
    const [assets] = await pool.query(
      `
      SELECT a.*, 
             GROUP_CONCAT(DISTINCT f.foto_url ORDER BY f.urutan) as foto_urls,
             k.nama as korem_nama
      FROM assets a
      LEFT JOIN foto_aset f ON a.id = f.asset_id
      LEFT JOIN korem k ON a.korem_id = k.id
      WHERE a.id = ?
      GROUP BY a.id
    `,
      [req.params.id]
    );

    if (assets.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const asset = {
      ...assets[0],
      foto_aset: assets[0].foto_urls ? assets[0].foto_urls.split(",") : [],
      foto_urls: undefined,
      lokasi: assets[0].lokasi ? JSON.parse(assets[0].lokasi) : null,
    };

    res.json(asset);
  } catch (error) {
    console.error("Error getting asset:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST new asset
app.post("/assets", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const assetData = req.body;
    const id = assetData.id || "T" + Date.now();

    await connection.query(
      `
      INSERT INTO assets (
          id, nama, korem_id, kodim, luas, kib_kode_barang,
          nomor_registrasi, alamat, peruntukan, status,
          asal_milik, pemilikan_sertifikat, keterangan_bukti_pemilikan,
          sertifikat_bidang, sertifikat_luas, belum_sertifikat_bidang,
          belum_sertifikat_luas, keterangan, atas_nama_pemilik_sertifikat,
          lokasi, bukti_pemilikan_url, bukti_pemilikan_filename,
          gambar_tampak_atas_url, gambar_tampak_atas_filename
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        assetData.nama,
        assetData.korem_id,
        assetData.kodim,
        assetData.luas,
        assetData.kib_kode_barang,
        assetData.nomor_registrasi,
        assetData.alamat,
        assetData.peruntukan,
        assetData.status,
        assetData.asal_milik,
        assetData.pemilikan_sertifikat,
        assetData.keterangan_bukti_pemilikan,
        assetData.sertifikat_bidang,
        assetData.sertifikat_luas,
        assetData.belum_sertifikat_bidang,
        assetData.belum_sertifikat_luas,
        assetData.keterangan,
        assetData.atas_nama_pemilik_sertifikat,
        assetData.lokasi ? assetData.lokasi : null,
        assetData.bukti_pemilikan_url || null,
        assetData.bukti_pemilikan_filename || null,
        assetData.gambar_tampak_atas_url || null,
        assetData.gambar_tampak_atas_filename || null,
      ]
    );

    // Insert foto aset
    if (assetData.foto_aset && assetData.foto_aset.length > 0) {
      for (let i = 0; i < assetData.foto_aset.length; i++) {
        await connection.query(
          "INSERT INTO foto_aset (asset_id, foto_url, urutan) VALUES (?, ?, ?)",
          [id, assetData.foto_aset[i], i]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: "Asset created successfully", id });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating asset:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT update asset
app.put("/assets/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const assetData = req.body;
    const { id } = req.params;

    console.log("=== UPDATE ASSET ===");
    console.log("Asset ID:", id);

    // PENTING: Convert lokasi object ke JSON string
    const lokasiJSON = assetData.lokasi
      ? JSON.stringify(assetData.lokasi)
      : null;

    await connection.query(
      `
      UPDATE assets SET
          nama = ?, korem_id = ?, kodim = ?, luas = ?, kib_kode_barang = ?,
          nomor_registrasi = ?, alamat = ?, peruntukan = ?, status = ?,
          asal_milik = ?, pemilikan_sertifikat = ?, keterangan_bukti_pemilikan = ?,
          sertifikat_bidang = ?, sertifikat_luas = ?, belum_sertifikat_bidang = ?,
          belum_sertifikat_luas = ?, keterangan = ?, atas_nama_pemilik_sertifikat = ?,
          lokasi = ?, bukti_pemilikan_url = ?, bukti_pemilikan_filename = ?,
          gambar_tampak_atas_url = ?, gambar_tampak_atas_filename = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        assetData.nama,
        assetData.korem_id,
        assetData.kodim,
        assetData.luas,
        assetData.kib_kode_barang,
        assetData.nomor_registrasi,
        assetData.alamat,
        assetData.peruntukan,
        assetData.status,
        assetData.asal_milik,
        assetData.pemilikan_sertifikat,
        assetData.keterangan_bukti_pemilikan,
        assetData.sertifikat_bidang,
        assetData.sertifikat_luas,
        assetData.belum_sertifikat_bidang,
        assetData.belum_sertifikat_luas,
        assetData.keterangan,
        assetData.atas_nama_pemilik_sertifikat,
        lokasiJSON, // ← Gunakan JSON string, bukan object
        assetData.bukti_pemilikan_url || null,
        assetData.bukti_pemilikan_filename || null,
        assetData.gambar_tampak_atas_url || null,
        assetData.gambar_tampak_atas_filename || null,
        id,
      ]
    );

    // Update foto aset jika ada
    if (assetData.foto_aset && assetData.foto_aset.length > 0) {
      await connection.query("DELETE FROM foto_aset WHERE asset_id = ?", [id]);

      for (let i = 0; i < assetData.foto_aset.length; i++) {
        await connection.query(
          "INSERT INTO foto_aset (asset_id, foto_url, urutan) VALUES (?, ?, ?)",
          [id, assetData.foto_aset[i], i]
        );
      }
    }

    await connection.commit();
    res.json({ message: "Asset updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating asset:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE asset
app.delete("/assets/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Hapus foto aset terlebih dahulu
    await connection.query("DELETE FROM foto_aset WHERE asset_id = ?", [id]);

    // Hapus asset
    await connection.query("DELETE FROM assets WHERE id = ?", [id]);

    await connection.commit();
    res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// ==================== KOREM ENDPOINTS ====================

app.get("/korem", async (req, res) => {
  try {
    const [korem] = await pool.query("SELECT * FROM korem");

    const koremWithKodim = await Promise.all(
      korem.map(async (k) => {
        const [kodim] = await pool.query(
          "SELECT nama FROM kodim WHERE korem_id = ?",
          [k.id]
        );
        return {
          ...k,
          kodim: kodim.map((kod) => kod.nama),
        };
      })
    );

    res.json(koremWithKodim);
  } catch (error) {
    console.error("Error getting korem:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== YARDIP ASSETS ENDPOINTS ====================

// GET all yardip assets
app.get("/yardip_assets", async (req, res) => {
  try {
    const [assets] = await pool.query(
      "SELECT * FROM yardip_assets ORDER BY created_at DESC"
    );

    const formattedAssets = assets.map((asset) => ({
      ...asset,
      lokasi: asset.lokasi ? JSON.parse(asset.lokasi) : null,
    }));

    res.json(formattedAssets);
  } catch (error) {
    console.error("Error getting yardip assets:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET single yardip asset by ID
app.get("/yardip_assets/:id", async (req, res) => {
  try {
    const [assets] = await pool.query(
      "SELECT * FROM yardip_assets WHERE id = ?",
      [req.params.id]
    );

    if (assets.length === 0) {
      return res.status(404).json({ error: "Yardip asset not found" });
    }

    const asset = {
      ...assets[0],
      lokasi: assets[0].lokasi ? JSON.parse(assets[0].lokasi) : null,
    };

    res.json(asset);
  } catch (error) {
    console.error("Error getting yardip asset:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST new yardip asset
app.post("/yardip_assets", async (req, res) => {
  try {
    const assetData = req.body;
    const id = assetData.id || "Y" + Date.now();

    console.log("=== CREATE YARDIP ASSET ===");
    console.log("Data:", assetData);

    // PENTING: Convert lokasi object ke JSON string
    const lokasiJSON = assetData.lokasi
      ? JSON.stringify(assetData.lokasi)
      : null;

    await pool.query(
      `
      INSERT INTO yardip_assets (
          id, pengelola, bidang, provinsi, kabkota,
          kecamatan, kelurahan, peruntukan, status,
          keterangan, area, lokasi, type,
          bukti_pemilikan_url, bukti_pemilikan_filename, keterangan_bukti_pemilikan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        assetData.pengelola,
        assetData.bidang,
        assetData.provinsi || null, // ← Gunakan provinsi varchar
        assetData.kabkota,
        assetData.kecamatan,
        assetData.kelurahan,
        assetData.peruntukan,
        assetData.status,
        assetData.keterangan,
        assetData.area,
        lokasiJSON, // ← Convert ke JSON string
        assetData.type || "yardip",
        assetData.bukti_pemilikan_url || null,
        assetData.bukti_pemilikan_filename || null,
        assetData.keterangan_bukti_pemilikan || null,
      ]
    );

    res.status(201).json({ message: "Yardip asset created successfully", id });
  } catch (error) {
    console.error("Error creating yardip asset:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update yardip asset
app.put("/yardip_assets/:id", async (req, res) => {
  try {
    const assetData = req.body;
    const { id } = req.params;

    console.log("=== UPDATE YARDIP ASSET ===");
    console.log("Asset ID:", id);
    console.log("Asset Data:", assetData);

    // PENTING: Convert lokasi object ke JSON string
    const lokasiJSON = assetData.lokasi
      ? JSON.stringify(assetData.lokasi)
      : null;

    // PERBAIKAN: Hapus provinsi_id dan kota_id, gunakan provinsi varchar saja
    await pool.query(
      `
      UPDATE yardip_assets SET
          pengelola = ?, bidang = ?, provinsi = ?, kabkota = ?,
          kecamatan = ?, kelurahan = ?, peruntukan = ?, status = ?,
          keterangan = ?, area = ?, lokasi = ?, updated_at = CURRENT_TIMESTAMP,
          bukti_pemilikan_url = ?, bukti_pemilikan_filename = ?,
          keterangan_bukti_pemilikan = ?
      WHERE id = ?
      `,
      [
        assetData.pengelola,
        assetData.bidang,
        assetData.provinsi || null, // ← Gunakan provinsi, bukan provinsi_id
        assetData.kabkota,
        assetData.kecamatan,
        assetData.kelurahan,
        assetData.peruntukan,
        assetData.status,
        assetData.keterangan,
        assetData.area,
        lokasiJSON, // ← Convert ke JSON string
        assetData.bukti_pemilikan_url || null,
        assetData.bukti_pemilikan_filename || null,
        assetData.keterangan_bukti_pemilikan || null,
        id,
      ]
    );

    res.json({ message: "Yardip asset updated successfully" });
  } catch (error) {
    console.error("Error updating yardip asset:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE yardip asset
app.delete("/yardip_assets/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM yardip_assets WHERE id = ?", [id]);

    res.json({ message: "Yardip asset deleted successfully" });
  } catch (error) {
    console.error("Error deleting yardip asset:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== USERS ENDPOINTS ====================

// GET all users
app.get("/users", async (req, res) => {
  try {
    const [users] = await pool.query("SELECT * FROM users");
    res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ POST login user
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("=== LOGIN ATTEMPT ===");
    console.log("Username:", username);

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({
        message: "Username dan password wajib diisi",
      });
    }

    // Cari user berdasarkan username
    const [users] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Username atau password salah",
      });
    }

    const user = users[0];

    // Bandingkan password dengan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Username atau password salah",
      });
    }

    // Login berhasil, kembalikan data user (tanpa password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: "Login berhasil",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: error.message || "Terjadi kesalahan saat login",
    });
  }
});

// POST new user
app.post("/users", async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    console.log("=== CREATE USER ===");
    console.log("Data:", { username, name, role });

    // Validasi
    if (!username || !password || !name || !role) {
      return res.status(400).json({
        message: "Semua field wajib diisi",
      });
    }

    // Validasi NRP (18 digit)
    if (username.length !== 18 || !/^\d+$/.test(username)) {
      return res.status(400).json({
        message: "NRP (Username) harus berupa 18 digit angka",
      });
    }

    // Validasi password
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password minimal 8 karakter dan harus mengandung huruf dan angka",
      });
    }

    // Cek apakah username sudah ada
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Username sudah digunakan",
      });
    }

    // Hash password
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user baru (TANPA ID, biarkan auto-increment)
    const [result] = await pool.query(
      "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, name, role]
    );

    res.status(201).json({
      message: "User created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      message: error.message || "Gagal membuat user",
    });
  }
});

// ✅ ENDPOINT: Edit User (PUT)
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password, name, role } = req.body;

  try {
    // Validasi input
    if (!name || !role) {
      return res.status(400).json({
        message: "Nama dan role wajib diisi",
      });
    }

    // Validasi password (jika diisi)
    if (password) {
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message:
            "Password minimal 8 karakter dan harus mengandung huruf dan angka",
        });
      }
    }

    // Build query UPDATE
    let query = "UPDATE users SET name = ?, role = ?";
    let params = [name, role];

    // Jika password diisi, hash dan update juga
    if (password) {
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password = ?";
      params.push(hashedPassword);
    }

    query += " WHERE id = ?";
    params.push(id);

    // Execute query dengan MySQL pool
    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    res.json({
      message: "User berhasil diupdate",
      id: id,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      message: error.message || "Gagal mengupdate user",
    });
  }
});

// ✅ ENDPOINT: Hapus User (DELETE)
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Cek apakah user yang akan dihapus ada
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    // Hapus user
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(500).json({
        message: "Gagal menghapus user",
      });
    }

    res.json({
      message: "User berhasil dihapus",
      id: id,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      message: error.message || "Gagal menghapus user",
    });
  }
});
// ==================== UPLOAD ENDPOINTS ====================

// Setup multer untuk upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

app.post(
  "/upload/bukti-pemilikan",
  upload.single("bukti_pemilikan"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    console.log("Bukti pemilikan uploaded:", req.file.filename);
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    });
  }
);

app.post(
  "/upload/asset-photos",
  upload.array("asset_photos", 10),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    const files = req.files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
    }));
    console.log(`${files.length} asset photos uploaded`);
    res.json({ files });
  }
);

app.post(
  "/upload/foto-tampak-atas",
  upload.single("foto_tampak_atas"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    console.log("Foto tampak atas uploaded:", req.file.filename);
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    });
  }
);
// ==================== DELETE FILE ENDPOINTS ====================

// DELETE bukti pemilikan
app.delete("/upload/bukti-pemilikan/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "uploads", filename);

    console.log("Deleting bukti pemilikan:", filename);

    // Cek apakah file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ File deleted:", filename);
      res.json({ message: "File deleted successfully", filename });
    } else {
      console.log("⚠️ File not found:", filename);
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("Error deleting bukti pemilikan:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE foto aset (single photo)
app.delete("/upload/asset-photos/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "uploads", filename);

    console.log("Deleting asset photo:", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ File deleted:", filename);
      res.json({ message: "File deleted successfully", filename });
    } else {
      console.log("⚠️ File not found:", filename);
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("Error deleting asset photo:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE foto tampak atas
app.delete("/upload/foto-tampak-atas/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "uploads", filename);

    console.log("Deleting foto tampak atas:", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ File deleted:", filename);
      res.json({ message: "File deleted successfully", filename });
    } else {
      console.log("⚠️ File not found:", filename);
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("Error deleting foto tampak atas:", error);
    res.status(500).json({ error: error.message });
  }
});
// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
