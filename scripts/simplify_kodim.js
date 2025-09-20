const fs = require('fs');
const turf = require('@turf/turf');

const inputPath = 'public/data/Kodim.geojson';
const outputPath = 'public/data/Kodim_simplified.geojson';

console.log(`Reading ${inputPath}...`);
const geojson = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Options for simplification. Tolerance is in degrees.
// A smaller tolerance means less simplification.
const options = { tolerance: 0.001, highQuality: false };

console.log('Simplifying GeoJSON...');
const simplified = turf.simplify(geojson, options);

// Add a property to distinguish it if needed
simplified.properties = { simplified: true };

console.log(`Writing simplified file to ${outputPath}...`);
fs.writeFileSync(outputPath, JSON.stringify(simplified));

console.log('Simplification complete!');
