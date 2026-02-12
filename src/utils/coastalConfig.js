// Coastal Configuration for Asset Management System
// Defines coastal areas and their buffer zones for accurate region detection

const COASTAL_AREAS = [
  {
    name: "Cilacap",
    bounds: { 
      minLng: 108.7,   // Adjust these values based on actual Cilacap coastal coordinates
      maxLng: 109.5, 
      minLat: -7.8, 
      maxLat: -7.4 
    },
    bufferDistance: 0.05, // 50 meters in kilometers
    description: "Area pesisir Kabupaten Cilacap"
  }
];

/**
 * Checks if a given coordinate is within any defined coastal area
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {Object|null} Coastal area config if found, null otherwise
 */
export const findCoastalArea = (lng, lat) => {
  for (const coastalArea of COASTAL_AREAS) {
    if (lng >= coastalArea.bounds.minLng && lng <= coastalArea.bounds.maxLng &&
        lat >= coastalArea.bounds.minLat && lat <= coastalArea.bounds.maxLat) {
      return coastalArea;
    }
  }
  return null;
};

/**
 * Gets all defined coastal areas
 * @returns {Array} Array of coastal area configurations
 */
export const getAllCoastalAreas = () => {
  return COASTAL_AREAS;
};

/**
 * Checks if a geometry (GeoJSON feature) is near any coastal area
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Object|null} Coastal area config if found, null otherwise
 */
export const isGeometryNearCoastalArea = (geometry) => {
  try {
    // Calculate centroid of the geometry
    const center = calculateCentroid(geometry);
    const [lng, lat] = center;
    
    return findCoastalArea(lng, lat);
  } catch (error) {
    console.error("Error checking coastal proximity:", error);
    return null;
  }
};

/**
 * Calculates centroid of a polygon geometry
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Array} [longitude, latitude] of centroid
 */
const calculateCentroid = (geometry) => {
  if (!geometry || !geometry.coordinates) {
    throw new Error("Invalid geometry object");
  }

  if (geometry.type === "Polygon") {
    // For Polygon, coordinates[0] contains the exterior ring
    const coords = geometry.coordinates[0];
    let xSum = 0, ySum = 0, count = 0;
    
    for (const coord of coords) {
      xSum += coord[0]; // longitude
      ySum += coord[1]; // latitude
      count++;
    }
    
    if (count > 0) {
      return [xSum / count, ySum / count];
    }
  } else if (geometry.type === "MultiPolygon") {
    // For MultiPolygon, use the first polygon
    if (geometry.coordinates.length > 0) {
      const firstPolygon = { type: "Polygon", coordinates: geometry.coordinates[0] };
      return calculateCentroid(firstPolygon);
    }
  }
  
  throw new Error("Unsupported geometry type for centroid calculation");
};

export default COASTAL_AREAS;