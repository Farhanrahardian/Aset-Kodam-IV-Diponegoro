const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3001;
const dbPath = path.join(__dirname, "db.json");

// Helper function to read the database
const readDb = () => {
  const dbRaw = fs.readFileSync(dbPath);
  return JSON.parse(dbRaw);
};

// Helper function to write to the database
const writeDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// CORS configuration
app.use(cors());

// Serve static files from the 'public' directory, making /uploads accessible
app.use(express.static("public"));

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "public/uploads/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Konfigurasi Multer untuk foto aset (menerima gambar dan video dengan ukuran lebih besar)
const uploadAssetPhotos = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 5 // maksimal 5 file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('File foto aset harus berupa gambar atau video'), false);
    }
  }
});

// Konfigurasi Multer untuk bukti pemilikan (menerima gambar dan PDF dengan ukuran sedang)
const uploadBuktiPemilikan = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('File bukti pemilikan harus berupa gambar atau PDF'), false);
    }
  }
});

// --- File Upload API Endpoints ---
// IMPORTANT: These must be defined BEFORE the express.json() body parser.

// Endpoint for single file upload (Bukti Pemilikan)
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

// Endpoint for multiple file upload (Foto Aset)
app.post(
  "/upload/asset-photos",
  uploadAssetPhotos.array("asset_photos", 5),
  (req, res) => {
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

// --- Body-parser middleware ---
// IMPORTANT: Must be AFTER file upload endpoints.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- User Management Endpoints ---

// Login
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

// Get all users
app.get("/api/users", (req, res) => {
  const db = readDb();
  res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role, name: u.name })));
});

// Create a new user
app.post("/api/users", (req, res) => {
  const { username, password, role, name } = req.body;
  if (!username || !password || !role || !name) {
    return res.status(400).json({ message: "Semua field wajib diisi" });
  }

  // Server-side validation
  if (username.length !== 18 || !/^\d+$/.test(username)) {
    return res.status(400).json({ message: "NRP (Username) harus berupa 18 digit angka." });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: "Password minimal 8 karakter dan harus mengandung huruf dan angka." });
  }

  const db = readDb();
  
  // Check if user already exists
  if (db.users.some(u => u.username === username)) {
    return res.status(409).json({ message: "Username already exists" });
  }

  const newUser = {
    id: `u${Date.now()}`,
    username,
    password, // In a real app, hash this password!
    name,
    role,
  };

  db.users.push(newUser);
  writeDb(db);
  res.status(201).json({ id: newUser.id, username: newUser.username, role: newUser.role, name: newUser.name });
});

// Update a user
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { role, password, name } = req.body;
  const db = readDb();
  const userIndex = db.users.findIndex((u) => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  // Update fields if they are provided
  if (role) db.users[userIndex].role = role;
  if (name) db.users[userIndex].name = name;
  
  if (password) {
    // Also validate password on update if it is being changed
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: "Password minimal 8 karakter dan harus mengandung huruf dan angka." });
    }
    db.users[userIndex].password = password; // In a real app, hash this!
  }

  writeDb(db);
  res.json({ message: "User updated successfully", user: db.users[userIndex] });
});

// Delete a user
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




// --- JSON-Server equivalent routes ---

// Get all from a resource (e.g., /assets, /korem, /yardip_assets)
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

// Get item by id from a resource
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

// Create a new item in a resource
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

// Update an asset by ID
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

// Delete an asset by ID
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
  // Delete associated files
  if (assetToDelete.bukti_pemilikan_filename) {
    const filePath = path.join(__dirname, "public", "uploads", assetToDelete.bukti_pemilikan_filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  if (assetToDelete.foto_aset && Array.isArray(assetToDelete.foto_aset)) {
    assetToDelete.foto_aset.forEach((fotoUrl) => {
      const filename = path.basename(fotoUrl);
      const filePath = path.join(__dirname, "public", "uploads", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }
  db.assets.splice(assetIndex, 1);
  writeDb(db);
  res.status(200).json({ message: "Asset deleted successfully" });
});

// ===== YARDIP ASSETS ENDPOINTS =====

// UPDATE endpoint untuk yardip_assets
app.put("/yardip_assets/:id", (req, res) => {
  const { id } = req.params;
  const updatedAsset = req.body;
  const db = readDb();
  if (!db.yardip_assets) {
    return res.status(404).json({ message: "Resource 'yardip_assets' not found" });
  }
  const assetIndex = db.yardip_assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );
  if (assetIndex === -1) {
    return res.status(404).json({ message: "Yardip asset not found" });
  }
  db.yardip_assets[assetIndex] = { ...db.yardip_assets[assetIndex], ...updatedAsset };
  writeDb(db);
  res.json(db.yardip_assets[assetIndex]);
});

// DELETE endpoint untuk yardip_assets
app.delete("/yardip_assets/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  if (!db.yardip_assets) {
    return res.status(404).json({ message: "Resource 'yardip_assets' not found" });
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

// --- Final Error Handling Middleware ---
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File terlalu besar. Maksimal 50MB untuk foto/video aset dan 10MB untuk bukti pemilikan.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Terlalu banyak file yang diupload. Maksimal 5 file.' });
    }
    return res.status(400).json({ message: error.message });
  } else if (error) {
    // Handle non-multer errors
    return res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server.' });
  }
  next();
});

app.listen(port, () => {
  console.log(
    `Server listening at http://localhost:${port}`
  );
  console.log("User management endpoints are now active on /api/users.");
});