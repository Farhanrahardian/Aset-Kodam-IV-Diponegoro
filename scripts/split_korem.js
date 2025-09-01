const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");

// Load data GeoJSON Jateng + DIY
const jateng = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/indonesia_jawatengah.json"))
);
const diy = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/indonesia_yogyakarta.json"))
);

const combined = {
  type: "FeatureCollection",
  features: [...jateng.features, ...diy.features],
};

// Mapping kabupaten/kota ke Korem
const mappingKorem = {
  "Korem 071/Wijayakusuma": [
    "Kabupaten Banyumas",
    "Kabupaten Purbalingga",
    "Kabupaten Cilacap",
    "Kabupaten Banjarnegara",
    "Kabupaten Magelang",
    "Kabupaten Temanggung",
    "Kabupaten Wonosobo",
    "Kabupaten Purworejo",
    "Kabupaten Kebumen",
    "Kabupaten Pekalongan",
    "Kota Pekalongan",
    "Kabupaten Pemalang",
    "Kabupaten Tegal",
    "Kota Tegal",
    "Kabupaten Brebes",
  ],
  "Korem 072/Pamungkas": [
    "Kabupaten Bantul",
    "Kabupaten Sleman",
    "Kabupaten Kulon Progo",
    "Kota Yogyakarta",
  ],
  "Korem 073/Makutarama": [
    "Kota Salatiga",
    "Kabupaten Kendal",
    "Kabupaten Demak",
    "Kabupaten Grobogan",
    "Kabupaten Pati",
    "Kabupaten Jepara",
    "Kabupaten Rembang",
    "Kabupaten Blora",
    "Kabupaten Kudus",
  ],
  "Korem 074/Warastratama": [
    "Kabupaten Klaten",
    "Kabupaten Boyolali",
    "Kabupaten Sragen",
    "Kabupaten Sukoharjo",
    "Kabupaten Karanganyar",
    "Kabupaten Wonogiri",
    "Kota Surakarta",
  ],
  "Kodim 0733/Kota Semarang": ["Kota Semarang"],
};

// Buat folder output
const outputDir = path.join(__dirname, "../data/korem");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (const [korem, wilayah] of Object.entries(mappingKorem)) {
  const filtered = combined.features.filter(
    (f) => wilayah.includes(f.properties.WADMKK)
    // pastikan field kab/kota benar
  );

  if (filtered.length === 0) {
    console.warn(`⚠️ Tidak ada data untuk ${korem}`);
    continue;
  }

  // Gabungkan polygon jadi satu batas
  let merged = filtered[0];
  for (let i = 1; i < filtered.length; i++) {
    try {
      merged = turf.union(turf.buffer(merged, 0), turf.buffer(filtered[i], 0));
    } catch (err) {
      console.error(`❌ Gagal union ${korem} di index ${i}`, err);
    }
  }

  const result = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: korem },
        geometry: merged.geometry,
      },
    ],
  };

  const fileName = korem.replace(/[\/ ]/g, "_") + ".json";
  fs.writeFileSync(
    path.join(outputDir, fileName),
    JSON.stringify(result, null, 2)
  );
  console.log(`✅ ${korem} tersimpan (${filtered.length} kab/kota digabung)`);
}
