const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;
const dbPath = path.join(__dirname, 'db.json');

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
app.use(express.static('public'));

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- API Endpoints ---

// Endpoint for single file upload (Bukti Pemilikan)
app.post('/upload/bukti-pemilikan', upload.single('bukti_pemilikan'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}` // URL path to access the file
  });
});

// Endpoint for multiple file upload (Foto Aset)
app.post('/upload/asset-photos', upload.array('asset_photos', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }
  const files = req.files.map(file => ({
    filename: file.filename,
    url: `/uploads/${file.filename}`
  }));
  res.json({
    message: 'Files uploaded successfully',
    files: files
  });
});

// --- JSON-Server equivalent routes ---

// Get all from a resource (e.g., /assets, /korem)
app.get('/:resource', (req, res) => {
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
app.get('/:resource/:id', (req, res) => {
    const { resource, id } = req.params;
    const db = readDb();
    const data = db[resource];
    if (data) {
        const item = data.find(item => item.id == id);
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ error: 'Item not found' });
        }
    } else {
        res.status(404).json({ error: `Resource '${resource}' not found` });
    }
});


// Create a new item in a resource
app.post('/:resource', (req, res) => {
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
app.put('/assets/:id', (req, res) => {
    const { id } = req.params;
    const updatedAsset = req.body;
    const db = readDb();

    if (!db.assets) {
        return res.status(404).json({ error: "Resource 'assets' not found" });
    }

    const assetIndex = db.assets.findIndex(asset => asset.id === id);

    if (assetIndex === -1) {
        return res.status(404).json({ error: 'Asset not found' });
    }

    // Update the asset in the array
    db.assets[assetIndex] = { ...db.assets[assetIndex], ...updatedAsset };
    writeDb(db);

    res.json(db.assets[assetIndex]);
});



app.listen(port, () => {
  console.log(`Express server with file upload listening at http://localhost:${port}`);
});
