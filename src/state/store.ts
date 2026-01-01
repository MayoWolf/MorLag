import { create } from "zustand";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

import countriesSample from "../data/countries.sample.geojson";
import { applyRadar } from "../geo/radar";
import { applyThermometer } from "../geo/thermometer";
import { geocode, normalizeGeometry, type SearchResult } from "../services/geocode";

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
      type: "SET_COUNTRY";
      isoA2: string;
      name?: string;
    }
  | {
      id: string;
      ts: number;
      type: "SET_AREA";
      label: string;
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

  setCountry: (isoA2: string) => void;
  updateSeekerFromGPS: () => Promise<void>;
  startGPSTracking: () => void;
  stopGPSTracking: () => void;

  setThermoStartNow: () => void;
  setThermoEndNow: () => void;

  applyRadarNow: (radiusMiles: number, hit: boolean) => void;
  applyThermo: (hotter: boolean) => void;

  undo: () => void;
  redo: () => void;
  resetCandidateToCountry: () => void;

  setSearchQuery: (q: string) => void;
  runSearch: () => Promise<void>;
  selectSearchResult: (result: SearchResult) => void;
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
    }
  };
});
