import { circle, point } from "@turf/turf";
import type { Polygon, MultiPolygon } from "geojson";
import { difference, intersect } from "./clip";

export type AnyPoly = Polygon | MultiPolygon;

export function applyRadar(
  candidate: AnyPoly,
  seekerLngLat: [number, number],
  radiusMiles: number,
  hit: boolean
): AnyPoly | null {
  const center = point(seekerLngLat);
  const c = circle(center, radiusMiles, { units: "miles", steps: 96 });
  const circleGeom = c.geometry as AnyPoly;
  return hit ? intersect(candidate, circleGeom) : difference(candidate, circleGeom);
}
