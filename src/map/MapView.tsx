import React, { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { bbox as turfBbox } from "@turf/turf";
import type { Polygon, MultiPolygon } from "geojson";

import { useStore } from "../state/store";
import { LAYERS, SOURCES } from "./layers";

type AnyPoly = Polygon | MultiPolygon;

function featureCollectionFromGeom(geom: AnyPoly | null) {
  return {
    type: "FeatureCollection",
    features: geom ? [{ type: "Feature", properties: {}, geometry: geom }] : []
  } as any;
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const seekerMarkerRef = useRef<maplibregl.Marker | null>(null);

  const candidate = useStore(s => s.candidate) as AnyPoly | null;
  const seeker = useStore(s => s.seekerLngLat);

  const candidateFC = useMemo(() => featureCollectionFromGeom(candidate), [candidate]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 20],
      zoom: 2
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(SOURCES.candidate, { type: "geojson", data: candidateFC });

      map.addLayer({
        id: LAYERS.candidateFill,
        type: "fill",
        source: SOURCES.candidate,
        paint: { "fill-opacity": 0.35 }
      });

      map.addLayer({
        id: LAYERS.candidateOutline,
        type: "line",
        source: SOURCES.candidate,
        paint: { "line-width": 2 }
      });

      if (candidate) {
        const bb = turfBbox(candidate as any);
        map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 40, duration: 0 });
      }
    });

    return () => {
      seekerMarkerRef.current?.remove();
      seekerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SOURCES.candidate) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(candidateFC);

    if (candidate) {
      const bb = turfBbox(candidate as any);
      map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 40, duration: 450 });
    }
  }, [candidateFC, candidate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    seekerMarkerRef.current?.remove();
    seekerMarkerRef.current = null;

    if (!seeker) return;

    const m = new maplibregl.Marker().setLngLat(seeker).addTo(map);
    seekerMarkerRef.current = m;
  }, [seeker]);

  return <div className="map" ref={containerRef} />;
}
