// Client-side cache with TTL (15 minutes)
interface CacheEntry {
  data: any;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const STORAGE_PREFIX = "morlag-poi-cache:";

function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) {
    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as CacheEntry;
      if (Date.now() > parsed.expires) {
        window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
        return null;
      }
      cache.set(key, parsed);
      return parsed.data;
    } catch {
      return null;
    }
  }
  if (Date.now() > entry.expires) {
    cache.delete(key);
    try {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch {
      // Ignore storage cleanup failures.
    }
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  const entry = {
    data,
    expires: Date.now() + CACHE_TTL
  };
  cache.set(key, entry);
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Large POI responses can exceed storage quota; memory cache still helps for this tab.
  }
}

// Round bbox to 2 decimals for cache key
function roundBbox(south: number, west: number, north: number, east: number): string {
  return `${south.toFixed(2)},${west.toFixed(2)},${north.toFixed(2)},${east.toFixed(2)}`;
}

import type { OsmKind } from "../../shared/osmKinds";

export type PoiKind = OsmKind;

export type PoiPoint = {
  id: number;
  lat: number;
  lon: number;
  name?: string;
  osmType?: "node" | "way" | "relation";
  key?: string;
};

export type PoiResult = {
  kind: string;
  bbox: [number, number, number, number];
  count: number;
  points: PoiPoint[];
};

export async function fetchPois(
  kind: PoiKind,
  bbox: [number, number, number, number], // [south, west, north, east]
  limit: number = 800
): Promise<PoiPoint[]> {
  const [south, west, north, east] = bbox;

  // Check cache
  const cacheKey = `${kind}:${roundBbox(south, west, north, east)}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return cached.points;
  }

  const url = `/.netlify/functions/overpass?kind=${encodeURIComponent(kind)}&south=${south}&west=${west}&north=${north}&east=${east}&limit=${limit}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error || response.statusText || "Unknown error";
    throw new Error(`POI fetch failed: ${response.status} ${errorMsg}`);
  }

  const data: PoiResult = await response.json();
  
  setCache(cacheKey, data);
  return data.points;
}

/**
 * Test Overpass function with a fixed bbox (London area)
 */
export async function testOverpass(kind: string): Promise<{ count: number; points: PoiPoint[] }> {
  // Fixed bbox for London area (south, west, north, east)
  const south = 51.3;
  const west = -0.5;
  const north = 51.7;
  const east = 0.2;

  const url = `/.netlify/functions/overpass?kind=${encodeURIComponent(kind)}&south=${south}&west=${west}&north=${north}&east=${east}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Overpass test failed: ${response.status} ${errorText}`);
  }

  const data: PoiResult = await response.json();
  return {
    count: data.count,
    points: data.points
  };
}
