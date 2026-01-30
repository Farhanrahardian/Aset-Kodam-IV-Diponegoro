// utils/locationUtils.js

// --- Helper functions ---

export const validateCoordinates = (coords) => {
  if (!Array.isArray(coords)) return false;
  for (const coord of coords) {
    if (
      !Array.isArray(coord) ||
      coord.length < 2 ||
      typeof coord[0] !== "number" ||
      typeof coord[1] !== "number" ||
      isNaN(coord[0]) ||
      isNaN(coord[1])
    ) {
      return false;
    }
  }
  return true;
};

export const parseLocation = (lokasiData) => {
  if (!lokasiData) {
    return null;
  }

  let parsedData;
  if (typeof lokasiData === 'string') {
    try {
      parsedData = JSON.parse(lokasiData);
    } catch (e) {
      console.error("Gagal mem-parse data lokasi (JSON tidak valid):", lokasiData);
      return null;
    }
  } else {
    parsedData = lokasiData;
  }

  // Case 1: It's a valid GeoJSON Polygon object.
  if (parsedData && parsedData.type === 'Polygon' && Array.isArray(parsedData.coordinates)) {
    return parsedData;
  }
  // Case 2: It's just an array of coordinates (old format).
  else if (Array.isArray(parsedData)) {
    return { type: 'Polygon', coordinates: parsedData };
  }
  // Case 3: It's an object with a 'coordinates' property but no 'type'.
  else if (parsedData && parsedData.coordinates && Array.isArray(parsedData.coordinates)) {
    return { type: 'Polygon', coordinates: parsedData.coordinates };
  }

  console.warn("Format lokasi tidak didukung:", lokasiData);
  return null;
};

export const getCentroid = (geometry) => {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
    return null;
  }

  // Ambil ring terluar untuk perhitungan
  const coords = geometry.coordinates[0];
  if (!validateCoordinates(coords) || coords.length === 0) return null;

  let x = 0, y = 0;
  for (const coord of coords) {
    x += coord[0];
    y += coord[1];
  }
  // Hati-hati, format Google Maps Marker adalah {lat, lng}, sedangkan GeoJSON/Turf [lng, lat]
  // Fungsi ini mengembalikan [lat, lng] untuk Google Maps Marker
  return [y / coords.length, x / coords.length];
};