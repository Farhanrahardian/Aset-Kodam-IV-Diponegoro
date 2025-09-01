const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");

// folder input hasil dari split_korem.js
const inputDir = path.join(__dirname, "../data/korem");
// folder output union
const outputDir = path.join(__dirname, "../data/korem_union");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// ambil semua file korem hasil split
const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".json"));

files.forEach((file) => {
  const filepath = path.join(inputDir, file);
  const geojson = JSON.parse(fs.readFileSync(filepath));

  if (!geojson.features || geojson.features.length === 0) {
    console.log(`⚠️ ${file} kosong, dilewati`);
    return;
  }

  // gabungkan semua polygon jadi satu (union)
  let unioned = geojson.features[0];
  for (let i = 1; i < geojson.features.length; i++) {
    try {
      unioned = turf.union(unioned, geojson.features[i]);
    } catch (err) {
      console.error(`❌ Error union di ${file} fitur ke-${i}:`, err.message);
    }
  }

  // bungkus ke FeatureCollection
  const result = {
    type: "FeatureCollection",
    features: [unioned],
  };

  const outputPath = path.join(outputDir, file);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`✅ Union ${file} tersimpan`);
});
