// Coastal Configuration for Asset Management System (OPTIMIZED VERSION)
// Defines coastal areas and their buffer zones for accurate region detection

const COASTAL_AREAS = [
  {
    name: "Cilacap",
    bounds: { 
      minLng: 108.7,
      maxLng: 109.5, 
      minLat: -7.8, 
      maxLat: -7.4 
    },
    bufferDistance: 20, // 50 meters in kilometers
    description: "Area pesisir Kabupaten Cilacap"
  }
];

// ============= OPTIMIZATION: CACHE FOR CENTROID CALCULATIONS =============
const centroidCache = new Map();

/**
 * Calculates centroid of a polygon geometry with caching
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Array} [longitude, latitude] of centroid
 */
const calculateCentroid = (geometry) => {
  if (!geometry || !geometry.coordinates) {
    throw new Error("Invalid geometry object");
  }

  // Create a cache key based on geometry coordinates
  const cacheKey = JSON.stringify(geometry.coordinates);
  
  // Check cache first
  if (centroidCache.has(cacheKey)) {
    return centroidCache.get(cacheKey);
  }

  let centroid;

  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates[0];
    let xSum = 0, ySum = 0, count = 0;
    
    for (const coord of coords) {
      xSum += coord[0]; // longitude
      ySum += coord[1]; // latitude
      count++;
    }
    
    if (count > 0) {
      centroid = [xSum / count, ySum / count];
    }
  } else if (geometry.type === "MultiPolygon") {
    if (geometry.coordinates.length > 0) {
      const firstPolygon = { type: "Polygon", coordinates: geometry.coordinates[0] };
      centroid = calculateCentroid(firstPolygon);
    }
  }

  if (!centroid) {
    throw new Error("Unsupported geometry type for centroid calculation");
  }

  // Store in cache
  centroidCache.set(cacheKey, centroid);
  
  return centroid;
};

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
 * OPTIMIZED: Uses cached centroid calculations
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Object|null} Coastal area config if found, null otherwise
 */
export const isGeometryNearCoastalArea = (geometry) => {
  try {
    // Calculate centroid of the geometry (with caching)
    const center = calculateCentroid(geometry);
    const [lng, lat] = center;
    
    return findCoastalArea(lng, lat);
  } catch (error) {
    console.error("Error checking coastal proximity:", error);
    return null;
  }
};

/**
 * Clear the centroid cache (useful for testing or if memory is a concern)
 */
export const clearCentroidCache = () => {
  centroidCache.clear();
};

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = () => {
  return {
    size: centroidCache.size,
    maxSize: 1000 // We can implement LRU if cache grows too large
  };
};

export default COASTAL_AREAS;