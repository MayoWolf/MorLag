import { create } from "zustand";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { bbox as turfBbox } from "@turf/turf";

import countriesSample from "../data/countries.sample.geojson";
import { applyRadar } from "../geo/radar";
import { applyThermometer } from "../geo/thermometer";
import { geocode, normalizeGeometry, reverseGeocode, type SearchResult } from "../services/geocode";
import { fetchPois, type PoiKind } from "../services/overpass";
import { expandBbox, buildBufferFromPoints, applyPoiWithin } from "../geo/poiWithin";
import { applyMatchingSameNearest } from "../geo/matchingMeasuring";
import { applyMatchingVoronoi } from "../geo/matchingVoronoi";
import type { OsmKind } from "../../shared/osmKinds";
import { samplePointsInPoly } from "../geo/sampling";
import { intersect } from "../geo/clip";
import { nearestPoiForPoint } from "../geo/nearestPoi";

type AnyPoly = Polygon | MultiPolygon;

type CountryProps = { name?: string; iso_a2?: string };
type CountryFeature = Feature<AnyPoly, CountryProps>;

type HistoryItem =
  | {
      id: string;
      ts: number;
      type: "RADAR";
      radiusMiles: number;
      hit: boolean;
      seeker: [number, number];
    }
  | {
      id: string;
      ts: number;
      type: "THERMOMETER";
      hotter: boolean;
      start: [number, number];
      end: [number, number];
    }
  | {
      id: string;
      ts: number;
      type: "MATCHING";
      kind: string;
      answer: "YES" | "NO";
      poiCount: number;
      sampleCount: number;
      keptCount: number;
    }
  | {
      id: string;
      ts: number;
      type: "MEASURING";
      kind: string;
      answer: "CLOSER" | "FARTHER";
      poiCount: number;
      sampleCount: number;
      keptCount: number;
    }
  | {
      id: string;
      ts: number;
      type: "SET_COUNTRY";
      isoA2: string;
      name?: string;
    }
  | {
      id: string;
      ts: number;
      type: "SET_AREA";
      label: string;
    }
  | {
      id: string;
      ts: number;
      type: "POI_WITHIN";
      kind: string;
      radiusMiles: number;
      answer: "YES" | "NO";
      poiCount: number;
    };

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function getCountries(): CountryFeature[] {
  const fc = countriesSample as unknown as FeatureCollection<AnyPoly, CountryProps>;
  return (fc.features ?? []) as CountryFeature[];
}

function findCountry(countries: CountryFeature[], isoA2: string): CountryFeature | null {
  const upper = isoA2.trim().toUpperCase();
  return countries.find(f => (f.properties?.iso_a2 ?? "").toUpperCase() === upper) ?? null;
}

type MorLagState = {
  countries: CountryFeature[];
  selectedIsoA2: string;
  candidate: AnyPoly | null;

  seekerLngLat: [number, number] | null;
  seekerAccuracyM: number | null;
  seekerLastUpdatedMs: number | null;
  gpsWatchId: number | null;
  isTrackingGPS: boolean;

  thermoStart: [number, number] | null;
  thermoEnd: [number, number] | null;

  history: HistoryItem[];
  undoStack: AnyPoly[];
  redoStack: AnyPoly[];

  searchQuery: string;
  searchResults: SearchResult[];
  selectedAreaLabel: string | null;
  lastToast: string | null;

  setCountry: (isoA2: string) => void;
  updateSeekerFromGPS: () => Promise<void>;
  startGPSTracking: () => void;
  stopGPSTracking: () => void;

  setThermoStartNow: () => void;
  setThermoEndNow: () => void;

  applyRadarNow: (radiusMiles: number, hit: boolean) => void;
  applyThermo: (hotter: boolean) => void;

  applyMatching: (kind: OsmKind, answer: "YES" | "NO") => Promise<void>;
  applyMatchingAdmin: (level: 1 | 2 | 3 | 4, answer: "YES" | "NO") => Promise<void>;
  applyMeasuring: (kind: OsmKind, answer: "CLOSER" | "FARTHER") => Promise<void>;

  undo: () => void;
  redo: () => void;
  resetCandidateToCountry: () => void;

  setSearchQuery: (q: string) => void;
  runSearch: () => Promise<void>;
  selectSearchResult: (result: SearchResult) => void;
  applyPoiWithin: (kind: PoiKind, radiusMiles: number, answer: "YES" | "NO") => Promise<void>;
  setLastToast: (toast: string | null) => void;
};

