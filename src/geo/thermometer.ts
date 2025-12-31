import { booleanPointInPolygon, bbox, bboxPolygon, point, featureCollection, voronoi } from "@turf/turf";
import type { Polygon, MultiPolygon } from "@turf/helpers";
import { bboxPolygonFor, intersect } from "./clip";

export type AnyPoly = Polygon | MultiPolygon;

/**
 * Thermometer via Voronoi split.
 * We compute Voronoi cells for seeker start A and seeker end B.
 * "Hotter" keeps the B cell. "Colder" keeps the A cell.
 */
export function applyThermometer(
  candidate: AnyPoly,
  seekerStart: [number, number],
  seekerEnd: [number, number],
  hotter: boolean
): AnyPoly | null {
  const a = point(seekerStart, { id: "A" });
  const b = point(seekerEnd, { id: "B" });
  const points = featureCollection([a, b]);

  const bbPoly = bboxPolygonFor(candidate, 1.0);
  const bb = bbox(bbPoly);

  const v = voronoi(points, { bbox: bb });
  if (!v) return null;

  let cellA: AnyPoly | null = null;
  let cellB: AnyPoly | null = null;

  for (const f of v.features) {
    if (!f?.geometry) continue;
    const g = f.geometry as AnyPoly;
    if (booleanPointInPolygon(a, g as any)) cellA = g;
    if (booleanPointInPolygon(b, g as any)) cellB = g;
  }

  const chosen = hotter ? cellB : cellA;
  if (!chosen) return null;

  return intersect(candidate, chosen);
}
