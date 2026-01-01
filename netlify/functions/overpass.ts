// In-memory cache with TTL (15 minutes)
interface CacheEntry {
  data: any;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL
  });
}

// Round bbox to 2 decimals for cache key
function roundBbox(south: number, west: number, north: number, east: number): string {
  return `${south.toFixed(2)},${west.toFixed(2)},${north.toFixed(2)},${east.toFixed(2)}`;
}

// POI kind to Overpass tag mapping
const POI_TAGS: Record<string, { node?: string; way?: string; relation?: string; special?: string }> = {
  zoo: { node: '["tourism"="zoo"]', way: '["tourism"="zoo"]', relation: '["tourism"="zoo"]' },
  hospital: { node: '["amenity"="hospital"]', way: '["amenity"="hospital"]', relation: '["amenity"="hospital"]' },
  museum: { node: '["tourism"="museum"]', way: '["tourism"="museum"]', relation: '["tourism"="museum"]' },
  library: { node: '["amenity"="library"]', way: '["amenity"="library"]', relation: '["amenity"="library"]' },
  university: { node: '["amenity"="university"]', way: '["amenity"="university"]', relation: '["amenity"="university"]' },
  school: { node: '["amenity"="school"]', way: '["amenity"="school"]', relation: '["amenity"="school"]' },
  police: { node: '["amenity"="police"]', way: '["amenity"="police"]', relation: '["amenity"="police"]' },
  firestation: { node: '["amenity"="fire_station"]', way: '["amenity"="fire_station"]', relation: '["amenity"="fire_station"]' },
  courthouse: { node: '["amenity"="courthouse"]', way: '["amenity"="courthouse"]', relation: '["amenity"="courthouse"]' },
  townhall: { node: '["amenity"="townhall"]', way: '["amenity"="townhall"]', relation: '["amenity"="townhall"]' },
  embassy: { node: '["embassy"="yes"]', way: '["embassy"="yes"]', relation: '["embassy"="yes"]', special: "embassy" },
  park: { node: '["leisure"="park"]', way: '["leisure"="park"]', relation: '["leisure"="park"]' },
  stadium: { node: '["leisure"="stadium"]', way: '["leisure"="stadium"]', relation: '["leisure"="stadium"]' },
  themepark: { node: '["tourism"="theme_park"]', way: '["tourism"="theme_park"]', relation: '["tourism"="theme_park"]' },
  castle: { node: '["historic"="castle"]', way: '["historic"="castle"]', relation: '["historic"="castle"]' },
  peak: { node: '["natural"="peak"]', way: '["natural"="peak"]', relation: '["natural"="peak"]' },
  airport: { node: '["aeroway"="aerodrome"]', way: '["aeroway"="aerodrome"]', relation: '["aeroway"="aerodrome"]' },
  trainstation: { node: '["railway"="station"]', way: '["railway"="station"]', relation: '["railway"="station"]' },
  ferry: { node: '["amenity"="ferry_terminal"]', way: '["amenity"="ferry_terminal"]', relation: '["amenity"="ferry_terminal"]' }
};

function buildOverpassQuery(kind: string, south: number, west: number, north: number, east: number, limit: number): string {
  const tags = POI_TAGS[kind];
  if (!tags) {
    throw new Error(`Unknown POI kind: ${kind}`);
  }

  const bbox = `(${south},${west},${north},${east})`;
  const parts: string[] = [];

  // Special handling for embassy (check both tags)
  if (kind === "embassy") {
    parts.push(`node["embassy"="yes"]${bbox};`);
    parts.push(`node["amenity"="embassy"]${bbox};`);
    parts.push(`way["embassy"="yes"]${bbox};`);
    parts.push(`way["amenity"="embassy"]${bbox};`);
    parts.push(`relation["embassy"="yes"]${bbox};`);
    parts.push(`relation["amenity"="embassy"]${bbox};`);
  } else {
    if (tags.node) {
      parts.push(`node${tags.node}${bbox};`);
    }
    if (tags.way) {
      parts.push(`way${tags.way}${bbox};`);
    }
    if (tags.relation) {
      parts.push(`relation${tags.relation}${bbox};`);
    }
  }

  const query = `[out:json][timeout:25][bbox:${south},${west},${north},${east}];
(
  ${parts.join('\n  ')}
);
out center ${limit};
`;

  return query;
}

function normalizeOverpassResult(data: any): Array<{ id: number; lat: number; lon: number; name?: string }> {
  const elements = data.elements || [];
  const points: Array<{ id: number; lat: number; lon: number; name?: string }> = [];

  for (const elem of elements) {
    let lat: number | undefined;
    let lon: number | undefined;

    if (elem.type === "node") {
      lat = elem.lat;
      lon = elem.lon;
    } else if (elem.type === "way" || elem.type === "relation") {
      if (elem.center) {
        lat = elem.center.lat;
        lon = elem.center.lon;
      } else if (elem.lat !== undefined && elem.lon !== undefined) {
        lat = elem.lat;
        lon = elem.lon;
      }
    }

    if (lat !== undefined && lon !== undefined) {
      points.push({
        id: elem.id,
        lat,
        lon,
        name: elem.tags?.name || elem.tags?."name:en" || undefined
      });
    }
  }

  return points;
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

  const kind = event.queryStringParameters?.kind;
  const south = parseFloat(event.queryStringParameters?.south || "");
  const west = parseFloat(event.queryStringParameters?.west || "");
  const north = parseFloat(event.queryStringParameters?.north || "");
  const east = parseFloat(event.queryStringParameters?.east || "");
  const limit = parseInt(event.queryStringParameters?.limit || "800", 10);

  if (!kind || isNaN(south) || isNaN(west) || isNaN(north) || isNaN(east)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing or invalid parameters: kind, south, west, north, east required" })
    };
  }

  if (!POI_TAGS[kind]) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown POI kind: ${kind}` })
    };
  }

  // Check cache
  const cacheKey = `${kind}:${roundBbox(south, west, north, east)}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(cached)
    };
  }

  try {
    const query = buildOverpassQuery(kind, south, west, north, east, limit);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "MorLag/0.1 (https://morlag.netlify.app; contact: morlag@users.noreply.github.com)"
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Overpass API returned ${response.status}`);
      }

      const data = await response.json();
      const points = normalizeOverpassResult(data);

      const result = {
        kind,
        bbox: [south, west, north, east],
        count: points.length,
        points
      };

      setCache(cacheKey, result);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({ error: "Overpass busy. Try again." })
        };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Overpass error:", error);
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "Overpass busy. Try again." })
    };
  }
};

