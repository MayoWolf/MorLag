// Simple in-memory cache for the lambda instance
const cache = new Map<string, any>();

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

  const normalizedQuery = query.trim();
  
  // Check cache
  if (cache.has(normalizedQuery)) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(cache.get(normalizedQuery))
    };
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(normalizedQuery)}&polygon_geojson=1&addressdetails=1&limit=8`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "MorLag (Netlify function; contact: placeholder@example.com)",
        "Accept-Language": "en"
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Nominatim API error: ${response.statusText}` })
      };
    }

    const data = await response.json();
    
    // Cache the result
    cache.set(normalizedQuery, data);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Geocode error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" })
    };
  }
};

