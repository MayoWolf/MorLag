import { buffer } from "@turf/turf";
import type { Feature, Polygon, MultiPolygon, Point } from "geojson";
import { union, intersect, difference } from "./clip";

export type AnyPoly = Polygon | MultiPolygon;

/**
 * Expand bbox by padding in kilometers
 */
export function expandBbox(
  bbox: [number, number, number, number], // [south, west, north, east]
  padKm: number
): [number, number, number, number] {
  const [south, west, north, east] = bbox;
  
  // Approximate conversion: 1 degree latitude ≈ 110.574 km
  // 1 degree longitude ≈ 111.320 km * cos(latitude)
  const latMid = (south + north) / 2;
  const latPadDeg = padKm / 110.574;
  const lonPadDeg = padKm / (111.320 * Math.cos((latMid * Math.PI) / 180));
  
  return [
    south - latPadDeg,
    west - lonPadDeg,
    north + latPadDeg,
    east + lonPadDeg
  ];
}

/**
 * Build buffer from POI points
 * Merges buffers in chunks to avoid performance issues
 */
export function buildBufferFromPoints(
  points: Array<{ lat: number; lon: number }>,
  radiusKm: number
): Feature<Polygon | MultiPolygon> {
  if (points.length === 0) {
    throw new Error("No points provided");
  }

  // Create buffers for each point
  const buffers: Feature<Polygon>[] = [];
  for (const point of points) {
    const pt: Feature<Point> = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.lon, point.lat]
      },
      properties: {}
    };
    
    const buffered = buffer(pt, radiusKm, { units: "kilometers" });
    if (buffered && buffered.geometry.type === "Polygon") {
      buffers.push(buffered as Feature<Polygon>);
    }
  }

  if (buffers.length === 0) {
    throw new Error("No valid buffers created");
  }

  // Union buffers in chunks of 25 to avoid huge slow unions
  const CHUNK_SIZE = 25;
  let result: Feature<Polygon | MultiPolygon> = buffers[0];
  let resultGeom: AnyPoly = buffers[0].geometry;

  for (let i = 1; i < buffers.length; i += CHUNK_SIZE) {
    const chunk = buffers.slice(i, Math.min(i + CHUNK_SIZE, buffers.length));
    
    // Union current result with chunk
    let chunkResult: AnyPoly = chunk[0].geometry;
    for (let j = 1; j < chunk.length; j++) {
      try {
        const unioned: AnyPoly | null = union(chunkResult, chunk[j].geometry);
        if (unioned) {
          chunkResult = unioned;
        }
      } catch (err) {
        console.warn("Union failed, skipping:", err);
        continue;
      }
    }
    
    // Union chunk result with main result
    try {
      const unioned: AnyPoly | null = union(resultGeom, chunkResult);
      if (unioned) {
        resultGeom = unioned;
      }
    } catch (err) {
      console.warn("Final union failed:", err);
      // If union fails, try to continue with what we have
      continue;
    }
  }

  return {
    type: "Feature",
    geometry: resultGeom,
    properties: {}
  } as Feature<Polygon | MultiPolygon>;
}

/**
 * Apply POI within constraint to candidate area
 */
export function applyPoiWithin(
  candidate: Feature<AnyPoly>,
  bufferFeature: Feature<Polygon | MultiPolygon>,
  answerYes: boolean
): Feature<AnyPoly> | null {
  try {
    if (answerYes) {
      // YES: intersect candidate with buffer (keep only areas within buffer)
      const result = intersect(candidate.geometry, bufferFeature.geometry);
      if (!result) {
        return null;
      }
      return {
        type: "Feature",
        geometry: result,
        properties: {}
      } as Feature<AnyPoly>;
    } else {
      // NO: difference candidate from buffer (remove areas within buffer)
      const result = difference(candidate.geometry, bufferFeature.geometry);
      if (!result) {
        return null;
      }
      return {
        type: "Feature",
        geometry: result,
        properties: {}
      } as Feature<AnyPoly>;
    }
  } catch (err) {
    console.error("POI within operation failed:", err);
    return null;
  }
}

