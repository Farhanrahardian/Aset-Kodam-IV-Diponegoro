// utils/locationUtils.js
export const normalizeLocationData = (lokasi) => {
  if (!lokasi) return null;

  let coordinates = lokasi;

  // Handle string JSON
  if (typeof coordinates === "string") {
    try {
      coordinates = JSON.parse(coordinates);
    } catch (e) {
      return null;
    }
  }

  // Normalize ke format standar: [[lng,lat], [lng,lat], ...]
  if (Array.isArray(coordinates)) {
    if (coordinates.length > 0 && Array.isArray(coordinates[0])) {
      if (typeof coordinates[0][0] === "number") {
        return coordinates; // Sudah format yang benar
      } else if (Array.isArray(coordinates[0][0])) {
        return coordinates[0]; // Extract dari nested array
      }
    }
  } else if (coordinates.type === "Polygon") {
    return coordinates.coordinates[0]; // GeoJSON format
  }

  return null;
};

export const extractDrawingCoordinates = (drawingData) => {
  if (!drawingData?.geometry?.coordinates) return null;
  return drawingData.geometry.coordinates[0]; // Selalu ambil exterior ring
};
