import { bboxPolygon } from "@turf/turf";
import type { Polygon, MultiPolygon, GeometryCollection } from "geojson";

export type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [min_lat, max_lat, min_lon, max_lon]
  geojson?: Polygon | MultiPolygon | GeometryCollection;
  type?: string;
  class?: string;
  importance?: number;
  address?: Record<string, string>;
};

/**
 * Extract a Polygon or MultiPolygon from a GeometryCollection by picking the first polygonal geometry.
 */
function extractPolyFromCollection(geom: GeometryCollection): Polygon | MultiPolygon | null {
  for (const g of geom.geometries) {
    if (g.type === "Polygon" || g.type === "MultiPolygon") {
      return g;
    }
  }
  return null;
}

/**
 * Normalize geojson: accept Polygon or MultiPolygon or GeometryCollection (pick first polygonal geometry).
 * If geojson missing, generate a polygon from boundingbox using turf bboxPolygon.
 */
export function normalizeGeometry(result: SearchResult): Polygon | MultiPolygon {
  if (result.geojson) {
    if (result.geojson.type === "Polygon" || result.geojson.type === "MultiPolygon") {
      return result.geojson;
    }
    if (result.geojson.type === "GeometryCollection") {
      const poly = extractPolyFromCollection(result.geojson);
      if (poly) return poly;
    }
  }

  // Fallback to bounding box polygon
  const [minLat, maxLat, minLon, maxLon] = result.boundingbox.map(parseFloat);
  const bbox = [minLon, minLat, maxLon, maxLat] as [number, number, number, number];
  const bboxPoly = bboxPolygon(bbox);
  return bboxPoly.geometry;
}

export async function geocode(q: string): Promise<SearchResult[]> {
  const url = `/.netlify/functions/geocode?q=${encodeURIComponent(q)}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Geocoding failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

