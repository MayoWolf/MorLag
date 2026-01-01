export type OsmKind =
  // Existing POI kinds (keep for compatibility)
  | "zoo"
  | "hospital"
  | "museum"
  | "library"
  | "university"
  | "school"
  | "police"
  | "firestation"
  | "courthouse"
  | "townhall"
  | "embassy"
  | "park"
  | "stadium"
  | "themepark"
  | "castle"
  | "peak"
  | "airport"
  | "trainstation"
  | "ferry"
  // New kinds for MATCHING/MEASURING
  | "metro_station"
  | "government"
  | "ferry_terminal"
  | "fire_station"
  | "highway_access"
  | "park_national"
  | "castle_fort";

export type OverpassClause = {
  key: string;
  value: string;
};

/**
 * Single source of truth for OSM kind → Overpass tag clauses.
 * Each clause becomes node/way/relation query parts.
 */
export const OSM_KIND_CLAUSES: Record<OsmKind, OverpassClause[]> = {
  zoo: [{ key: "tourism", value: "zoo" }],
  hospital: [{ key: "amenity", value: "hospital" }],
  museum: [{ key: "tourism", value: "museum" }],
  library: [{ key: "amenity", value: "library" }],
  university: [{ key: "amenity", value: "university" }],
  school: [{ key: "amenity", value: "school" }],
  police: [{ key: "amenity", value: "police" }],

  // Compatibility alias
  firestation: [{ key: "amenity", value: "fire_station" }],
  courthouse: [{ key: "amenity", value: "courthouse" }],
  townhall: [{ key: "amenity", value: "townhall" }],

  // Embassy: handled specially (two tags), but keep a default
  embassy: [{ key: "embassy", value: "yes" }],

  // Park: leisure=park OR boundary=national_park
  park: [{ key: "leisure", value: "park" }, { key: "boundary", value: "national_park" }],
  // Keep for compatibility (same as park's second clause)
  park_national: [{ key: "boundary", value: "national_park" }],

  stadium: [{ key: "leisure", value: "stadium" }],
  themepark: [{ key: "tourism", value: "theme_park" }],

  // Castle: historic=castle OR historic=fort
  castle: [{ key: "historic", value: "castle" }, { key: "historic", value: "fort" }],
  // Keep for compatibility
  castle_fort: [{ key: "historic", value: "fort" }],

  peak: [{ key: "natural", value: "peak" }],

  airport: [{ key: "aeroway", value: "aerodrome" }],
  trainstation: [{ key: "railway", value: "station" }],

  // Ferry terminal
  ferry: [{ key: "amenity", value: "ferry_terminal" }],
  ferry_terminal: [
    { key: "amenity", value: "ferry_terminal" },
    { key: "man_made", value: "pier" }
  ],

  // Metro/subway best-effort: entrances + subway stations
  metro_station: [
    { key: "railway", value: "subway_entrance" },
    { key: "station", value: "subway" }
  ],

  // Government buildings
  government: [
    { key: "amenity", value: "townhall" },
    { key: "amenity", value: "courthouse" },
    { key: "office", value: "government" }
  ],

  // Alternative naming for fire station
  fire_station: [{ key: "amenity", value: "fire_station" }],

  // Highway access: motorway junctions
  highway_access: [{ key: "highway", value: "motorway_junction" }]
};

export function isOsmKind(x: string): x is OsmKind {
  return Object.prototype.hasOwnProperty.call(OSM_KIND_CLAUSES, x);
}


