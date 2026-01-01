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

import { isOsmKind, OSM_KIND_CLAUSES, type OsmKind } from "../../shared/osmKinds";

function buildOverpassQuery(kind: string, south: number, west: number, north: number, east: number, limit: number): string {
  if (!isOsmKind(kind)) {
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
    const clauses = OSM_KIND_CLAUSES[kind as OsmKind] ?? [];
    for (const c of clauses) {
      const tag = `["${c.key}"="${c.value}"]`;
      parts.push(`node${tag}${bbox};`);
      parts.push(`way${tag}${bbox};`);
      parts.push(`relation${tag}${bbox};`);
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
        name: elem.tags?.name || elem.tags?.["name:en"] || undefined
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

  if (!isOsmKind(kind)) {
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

