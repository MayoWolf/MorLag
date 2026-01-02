import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";
import { booleanPointInPolygon, point as turfPoint, voronoi as turfVoronoi, area as turfArea } from "@turf/turf";
import type { PoiPoint } from "../services/overpass";
import type { AnyPoly } from "./clip";
import { intersect, difference } from "./clip";
import { nearestPoiForPoint } from "./nearestPoi";

function uniqPoints(pois: PoiPoint[]): PoiPoint[] {
  const seen = new Set<string>();
  const out: PoiPoint[] = [];
  for (const p of pois) {
    const key = p.key ?? `${p.osmType ?? "x"}/${p.id}`;
    // also dedupe on coords to avoid Voronoi issues with duplicate sites
    const coordKey = `${Math.round(p.lat * 1e6)}/${Math.round(p.lon * 1e6)}`;
    const k = `${key}|${coordKey}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

export function applyMatchingVoronoi({
  candidate,
  seekerLngLat,
  pois,
  answerYes,
  bbox
}: {
  candidate: AnyPoly;
  seekerLngLat: [number, number];
  pois: PoiPoint[];
  answerYes: boolean;
  bbox: [number, number, number, number]; // [minLon,minLat,maxLon,maxLat]
}): {
  next: AnyPoly | null;
  featureCount: number;
  seekerNearestKey: string | null;
  areaBefore: number;
  areaAfter: number;
  percentRemaining: number;
} {
  const areaBefore = turfArea({ type: "Feature", properties: {}, geometry: candidate } as any);

  const unique = uniqPoints(pois);
  const featureCount = unique.length;
  const seekerNearest = nearestPoiForPoint(seekerLngLat, unique);
  if (!seekerNearest) {
    return { next: null, featureCount, seekerNearestKey: null, areaBefore, areaAfter: 0, percentRemaining: 0 };
  }

  // Edge case: only one POI => it's nearest everywhere within bbox.
  if (featureCount === 1) {
    if (answerYes) {
      return { next: candidate, featureCount, seekerNearestKey: seekerNearest.key, areaBefore, areaAfter: areaBefore, percentRemaining: 100 };
    }
    return { next: null, featureCount, seekerNearestKey: seekerNearest.key, areaBefore, areaAfter: 0, percentRemaining: 0 };
  }

  const fc: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: unique.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { key: p.key ?? `${p.osmType ?? "x"}/${p.id}` }
    }))
  };

  const vor = turfVoronoi(fc as any, { bbox }) as FeatureCollection<Polygon> | null;
  if (!vor || !vor.features || vor.features.length === 0) {
    return { next: null, featureCount, seekerNearestKey: seekerNearest.key, areaBefore, areaAfter: 0, percentRemaining: 0 };
  }

  const sitePoint = turfPoint([seekerNearest.lon, seekerNearest.lat]);
  let cell: Polygon | null = null;
  for (const f of vor.features) {
    if (!f?.geometry) continue;
    if (booleanPointInPolygon(sitePoint as any, f as any)) {
      cell = f.geometry;
      break;
    }
  }

  if (!cell) {
    // Fallback: treat as no-op on YES, impossible on NO (should be rare)
    if (answerYes) {
      return { next: candidate, featureCount, seekerNearestKey: seekerNearest.key, areaBefore, areaAfter: areaBefore, percentRemaining: 100 };
    }
    return { next: null, featureCount, seekerNearestKey: seekerNearest.key, areaBefore, areaAfter: 0, percentRemaining: 0 };
  }

  const next = answerYes ? intersect(candidate, cell as any) : difference(candidate, cell as any);
  const areaAfter = next ? turfArea({ type: "Feature", properties: {}, geometry: next } as any) : 0;
  const percentRemaining = areaBefore > 0 ? (areaAfter / areaBefore) * 100 : 0;

  return {
    next,
    featureCount,
    seekerNearestKey: seekerNearest.key,
    areaBefore,
    areaAfter,
    percentRemaining
  };
}


