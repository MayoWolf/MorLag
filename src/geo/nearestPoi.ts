import type { PoiPoint } from "../services/overpass";
import { haversineMeters } from "./haversine";

export type NearestPoi = {
  id: number;
  key: string;
  lon: number;
  lat: number;
  meters: number;
  name?: string;
};

export function nearestPoiForPoint(pos: [number, number], pois: PoiPoint[]): NearestPoi | null {
  if (pois.length === 0) return null;
  let best: NearestPoi | null = null;
  for (const p of pois) {
    const d = haversineMeters(pos, [p.lon, p.lat]);
    if (!best || d < best.meters) {
      best = { id: p.id, key: p.key ?? String(p.id), lon: p.lon, lat: p.lat, meters: d, name: p.name };
    }
  }
  return best;
}


