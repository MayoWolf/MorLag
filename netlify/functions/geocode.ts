// Simple in-memory cache for the lambda instance
const cache = new Map<string, any>();
let lastRequestTime = 0;

/**
 * Throttle requests to 1 per second per lambda instance
 */
async function throttle(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 1000) {
    const waitTime = 1000 - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Normalize Photon API response to match Nominatim format
 */
function normalizePhotonResult(feature: any): any {
  const props = feature.properties || {};
  const geometry = feature.geometry || {};
  
  // Build display_name from name and country
  let display_name = props.name || "";
  if (props.country) {
    display_name = display_name ? `${display_name}, ${props.country}` : props.country;
  }
  if (!display_name) {
    display_name = props.osm_value || props.osm_key || "Unknown location";
  }
  
  // Extract coordinates
  const coords = geometry.coordinates || [];
  const lon = coords[0]?.toString() || "";
  const lat = coords[1]?.toString() || "";
  
  // Extract bbox if available
  let boundingbox: [string, string, string, string] | undefined;
  if (feature.bbox) {
    // Photon bbox format: [min_lon, min_lat, max_lon, max_lat]
    const [minLon, minLat, maxLon, maxLat] = feature.bbox;
    boundingbox = [minLat.toString(), maxLat.toString(), minLon.toString(), maxLon.toString()];
  } else if (coords.length >= 2) {
    // If no bbox, create a minimal one from coordinates
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const padding = 0.01;
    boundingbox = [
      (latNum - padding).toString(),
      (latNum + padding).toString(),
      (lonNum - padding).toString(),
      (lonNum + padding).toString()
    ];
  }
  
  const result: any = {
    display_name,
    lat,
    lon,
    type: props.osm_key || props.type || "",
    class: props.osm_value || props.class || "",
    importance: props.importance || 0
  };
  
  if (boundingbox) {
    result.boundingbox = boundingbox;
  }
  
  // Include geojson if geometry is polygonal
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    result.geojson = geometry;
  }
  
  // Include address-like structure if available
  if (props.country || props.city || props.state) {
    result.address = {};
    if (props.country) result.address.country = props.country;
    if (props.city) result.address.city = props.city;
    if (props.state) result.address.state = props.state;
  }
  
  return result;
}

/**
 * Call Photon geocoder as fallback
 */
async function geocodePhoton(query: string): Promise<any[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "Accept-Language": "en"
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Photon API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const features = data.features || [];
    
    // Normalize Photon results to match Nominatim format
    return features.map(normalizePhotonResult);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Photon geocoder timeout");
    }
    throw error;
  }
}

export const handler = async (event: any) => {
  // Handle CORS
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const query = event.queryStringParameters?.q;
  if (!query || query.trim() === "") {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing or empty query parameter 'q'" })
    };
  }

  const normalizedQuery = query.trim().toLowerCase();
  
  // Check cache
  if (cache.has(normalizedQuery)) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(cache.get(normalizedQuery))
    };
  }

  // Throttle requests
  await throttle();

  // Try Nominatim first
  try {
    const email = "morlag@users.noreply.github.com";
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query.trim())}&polygon_geojson=1&addressdetails=1&limit=8&email=${encodeURIComponent(email)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(nominatimUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "MorLag/0.1 (https://morlag.netlify.app; contact: morlag@users.noreply.github.com)",
          "Referer": "https://morlag.netlify.app/",
          "Accept": "application/json",
          "Accept-Language": "en"
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the result
        cache.set(normalizedQuery, data);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      } else {
        // Nominatim failed, try Photon fallback
        console.warn(`Nominatim returned ${response.status}, falling back to Photon`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.warn("Nominatim timeout, falling back to Photon");
      } else {
        throw fetchError;
      }
    }
  } catch (nominatimError) {
    console.warn("Nominatim error, falling back to Photon:", nominatimError);
  }

  // Fallback to Photon
  try {
    const photonResults = await geocodePhoton(query.trim());
    
    // Cache the result
    cache.set(normalizedQuery, photonResults);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(photonResults)
    };
  } catch (error) {
    console.error("Geocode error (both Nominatim and Photon failed):", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error",
        provider: "photon (fallback)"
      })
    };
  }
};