export const useStore = create<MorLagState>((set, get) => {
  const countries = getCountries();

  return {
    countries,
    selectedIsoA2: "",
    candidate: null,

    seekerLngLat: null,
    seekerAccuracyM: null,
    seekerLastUpdatedMs: null,
    gpsWatchId: null,
    isTrackingGPS: false,

    thermoStart: null,
    thermoEnd: null,

    history: [],
    undoStack: [],
    redoStack: [],

    searchQuery: "",
    searchResults: [],
    selectedAreaLabel: null,
    lastToast: null,

    setCountry: (isoA2: string) => {
      const f = findCountry(get().countries, isoA2);
      if (!f) return;

      const iso = (f.properties?.iso_a2 ?? isoA2).toUpperCase();

      set({
        selectedIsoA2: iso,
        candidate: f.geometry as AnyPoly,
        undoStack: [],
        redoStack: [],
        thermoStart: null,
        thermoEnd: null,
        history: [
          ...get().history,
          { id: uid(), ts: Date.now(), type: "SET_COUNTRY", isoA2: iso, name: f.properties?.name }
        ]
      });
    },

    updateSeekerFromGPS: async () => {
      if (!navigator.geolocation) throw new Error("Geolocation not supported");

      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (err) => {
            const codeMsg = err.code === 1 ? "PERMISSION_DENIED" : err.code === 2 ? "POSITION_UNAVAILABLE" : err.code === 3 ? "TIMEOUT" : `ERROR_${err.code}`;
            reject(new Error(`GPS error (${codeMsg}): ${err.message || "Unknown error"}`));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });

      const lng = pos.coords.longitude;
      const lat = pos.coords.latitude;
      const now = Date.now();

      set({
        seekerLngLat: [lng, lat],
        seekerAccuracyM: pos.coords.accuracy ?? null,
        seekerLastUpdatedMs: now
      });
    },

    startGPSTracking: () => {
      const state = get();
      if (state.isTrackingGPS || state.gpsWatchId !== null) {
        return; // Already tracking
      }

      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported");
      }

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;
          const now = Date.now();

          set({
            seekerLngLat: [lng, lat],
            seekerAccuracyM: pos.coords.accuracy ?? null,
            seekerLastUpdatedMs: now
          });
        },
        (err) => {
          console.error("GPS tracking error:", err);
          // Stop tracking on error
          get().stopGPSTracking();
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0
        }
      );

      set({
        gpsWatchId: watchId,
        isTrackingGPS: true
      });
    },

    stopGPSTracking: () => {
      const state = get();
      if (state.gpsWatchId !== null) {
        navigator.geolocation.clearWatch(state.gpsWatchId);
      }

      set({
        gpsWatchId: null,
        isTrackingGPS: false
      });
    },

    setThermoStartNow: () => {
      const s = get().seekerLngLat;
      if (!s) return;
      set({ thermoStart: s });
    },

    setThermoEndNow: () => {
      const s = get().seekerLngLat;
      if (!s) return;
      set({ thermoEnd: s });
    },

    applyRadarNow: (radiusMiles: number, hit: boolean) => {
      const candidate = get().candidate;
      const seeker = get().seekerLngLat;
      if (!candidate || !seeker) return;

      const next = applyRadar(candidate, seeker, radiusMiles, hit);
      if (!next) return;

      set({
        candidate: next,
        undoStack: [...get().undoStack, candidate],
        redoStack: [],
        history: [
          ...get().history,
          { id: uid(), ts: Date.now(), type: "RADAR", radiusMiles, hit, seeker }
        ]
      });
    },

    applyThermo: (hotter: boolean) => {
      const candidate = get().candidate;
      const a = get().thermoStart;
      const b = get().thermoEnd;
      if (!candidate || !a || !b) return;

      const next = applyThermometer(candidate, a, b, hotter);
      if (!next) return;

      set({
        candidate: next,
        undoStack: [...get().undoStack, candidate],
        redoStack: [],
        history: [
          ...get().history,
          { id: uid(), ts: Date.now(), type: "THERMOMETER", hotter, start: a, end: b }
        ]
      });
    },

    applyMatching: async (kind: OsmKind, answer: "YES" | "NO") => {
      const candidate = get().candidate;
      const seeker = get().seekerLngLat;
      if (!candidate || !seeker) {
        set({ lastToast: "Requires seeker GPS and a selected area." });
        return;
      }

      try {
        const candidateFeature: Feature<AnyPoly> = { type: "Feature", geometry: candidate, properties: {} };
        const bb = turfBbox(candidateFeature) as [number, number, number, number]; // [minLon,minLat,maxLon,maxLat]
        // Fetch a wider POI set so nearest identity is well-defined across the whole possible area.
        // 100mi radar ≈ 161km, use >=200km padding.
        const expanded = expandBbox([bb[1], bb[0], bb[3], bb[2]], 220);
        const pois = await fetchPois(kind as unknown as PoiKind, expanded, 2000);
        if (pois.length === 0) {
          set({ lastToast: `Need POI data for ${kind} (0 found). Try a smaller area or different kind.` });
          return;
        }

        const bboxVor: [number, number, number, number] = [expanded[1], expanded[0], expanded[3], expanded[2]];
        const { next, featureCount, seekerNearestKey, areaBefore, areaAfter, percentRemaining } = applyMatchingVoronoi({
          candidate,
          seekerLngLat: seeker,
          pois,
          answerYes: answer === "YES",
          bbox: bboxVor
        });

        console.log("[MATCHING]", {
          kind,
          featureCount,
          seekerNearest: seekerNearestKey,
          areaBefore,
          areaAfter,
          percentRemaining
        });

        if (!seekerNearestKey || featureCount === 0) {
          set({ lastToast: `Need POI data for ${kind}.` });
          return;
        }

        if (!next) {
          set({
            candidate: null,
            lastToast: "No possible area remains.",
            undoStack: [...get().undoStack, candidate],
            redoStack: [],
            history: [
              ...get().history,
              {
                id: uid(),
                ts: Date.now(),
                type: "MATCHING",
                kind,
                answer,
                poiCount: pois.length,
                sampleCount: 0,
                keptCount: 0
              }
            ]
          });
          return;
        }

        set({
          candidate: next,
          lastToast: `Matching ${kind} ${answer}: ${percentRemaining.toFixed(1)}% remains (${pois.length} POIs)`,
          undoStack: [...get().undoStack, candidate],
          redoStack: [],
          history: [
            ...get().history,
            {
              id: uid(),
              ts: Date.now(),
              type: "MATCHING",
              kind,
              answer,
              poiCount: pois.length,
              sampleCount: 0,
              keptCount: 0
            }
          ]
        });
      } catch (error) {
        console.error("Matching error:", error);
        set({ lastToast: error instanceof Error ? error.message : "Matching operation failed" });
      }
    },

    applyMatchingAdmin: async (level: 1 | 2 | 3 | 4, answer: "YES" | "NO") => {
      const candidate = get().candidate;
      const seeker = get().seekerLngLat;
      if (!candidate || !seeker) {
        set({ lastToast: "Requires seeker GPS and a selected area." });
        return;
      }

      const norm = (s: string) =>
        s
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");

      // Cache reverse lookups by rounded coordinates to avoid spamming
      const cacheKeyFor = (lon: number, lat: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;
      const localCache = new Map<string, string | null>();

      try {
        const seekerRev = await reverseGeocode(seeker[1], seeker[0]);
        const addrS = (seekerRev.address ?? {}) as Record<string, string>;
        const pickAdmin = (addr: Record<string, string>): string | "" => {
          if (level === 1) return addr.state || addr.region || addr.province || "";
          if (level === 2) return addr.county || addr.state_district || addr.district || "";
          if (level === 3) return addr.city || addr.town || addr.municipality || addr.village || "";
          return (
            addr.borough ||
            addr.ward ||
            addr.suburb ||
            addr.city_district ||
            addr.quarter ||
            addr.neighbourhood ||
            ""
          );
        };
        const seekerValRaw = pickAdmin(addrS);
        const seekerVal = seekerValRaw ? norm(seekerValRaw) : "";
        if (!seekerVal) {
          set({ lastToast: `Could not determine admin level ${level} for seeker.` });
          return;
        }

        // Reverse-geocode is expensive; use a coarser grid.
        const { points, stepKm } = samplePointsInPoly(candidate, { maxPoints: 28, minStepKm: 80 });
        if (points.length === 0) {
          set({ lastToast: "No candidate samples to evaluate." });
          return;
        }

        const kept: Array<{ lat: number; lon: number }> = [];
        for (const [lon, lat] of points) {
          const key = cacheKeyFor(lon, lat);
          let region = localCache.get(key);
          if (region === undefined) {
            const rev = await reverseGeocode(lat, lon);
            const addr = (rev.address ?? {}) as Record<string, string>;
            const valRaw = pickAdmin(addr);
            region = valRaw ? norm(valRaw) : null;
            localCache.set(key, region);
          }
          const same = region ? region === seekerVal : false;
          const keep = answer === "YES" ? same : !same;
          if (keep) kept.push({ lat, lon });
        }

        if (kept.length === 0) {
          set({
            candidate: null,
            lastToast: "No possible area remains.",
            undoStack: [...get().undoStack, candidate],
            redoStack: [],
            history: [
              ...get().history,
              {
                id: uid(),
                ts: Date.now(),
                type: "MATCHING",
                kind: `admin${level}`,
                answer,
                poiCount: 0,
                sampleCount: points.length,
                keptCount: 0
              }
            ]
          });
          return;
        }

        const bufferKm = Math.max(10, stepKm * 0.9);
        const buffer = buildBufferFromPoints(kept, bufferKm);
        const clipped = intersect(candidate, buffer.geometry as AnyPoly);
        if (!clipped) {
          set({
            candidate: null,
            lastToast: "No possible area remains.",
            undoStack: [...get().undoStack, candidate],
            redoStack: [],
            history: [
              ...get().history,
              {
                id: uid(),
                ts: Date.now(),
                type: "MATCHING",
                kind: `admin${level}`,
                answer,
                poiCount: 0,
                sampleCount: points.length,
                keptCount: kept.length
              }
            ]
          });
          return;
        }

        set({
          candidate: clipped,
          lastToast: `Matching admin${level} ${answer}: kept ${kept.length}/${points.length}`,
          undoStack: [...get().undoStack, candidate],
          redoStack: [],
          history: [
            ...get().history,
            {
              id: uid(),
              ts: Date.now(),
              type: "MATCHING",
              kind: `admin${level}`,
              answer,
              poiCount: 0,
              sampleCount: points.length,
              keptCount: kept.length
            }
          ]
        });
      } catch (error) {
        console.error("Matching admin error:", error);
        set({ lastToast: error instanceof Error ? error.message : "Admin matching failed" });
      }
    },

    applyMeasuring: async (kind: OsmKind, answer: "CLOSER" | "FARTHER") => {
      const candidate = get().candidate;
      const seeker = get().seekerLngLat;
      if (!candidate || !seeker) {
        set({ lastToast: "Requires seeker GPS and a selected area." });
        return;
      }

      try {
        const candidateFeature: Feature<AnyPoly> = { type: "Feature", geometry: candidate, properties: {} };
        const bb = turfBbox(candidateFeature) as [number, number, number, number]; // [minLon,minLat,maxLon,maxLat]
        const expanded = expandBbox([bb[1], bb[0], bb[3], bb[2]], 75); // ~75km padding
        const pois = await fetchPois(kind as unknown as PoiKind, expanded, 800);
        if (pois.length === 0) {
          set({ lastToast: `No ${kind} POIs found nearby. Try a larger area.` });
          return;
        }

        // EXACT measuring:
        // d_seeker = dist(seeker, nearestX(seeker))
        // CLOSER  => keep points with distToNearestX < d_seeker - eps  (equivalent to inside union-of-circles radius d_seeker-eps)
        // FARTHER => keep points with distToNearestX > d_seeker + eps  (equivalent to outside union-of-circles radius d_seeker+eps)
        const seekerNearest = nearestPoiForPoint(seeker, pois);
        if (!seekerNearest) {
          set({ lastToast: `No ${kind} POIs found near seeker.` });
          return;
        }

        const epsM = 25;
        const thresholdM = answer === "CLOSER" ? seekerNearest.meters - epsM : seekerNearest.meters + epsM;
        const thresholdKm = Math.max(0, thresholdM) / 1000;

        const bufferFeature = buildBufferFromPoints(pois, thresholdKm);
        const nextFeature = applyPoiWithin(candidateFeature, bufferFeature, answer === "CLOSER");

        if (!nextFeature) {
          set({
            candidate: null,
            lastToast: "No possible area remains.",
            undoStack: [...get().undoStack, candidate],
            redoStack: [],
            history: [
              ...get().history,
              { id: uid(), ts: Date.now(), type: "MEASURING", kind, answer, poiCount: pois.length, sampleCount: 0, keptCount: 0 }
            ]
          });
          return;
        }

        set({
          candidate: nextFeature.geometry,
          lastToast: `Measuring ${kind} ${answer}: threshold ~${Math.round(thresholdM)}m (${thresholdKm.toFixed(2)}km), ${pois.length} POIs`,
          undoStack: [...get().undoStack, candidate],
          redoStack: [],
          history: [
            ...get().history,
            { id: uid(), ts: Date.now(), type: "MEASURING", kind, answer, poiCount: pois.length, sampleCount: 0, keptCount: 0 }
          ]
        });
      } catch (error) {
        console.error("Measuring error:", error);
        set({ lastToast: error instanceof Error ? error.message : "Measuring operation failed" });
      }
    },

    undo: () => {
      const stack = get().undoStack;
      if (stack.length === 0) return;
      const prev = stack[stack.length - 1];
      const curr = get().candidate;
      set({
        candidate: prev,
        undoStack: stack.slice(0, -1),
        redoStack: curr ? [...get().redoStack, curr] : get().redoStack
      });
    },

    redo: () => {
      const stack = get().redoStack;
      if (stack.length === 0) return;
      const next = stack[stack.length - 1];
      const curr = get().candidate;
      set({
        candidate: next,
        redoStack: stack.slice(0, -1),
        undoStack: curr ? [...get().undoStack, curr] : get().undoStack
      });
    },

    resetCandidateToCountry: () => {
      // Stop GPS tracking when resetting
      get().stopGPSTracking();
      set({
        candidate: null,
        undoStack: [],
        redoStack: [],
        thermoStart: null,
        thermoEnd: null
      });
    },

    setSearchQuery: (q: string) => {
      set({ searchQuery: q });
    },

    setLastToast: (toast: string | null) => {
      set({ lastToast: toast });
    },

    runSearch: async () => {
      const query = get().searchQuery.trim();
      if (!query) {
        set({ searchResults: [] });
        return;
      }

      try {
        const results = await geocode(query);
        set({ searchResults: results });
      } catch (error) {
        console.error("Search error:", error);
        set({ searchResults: [] });
        throw error;
      }
    },

    selectSearchResult: (result: SearchResult) => {
      const geometry = normalizeGeometry(result);
      
      set({
        candidate: geometry,
        undoStack: [],
        redoStack: [],
        thermoStart: null,
        thermoEnd: null,
        selectedAreaLabel: result.display_name,
        history: [
          ...get().history,
          { id: uid(), ts: Date.now(), type: "SET_AREA", label: result.display_name }
        ]
      });
    },

    applyPoiWithin: async (kind: PoiKind, radiusMiles: number, answer: "YES" | "NO") => {
      const candidate = get().candidate;
      if (!candidate) {
        set({ lastToast: "No area selected. Select an area first." });
        return;
      }

      // Convert miles to km
      const radiusKm = radiusMiles * 1.60934;

      try {
        // Compute candidate bbox and expand by radius
        const candidateFeature: Feature<AnyPoly> = {
          type: "Feature",
          geometry: candidate,
          properties: {}
        };
        const bbox = turfBbox(candidateFeature) as [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
        const expandedBbox = expandBbox([bbox[1], bbox[0], bbox[3], bbox[2]], radiusKm); // Convert to [south, west, north, east]

        // Fetch POIs
        const points = await fetchPois(kind, expandedBbox);

        if (points.length === 0) {
          if (answer === "YES") {
            // YES but no POIs found = impossible
            set({
              candidate: null,
              lastToast: `No ${kind}s found. YES makes area impossible.`,
              undoStack: [...get().undoStack, candidate],
              redoStack: [],
              history: [
                ...get().history,
                { id: uid(), ts: Date.now(), type: "POI_WITHIN", kind, radiusMiles, answer, poiCount: 0 }
              ]
            });
          } else {
            // NO and no POIs = no change
            set({
              lastToast: `No ${kind}s found. Area unchanged.`,
              history: [
                ...get().history,
                { id: uid(), ts: Date.now(), type: "POI_WITHIN", kind, radiusMiles, answer, poiCount: 0 }
              ]
            });
          }
          return;
        }

        // Build buffer from points
        const bufferFeature = buildBufferFromPoints(points, radiusKm);

        // Apply constraint
        const next = applyPoiWithin(candidateFeature, bufferFeature, answer === "YES");

        if (!next) {
          set({
            candidate: null,
            lastToast: "No possible area remains.",
            undoStack: [...get().undoStack, candidate],
            redoStack: [],
            history: [
              ...get().history,
              { id: uid(), ts: Date.now(), type: "POI_WITHIN", kind, radiusMiles, answer, poiCount: points.length }
            ]
          });
        } else {
          set({
            candidate: next.geometry,
            lastToast: `${kind}: ${points.length} found in search area`,
            undoStack: [...get().undoStack, candidate],
            redoStack: [],
            history: [
              ...get().history,
              { id: uid(), ts: Date.now(), type: "POI_WITHIN", kind, radiusMiles, answer, poiCount: points.length }
            ]
          });
        }
      } catch (error) {
        console.error("POI within error:", error);
        set({
          lastToast: error instanceof Error ? error.message : "POI operation failed"
        });
      }
    }
  };
});
