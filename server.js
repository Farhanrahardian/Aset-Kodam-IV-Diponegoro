const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3001;
const dbPath = path.join(__dirname, "db.json");

// ===== HELPER FUNCTIONS =====
const readDb = () => {
  const dbRaw = fs.readFileSync(dbPath);
  return JSON.parse(dbRaw);
};

const writeDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

const deleteFileFromUploads = (fileUrl) => {
  try {
    if (!fileUrl) return false;

    const filename = path.basename(fileUrl);
    const filePath = path.join(__dirname, "public", "uploads", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ File deleted: ${filename}`);
      return true;
    } else {
      console.log(`⚠️  File not found: ${filename}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting file: ${error.message}`);
    return false;
  }
};

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.static("public"));

// ===== MULTER CONFIGURATION =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "public/uploads/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const uploadAssetPhotos = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("File foto aset harus berupa gambar atau video"), false);
    }
  },
});

const uploadBuktiPemilikan = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("File bukti pemilikan harus berupa gambar atau PDF"), false);
    }
  },
});

const uploadFotoTampakAtas = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("File foto tampak atas harus berupa gambar"), false);
    }
  },
});

// ===== UPLOAD ENDPOINTS (must be before body parser) =====
app.post(
  "/upload/bukti-pemilikan",
  uploadBuktiPemilikan.single("bukti_pemilikan"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
    });
  }
);

app.post(
  "/upload/asset-photos",
  uploadAssetPhotos.array("asset_photos", 5),
  (req, res) => {
    console.log("--- DEBUG: Menerima Foto Aset ---", req.files);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded." });
    }
    const files = req.files.map((file) => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
    }));
    res.json({
      message: "Files uploaded successfully",
      files: files,
    });
  }
);

app.post(
  "/upload/foto-tampak-atas",
  uploadFotoTampakAtas.single("foto_tampak_atas"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
    });
  }
);

// Body parser (must be AFTER upload endpoints)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ===== DELETE ENDPOINTS FOR FILES =====
app.delete("/delete-bukti-pemilikan", (req, res) => {
  try {
    const { buktiPemilikanUrl, assetId } = req.body;
    console.log("🗑️  DELETE bukti pemilikan request:", {
      buktiPemilikanUrl,
      assetId,
      body: req.body,
    });

    if (!buktiPemilikanUrl || !assetId) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        error: "URL bukti pemilikan dan Asset ID diperlukan",
      });
    }

    const db = readDb();
    const assetIndex = db.assets.findIndex(
      (asset) => String(asset.id) === String(assetId)
    );

    if (assetIndex === -1) {
      console.log("❌ Asset not found:", assetId);
      return res.status(404).json({ error: "Asset tidak ditemukan" });
    }

    console.log("✅ Asset found:", db.assets[assetIndex].nama);

    // Delete file from filesystem
    const fileDeleted = deleteFileFromUploads(buktiPemilikanUrl);
    console.log("File deletion result:", fileDeleted);

    // Update database
    db.assets[assetIndex].bukti_pemilikan_url = null;
    db.assets[assetIndex].bukti_pemilikan_filename = null;
    writeDb(db);

    console.log("✅ Bukti pemilikan deleted successfully");
    res.json({
      success: true,
      message: "Bukti pemilikan berhasil dihapus",
      fileDeleted: fileDeleted,
    });
  } catch (error) {
    console.error("❌ Error deleting bukti pemilikan:", error);
    res.status(500).json({
      error: "Gagal menghapus bukti pemilikan",
      details: error.message,
    });
  }
});

app.delete("/delete-asset-photo", (req, res) => {
  try {
    const { photoUrl, assetId } = req.body;
    console.log("🗑️  DELETE asset photo request:", {
      photoUrl,
      assetId,
      body: req.body,
    });

    if (!photoUrl || !assetId) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        error: "URL foto dan Asset ID diperlukan",
      });
    }

    const db = readDb();
    const assetIndex = db.assets.findIndex(
      (asset) => String(asset.id) === String(assetId)
    );

    if (assetIndex === -1) {
      console.log("❌ Asset not found:", assetId);
      return res.status(404).json({ error: "Asset tidak ditemukan" });
    }

    const asset = db.assets[assetIndex];
    console.log("✅ Asset found:", asset.nama);
    console.log("Current foto_aset:", asset.foto_aset);

    let fotoAsetArray = asset.foto_aset || [];

    // Delete file from filesystem
    const fileDeleted = deleteFileFromUploads(photoUrl);
    console.log("File deletion result:", fileDeleted);

    // Remove URL from array
    const updatedFotoAset = fotoAsetArray.filter((url) => url !== photoUrl);
    console.log("Updated foto_aset:", updatedFotoAset);

    db.assets[assetIndex].foto_aset = updatedFotoAset;
    writeDb(db);

    console.log("✅ Asset photo deleted successfully");
    res.json({
      success: true,
      message: "Foto aset berhasil dihapus",
      fileDeleted: fileDeleted,
      updatedFotoAset: updatedFotoAset,
    });
  } catch (error) {
    console.error("❌ Error deleting asset photo:", error);
    res.status(500).json({
      error: "Gagal menghapus foto aset",
      details: error.message,
    });
  }
});

app.delete("/delete-foto-tampak-atas", (req, res) => {
  try {
    const { fileUrl, assetId } = req.body;
    if (!fileUrl || !assetId) {
      return res
        .status(400)
        .json({ error: "URL file dan Asset ID diperlukan" });
    }

    const db = readDb();
    const assetIndex = db.assets.findIndex(
      (asset) => String(asset.id) === String(assetId)
    );

    if (assetIndex === -1) {
      return res.status(404).json({ error: "Asset tidak ditemukan" });
    }

    // Delete file from filesystem
    const fileDeleted = deleteFileFromUploads(fileUrl);

    // Update database
    db.assets[assetIndex].gambar_tampak_atas_url = null;
    db.assets[assetIndex].gambar_tampak_atas_filename = null;
    writeDb(db);

    res.json({
      success: true,
      message: "Foto tampak atas berhasil dihapus",
      fileDeleted: fileDeleted,
    });
  } catch (error) {
    res.status(500).json({
      error: "Gagal menghapus foto tampak atas",
      details: error.message,
    });
  }
});

// ===== USER MANAGEMENT =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  const user = db.users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } else {
    res.status(401).json({ message: "Invalid username or password" });
  }
});

app.get("/api/users", (req, res) => {
  const db = readDb();
  res.json(
    db.users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      name: u.name,
    }))
  );
});

app.post("/api/users", (req, res) => {
  const { username, password, role, name } = req.body;
  if (!username || !password || !role || !name) {
    return res.status(400).json({ message: "Semua field wajib diisi" });
  }

  if (username.length !== 18 || !/^\d+$/.test(username)) {
    return res
      .status(400)
      .json({ message: "NRP (Username) harus berupa 18 digit angka." });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password minimal 8 karakter dan harus mengandung huruf dan angka.",
    });
  }

  const db = readDb();
  if (db.users.some((u) => u.username === username)) {
    return res.status(409).json({ message: "Username already exists" });
  }

  const newUser = { id: `u${Date.now()}`, username, password, name, role };
  db.users.push(newUser);
  writeDb(db);
  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    name: newUser.name,
  });
});

app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { role, password, name } = req.body;
  const db = readDb();
  const userIndex = db.users.findIndex((u) => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  if (role) db.users[userIndex].role = role;
  if (name) db.users[userIndex].name = name;

  if (password) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password minimal 8 karakter dan harus mengandung huruf dan angka.",
      });
    }
    db.users[userIndex].password = password;
  }

  writeDb(db);
  res.json({ message: "User updated successfully", user: db.users[userIndex] });
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const initialLength = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);

  if (db.users.length === initialLength) {
    return res.status(404).json({ message: "User not found" });
  }

  writeDb(db);
  res.status(200).json({ message: "User deleted successfully" });
});

// ===== GENERIC JSON-SERVER ROUTES =====
app.get("/:resource", (req, res) => {
  const { resource } = req.params;
  const db = readDb();
  const data = db[resource];
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ message: `Resource '${resource}' not found` });
  }
});

app.get("/:resource/:id", (req, res) => {
  const { resource, id } = req.params;
  const db = readDb();
  const data = db[resource];
  if (data) {
    const item = data.find((item) => item.id == id);
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } else {
    res.status(404).json({ message: `Resource '${resource}' not found` });
  }
});

app.post("/:resource", (req, res) => {
  const { resource } = req.params;
  const db = readDb();
  if (db[resource]) {
    const newItem = req.body;
    db[resource].push(newItem);
    writeDb(db);
    res.status(201).json(newItem);
  } else {
    res.status(404).json({ message: `Resource '${resource}' not found` });
  }
});

app.put("/assets/:id", (req, res) => {
  const { id } = req.params;
  const updatedAsset = req.body;
  const db = readDb();
  if (!db.assets) {
    return res.status(404).json({ message: "Resource 'assets' not found" });
  }
  const assetIndex = db.assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );
  if (assetIndex === -1) {
    return res.status(404).json({ message: "Asset not found" });
  }
  db.assets[assetIndex] = { ...db.assets[assetIndex], ...updatedAsset };
  writeDb(db);
  res.json(db.assets[assetIndex]);
});

app.delete("/assets/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  if (!db.assets) {
    return res.status(404).json({ message: "Resource 'assets' not found" });
  }
  const assetIndex = db.assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );
  if (assetIndex === -1) {
    return res.status(404).json({ message: "Asset not found" });
  }
  const assetToDelete = db.assets[assetIndex];

  // Delete files
  if (assetToDelete.bukti_pemilikan_url) {
    deleteFileFromUploads(assetToDelete.bukti_pemilikan_url);
  }
  if (assetToDelete.gambar_tampak_atas_url) {
    deleteFileFromUploads(assetToDelete.gambar_tampak_atas_url);
  }
  if (assetToDelete.foto_aset && Array.isArray(assetToDelete.foto_aset)) {
    assetToDelete.foto_aset.forEach((fotoUrl) => {
      deleteFileFromUploads(fotoUrl);
    });
  }

  db.assets.splice(assetIndex, 1);
  writeDb(db);
  res.status(200).json({ message: "Asset deleted successfully" });
});

// ===== YARDIP ASSETS =====
const isConservationArea = (kabupatenName) => {
  return kabupatenName === "Hutan" || kabupatenName === "Wadung Kedungombo";
};

app.put("/yardip_assets/:id", (req, res) => {
  const { id } = req.params;
  const updatedAsset = req.body;

  // Validasi area konservasi
  if (isConservationArea(updatedAsset.kabkota)) {
    return res.status(400).json({
      message: "Aset yardip tidak dapat disimpan di wilayah konservasi (Hutan atau Wadung Kedungombo)"
    });
  }

  const db = readDb();
  if (!db.yardip_assets) {
    return res
      .status(404)
      .json({ message: "Resource 'yardip_assets' not found" });
  }
  const assetIndex = db.yardip_assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );
  if (assetIndex === -1) {
    return res.status(404).json({ message: "Yardip asset not found" });
  }
  db.yardip_assets[assetIndex] = {
    ...db.yardip_assets[assetIndex],
    ...updatedAsset,
  };
  writeDb(db);
  res.json(db.yardip_assets[assetIndex]);
});

app.delete("/yardip_assets/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  if (!db.yardip_assets) {
    return res
      .status(404)
      .json({ message: "Resource 'yardip_assets' not found" });
  }
  const assetIndex = db.yardip_assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );
  if (assetIndex === -1) {
    return res.status(404).json({ message: "Yardip asset not found" });
  }
  db.yardip_assets.splice(assetIndex, 1);
  writeDb(db);
  res.status(200).json({ message: "Yardip asset deleted successfully" });
});

// Validasi area konservasi untuk POST request
app.post('/yardip_assets', (req, res) => {
  const newAsset = req.body;

  // Validasi area konservasi
  if (isConservationArea(newAsset.kabkota)) {
    return res.status(400).json({
      message: "Aset yardip tidak dapat ditambahkan di wilayah konservasi (Hutan atau Wadung Kedungombo)"
    });
  }

  const db = readDb();
  if (!db.yardip_assets) {
    return res.status(404).json({ message: "Resource 'yardip_assets' not found" });
  }
  const newId = newAsset.id || `Y${Date.now()}`;
  const createdAsset = { ...newAsset, id: newId };
  db.yardip_assets.push(createdAsset);
  writeDb(db);
  res.status(201).json(createdAsset);
});

// ===== ERROR HANDLING =====
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message:
          "File terlalu besar. Maksimal 50MB untuk foto/video aset dan 10MB untuk bukti pemilikan.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "Terlalu banyak file yang diupload. Maksimal 5 file.",
      });
    }
    return res.status(400).json({ message: error.message });
  } else if (error) {
    return res
      .status(500)
      .json({ message: error.message || "Terjadi kesalahan pada server." });
  }
  next();
});

// ===== START SERVER =====
app.listen(port, () => {
  console.log(`\n🚀 Server running at http://localhost:${port}`);
  console.log(
    `📁 Uploads directory: ${path.join(__dirname, "public/uploads")}`
  );
  console.log(`💾 Database: ${dbPath}`);
  console.log(`✅ Ready to accept requests!\n`);
});
