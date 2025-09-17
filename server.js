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

// Middleware to parse JSON bodies
app.use(express.json());

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

const upload = multer({ storage: storage });

// --- API Endpoints ---

// Endpoint for single file upload (Bukti Pemilikan)
app.post(
  "/upload/bukti-pemilikan",
  upload.single("bukti_pemilikan"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`, // URL path to access the file
    });
  }
);

// Endpoint for multiple file upload (Foto Aset)
app.post(
  "/upload/asset-photos",
  upload.array("asset_photos", 5),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded." });
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

// --- JSON-Server equivalent routes ---

// Get all from a resource (e.g., /assets, /korem, /yardip_assets)
app.get("/:resource", (req, res) => {
  const { resource } = req.params;
  const db = readDb();
  const data = db[resource];
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: `Resource '${resource}' not found` });
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
      res.status(404).json({ error: "Item not found" });
    }
  } else {
    res.status(404).json({ error: `Resource '${resource}' not found` });
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
    res.status(404).json({ error: `Resource '${resource}' not found` });
  }
});

// Update an asset by ID
app.put("/assets/:id", (req, res) => {
  const { id } = req.params;
  const updatedAsset = req.body;
  console.log("PUT request for asset ID:", id);

  const db = readDb();

  if (!db.assets) {
    return res.status(404).json({ error: "Resource 'assets' not found" });
  }

  const assetIndex = db.assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );

  if (assetIndex === -1) {
    return res.status(404).json({ error: "Asset not found" });
  }

  // Update the asset in the array
  db.assets[assetIndex] = { ...db.assets[assetIndex], ...updatedAsset };
  writeDb(db);

  console.log("Asset updated successfully");
  res.json(db.assets[assetIndex]);
});

// Delete an asset by ID
app.delete("/assets/:id", (req, res) => {
  const { id } = req.params;
  console.log("DELETE request for asset ID:", id);

  const db = readDb();

  if (!db.assets) {
    return res.status(404).json({ error: "Resource 'assets' not found" });
  }

  const assetIndex = db.assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );

  if (assetIndex === -1) {
    return res.status(404).json({ error: "Asset not found" });
  }

  const assetToDelete = db.assets[assetIndex];
  console.log("Found asset to delete:", assetToDelete.nama);

  // Delete associated files
  if (assetToDelete.bukti_pemilikan_filename) {
    const filePath = path.join(
      __dirname,
      "public",
      "uploads",
      assetToDelete.bukti_pemilikan_filename
    );
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

  // Remove the asset from the array
  db.assets.splice(assetIndex, 1);
  writeDb(db);

  console.log("Asset deleted successfully from database");
  res.status(200).json({
    message: "Asset deleted successfully",
    deletedAsset: assetToDelete,
  });
});

// ===== YARDIP ASSETS ENDPOINTS (TAMBAHAN BARU) =====

// UPDATE endpoint untuk yardip_assets
app.put("/yardip_assets/:id", (req, res) => {
  const { id } = req.params;
  const updatedAsset = req.body;
  console.log("PUT request for yardip asset ID:", id);

  const db = readDb();

  if (!db.yardip_assets) {
    return res
      .status(404)
      .json({ error: "Resource 'yardip_assets' not found" });
  }

  const assetIndex = db.yardip_assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );

  if (assetIndex === -1) {
    return res.status(404).json({ error: "Yardip asset not found" });
  }

  // Update the yardip asset in the array
  db.yardip_assets[assetIndex] = {
    ...db.yardip_assets[assetIndex],
    ...updatedAsset,
  };
  writeDb(db);

  console.log(
    "Yardip asset updated successfully:",
    db.yardip_assets[assetIndex].pengelola
  );
  res.json(db.yardip_assets[assetIndex]);
});

// DELETE endpoint untuk yardip_assets
app.delete("/yardip_assets/:id", (req, res) => {
  const { id } = req.params;
  console.log("DELETE request for yardip asset ID:", id);

  const db = readDb();

  if (!db.yardip_assets) {
    return res
      .status(404)
      .json({ error: "Resource 'yardip_assets' not found" });
  }

  const assetIndex = db.yardip_assets.findIndex(
    (asset) => String(asset.id) === String(id)
  );

  if (assetIndex === -1) {
    console.log("Yardip asset not found with ID:", id);
    return res.status(404).json({ error: "Yardip asset not found" });
  }

  const assetToDelete = db.yardip_assets[assetIndex];
  console.log("Found yardip asset to delete:", assetToDelete.pengelola);

  // Remove the yardip asset from the array
  db.yardip_assets.splice(assetIndex, 1);
  writeDb(db);

  console.log("Yardip asset deleted successfully from database");
  res.status(200).json({
    message: "Yardip asset deleted successfully",
    deletedAsset: assetToDelete,
  });
});

app.listen(port, () => {
  console.log(
    `Express server with file upload listening at http://localhost:${port}`
  );
});
