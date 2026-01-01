import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { PoiPoint } from "../services/overpass";
import { buildBufferFromPoints } from "./poiWithin";
import { intersect } from "./clip";
import { samplePointsInPoly, type AnyPoly } from "./sampling";
import { nearestPoiForPoint } from "./nearestPoi";

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const stride = Math.ceil(arr.length / max);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  return out;
}

export function applyMatchingSameNearest({
  candidate,
  seekerLngLat,
  pois,
  answerYes
}: {
  candidate: AnyPoly;
  seekerLngLat: [number, number];
  pois: PoiPoint[];
  answerYes: boolean;
}): { next: AnyPoly | null; sampleCount: number; keptCount: number; seekerNearestId: number } {
  const seekerNearest = nearestPoiForPoint(seekerLngLat, pois);
  if (!seekerNearest) {
    return { next: null, sampleCount: 0, keptCount: 0, seekerNearestId: -1 };
  }

  const { points, stepKm } = samplePointsInPoly(candidate, { maxPoints: 900, minStepKm: 12 });
  if (points.length === 0) {
    return { next: null, sampleCount: 0, keptCount: 0, seekerNearestId: seekerNearest.id };
  }

  const kept: Array<{ lat: number; lon: number }> = [];
  for (const [lon, lat] of points) {
    const n = nearestPoiForPoint([lon, lat], pois);
    const same = n ? n.id === seekerNearest.id : false;
    const keep = answerYes ? same : !same;
    if (keep) kept.push({ lat, lon });
  }

  if (kept.length === 0) {
    return { next: null, sampleCount: points.length, keptCount: 0, seekerNearestId: seekerNearest.id };
  }

  const keptDs = downsample(kept, 350);
  const bufferKm = Math.max(6, stepKm * 0.9);
  const buffer = buildBufferFromPoints(keptDs, bufferKm);
  const clipped = intersect(candidate, buffer.geometry as AnyPoly);
  return {
    next: clipped,
    sampleCount: points.length,
    keptCount: kept.length,
    seekerNearestId: seekerNearest.id
  };
}

export function applyMeasuringCloserFarther({
  candidate,
  seekerLngLat,
  pois,
  answer,
  epsilonMeters
}: {
  candidate: AnyPoly;
  seekerLngLat: [number, number];
  pois: PoiPoint[];
  answer: "CLOSER" | "FARTHER";
  epsilonMeters?: number;
}): { next: AnyPoly | null; sampleCount: number; keptCount: number; seekerDistanceM: number } {
  const eps = epsilonMeters ?? 25;
  const seekerNearest = nearestPoiForPoint(seekerLngLat, pois);
  if (!seekerNearest) {
    return { next: null, sampleCount: 0, keptCount: 0, seekerDistanceM: -1 };
  }
  const seekerD = seekerNearest.meters;

  const { points, stepKm } = samplePointsInPoly(candidate, { maxPoints: 900, minStepKm: 12 });
  if (points.length === 0) {
    return { next: null, sampleCount: 0, keptCount: 0, seekerDistanceM: seekerD };
  }

  const kept: Array<{ lat: number; lon: number }> = [];
  for (const [lon, lat] of points) {
    const n = nearestPoiForPoint([lon, lat], pois);
    if (!n) continue;
    const d = n.meters;
    const keep = answer === "CLOSER" ? d < seekerD - eps : d > seekerD + eps;
    if (keep) kept.push({ lat, lon });
  }

  if (kept.length === 0) {
    return { next: null, sampleCount: points.length, keptCount: 0, seekerDistanceM: seekerD };
  }

  const keptDs = downsample(kept, 350);
  const bufferKm = Math.max(6, stepKm * 0.9);
  const buffer = buildBufferFromPoints(keptDs, bufferKm);
  const clipped = intersect(candidate, buffer.geometry as AnyPoly);
  return {
    next: clipped,
    sampleCount: points.length,
    keptCount: kept.length,
    seekerDistanceM: seekerD
  };
}


