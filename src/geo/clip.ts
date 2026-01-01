import polygonClipping from "polygon-clipping";
import type { Polygon, MultiPolygon, BBox, Feature } from "geojson";
import { bbox, bboxPolygon } from "@turf/turf";

export type AnyPoly = Polygon | MultiPolygon;

function toPC(geom: AnyPoly): any {
  if (geom.type === "Polygon") return [geom.coordinates];
  return geom.coordinates;
}

function fromPC(pc: any): AnyPoly | null {
  if (!pc || pc.length === 0) return null;
  if (pc.length === 1) return { type: "Polygon", coordinates: pc[0] };
  return { type: "MultiPolygon", coordinates: pc };
}

export function intersect(a: AnyPoly, b: AnyPoly): AnyPoly | null {
  const out = polygonClipping.intersection(toPC(a), toPC(b));
  return fromPC(out);
}

export function difference(a: AnyPoly, b: AnyPoly): AnyPoly | null {
  const out = polygonClipping.difference(toPC(a), toPC(b));
  return fromPC(out);
}

export function union(a: AnyPoly, b: AnyPoly): AnyPoly | null {
  const out = polygonClipping.union(toPC(a), toPC(b));
  return fromPC(out);
}

export function bboxPolygonFor(geom: AnyPoly, pad = 0.5): Feature<Polygon> {
  const bb = bbox(geom as any) as BBox;
  const padded: BBox = [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad];
  return bboxPolygon(padded);
}
