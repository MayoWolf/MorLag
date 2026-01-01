import type { Feature, Point, Polygon, MultiPolygon } from "geojson";
import { bbox as turfBbox, booleanPointInPolygon } from "@turf/turf";

export type AnyPoly = Polygon | MultiPolygon;

function kmToLatDeg(km: number) {
  return km / 110.574;
}

function kmToLonDeg(km: number, latDeg: number) {
  return km / (111.320 * Math.cos((latDeg * Math.PI) / 180));
}

export type SampleResult = {
  points: Array<[number, number]>; // [lon,lat]
  stepKm: number;
};

/**
 * Samples a polygon into a coarse grid of points inside the polygon.
 * This is an approximation strategy used for MATCHING/MEASURING.
 */
export function samplePointsInPoly(
  geom: AnyPoly,
  opts?: { maxPoints?: number; minStepKm?: number }
): SampleResult {
  const maxPoints = opts?.maxPoints ?? 900;
  const minStepKm = opts?.minStepKm ?? 10;

  const bb = turfBbox(geom as any) as [number, number, number, number]; // [minLon,minLat,maxLon,maxLat]
  const [minLon, minLat, maxLon, maxLat] = bb;

  const latMid = (minLat + maxLat) / 2;
  const widthKm = Math.max(1, (maxLon - minLon) * 111.320 * Math.cos((latMid * Math.PI) / 180));
  const heightKm = Math.max(1, (maxLat - minLat) * 110.574);
  const areaKm2 = widthKm * heightKm;

  // Aim for ~maxPoints points over the bbox area; stepKm ~ sqrt(area / N)
  const stepKm = Math.max(minStepKm, Math.sqrt(areaKm2 / Math.max(1, maxPoints)));

  const feature: Feature<AnyPoly> = { type: "Feature", geometry: geom, properties: {} };
  const points: Array<[number, number]> = [];

  // Iterate lat bands, adjusting lon step per latitude (keeps approx square cells)
  for (let lat = minLat; lat <= maxLat; lat += kmToLatDeg(stepKm)) {
    const lonStep = kmToLonDeg(stepKm, lat);
    for (let lon = minLon; lon <= maxLon; lon += lonStep) {
      const p: Feature<Point> = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {}
      };
      if (booleanPointInPolygon(p as any, feature as any)) {
        points.push([lon, lat]);
      }
      if (points.length >= maxPoints) {
        return { points, stepKm };
      }
    }
  }

  return { points, stepKm };
}


