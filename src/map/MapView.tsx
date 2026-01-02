import React, { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { bbox as turfBbox, simplify as turfSimplify } from "@turf/turf";
import type { Polygon, MultiPolygon } from "geojson";

import { useStore } from "../state/store";

type AnyPoly = Polygon | MultiPolygon;

function featureCollectionFromGeom(geom: AnyPoly | null) {
  return {
    type: "FeatureCollection",
    features: geom ? [{ type: "Feature", properties: {}, geometry: geom }] : []
  } as any;
}

const SOURCE_ID = "candidate";
const LAYER_FILL_ID = "candidate-fill";
const LAYER_OUTLINE_ID = "candidate-outline";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const seekerMarkerRef = useRef<maplibregl.Marker | null>(null);

  const candidate = useStore(s => s.candidate) as AnyPoly | null;
  const seeker = useStore(s => s.seekerLngLat);

  // Display-only simplification: never use this for computation/state.
  // Tolerance is in degrees. 0.0005° ≈ 55m at the equator.
  const displayCandidate = useMemo(() => {
    if (!candidate) return null;
    try {
      const f = { type: "Feature", properties: {}, geometry: candidate } as any;
      const simplified = turfSimplify(f, { tolerance: 0.0005, highQuality: true }) as any;
      const g = simplified?.geometry;
      if (g && (g.type === "Polygon" || g.type === "MultiPolygon")) return g as AnyPoly;
      return candidate;
    } catch {
      return candidate;
    }
  }, [candidate]);

  const candidateFC = useMemo(() => featureCollectionFromGeom(displayCandidate), [displayCandidate]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const apiKey = import.meta.env.VITE_MAPTILER_KEY;
    if (!apiKey) {
      console.error("VITE_MAPTILER_KEY is not set");
      return;
    }

    const styleUrl = `https://api.maptiler.com/maps/019b76bc-7266-7a42-84d1-d51d31d02477/style.json?key=${apiKey}`;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [0, 20],
      zoom: 2
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    
    // Add attribution control for MapTiler (style already includes attribution, but this ensures visibility)
    map.addControl(new maplibregl.AttributionControl({
      compact: false
    }), "bottom-right");
    
    mapRef.current = map;

    map.on("load", () => {
      // Add candidate source
      map.addSource(SOURCE_ID, { type: "geojson", data: candidateFC });

      // Add candidate fill layer
      map.addLayer({
        id: LAYER_FILL_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-opacity": 0.35,
          "fill-color": "#000000"
        }
      });

      // Add candidate outline layer
      map.addLayer({
        id: LAYER_OUTLINE_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-width": 2,
          "line-color": "#000000"
        }
      });

      // Resize map after load to ensure proper rendering
      requestAnimationFrame(() => {
        map.resize();
      });
    });

    // Resize map after mount
    requestAnimationFrame(() => {
      map.resize();
    });

    // Handle window resize
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        map.resize();
      }, 100);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      seekerMarkerRef.current?.remove();
      seekerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update candidate polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(candidateFC);

    if (candidate) {
      const bb = turfBbox(candidate as any);
      map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 40, duration: 450 });
    }
  }, [candidateFC, candidate]);

  // Update seeker marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    seekerMarkerRef.current?.remove();
    seekerMarkerRef.current = null;

    if (!seeker) return;

    const m = new maplibregl.Marker().setLngLat(seeker).addTo(map);
    seekerMarkerRef.current = m;
  }, [seeker]);

  return <div className="mapRoot" ref={containerRef} />;
}
