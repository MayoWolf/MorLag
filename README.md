# MorLag

MorLag is an unofficial map helper for playing **Jet Lag: The Game Hide + Seek** with friends.

It does not replace the physical game, investigation book, cards, rules, or player communication. You still ask questions, receive answers, and text manually. MorLag’s job is narrower and practical: visualize the area where the hider could still be, then shrink that possible area as the seekers get answers.

## What It Is For

Jet Lag: The Game's Hide + Seek is a real-world public-transit deduction game. The official game is sold as a 2-4 player transit game with 80 questions and more than 100 cards, playable across places ranging from towns to whole countries. The question system includes categories such as Matching, Measuring, Radar, Thermometer, Tentacles, and Photos.

MorLag helps with the map-heavy parts of that deduction:

- choosing an initial search area
- tracking the seekers' GPS position
- applying radar hit/miss answers
- applying thermometer hotter/colder answers
- applying matching and measuring questions against map features
- applying tentacles-style POI radius checks
- undoing and redoing area changes
- keeping a readable action history

MorLag is not affiliated with Jet Lag: The Game, Nebula, or Wendover Productions.

## Gameplay Model

The app has one central idea: the **candidate area**.

The candidate area is a GeoJSON `Polygon` or `MultiPolygon` representing every place where the hider could still plausibly be. Each question transforms that geometry:

- **Radar hit** keeps only the part of the candidate area inside a circle around the seekers.
- **Radar miss** removes that circle from the candidate area.
- **Thermometer hotter** keeps the area closer to the seekers' new position than their old position.
- **Thermometer colder** keeps the area closer to the seekers' old position than their new position.
- **Tentacles / POI YES** keeps areas within a chosen radius of a feature type.
- **Tentacles / POI NO** removes areas within that radius.
- **Matching YES** keeps the Voronoi cell for the same nearest feature as the seekers.
- **Matching NO** removes that nearest-feature cell.
- **Measuring CLOSER** keeps areas closer to a feature type than the seekers are.
- **Measuring FARTHER** removes those closer areas and keeps the farther side.

This is a helper for deduction, not an oracle. OpenStreetMap data can be incomplete, geocoding can be imperfect, and some real game answers involve judgment that no map tool can fully automate.

## Features

- MapLibre map display
- MapTiler basemap support
- searchable areas through geocoding
- browser GPS and live GPS tracking
- candidate-area polygon rendering
- history log
- undo and redo
- quick search with `Cmd+K` / `Ctrl+K`
- Netlify functions for geocoding and Overpass POI lookup
- client and server caching for expensive POI searches
- Netlify-ready deployment

## Question Support

### Radar

Radar questions are handled in `src/geo/radar.ts`.

MorLag creates a Turf circle around the seekers' current GPS position. A hit intersects the candidate area with the circle. A miss subtracts the circle.

### Thermometer

Thermometer questions are handled in `src/geo/thermometer.ts`.

The seekers save a start GPS point, move, save an end GPS point, then ask whether they are hotter or colder. MorLag creates a two-point Voronoi split:

- hotter keeps the cell closer to the end point
- colder keeps the cell closer to the start point

### Matching

Matching questions are handled through `src/geo/matchingVoronoi.ts`.

MorLag fetches OpenStreetMap points of interest for the selected feature type, finds the seekers' nearest feature, builds Voronoi cells for the nearby features, then keeps or removes the cell associated with the seekers' nearest feature.

Admin matching is approximate. It samples points inside the candidate area and reverse-geocodes them to estimate whether they match the seekers' administrative region.

### Measuring

Measuring questions are orchestrated in `src/state/store.ts` using helpers from `src/geo/poiWithin.ts`.

MorLag finds the seekers' nearest feature of the chosen kind, calculates that distance, builds a union of buffers around all nearby features at that threshold distance, then keeps the closer or farther side.

### Tentacles / POI Radius

Tentacles-style checks are handled through `src/geo/poiWithin.ts`.

MorLag fetches POIs in and around the current candidate area, buffers them by the selected radius, unions those buffers, then intersects or subtracts that buffer from the candidate area.

## Project Structure

```text
src/
  App.tsx                  Main app shell
  main.tsx                 React entry point
  styles.css               App styling

  state/
    store.ts               Zustand store and app orchestration

  map/
    MapView.tsx            MapLibre rendering and seeker marker

  ui/
    Controls.tsx           Search, GPS, reset, undo, redo
    JetLagMenu.tsx         Question menu
    QuickSearch.tsx        Keyboard search overlay
    History.tsx            Action history

  geo/
    clip.ts                Polygon intersection, difference, union
    radar.ts               Radar geometry
    thermometer.ts         Thermometer Voronoi split
    poiWithin.ts           POI buffers and radius filters
    matchingVoronoi.ts     Matching questions
    nearestPoi.ts          Nearest-feature lookup
    haversine.ts           Distance calculation
    sampling.ts            Coarse polygon sampling for admin matching

  services/
    geocode.ts             Client geocoding wrapper
    overpass.ts            Client POI lookup wrapper

  data/
    countries.sample.geojson

netlify/functions/
  geocode.ts               Nominatim/Photon geocoding proxy
  overpass.ts              Overpass API proxy

shared/
  osmKinds.ts              OSM feature kinds and tag mappings
```

## Tech Stack

- React 18
- TypeScript
- Vite
- Zustand
- MapLibre GL
- MapTiler
- Turf
- polygon-clipping
- Netlify Functions
- OpenStreetMap / Nominatim / Photon / Overpass

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env.local` file with your MapTiler key:

```bash
VITE_MAPTILER_KEY=your_key_here
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## GPS Notes

Browser geolocation generally requires HTTPS. Localhost works in most browsers during development, and Netlify provides HTTPS in production.

GPS accuracy matters. A weak GPS fix can make precise questions misleading, especially short radar distances and dense urban POI checks.

## Countries And Areas

The app ships with `src/data/countries.sample.geojson` so it can run immediately. For broader country selection, replace it with a fuller world countries GeoJSON that includes:

- `properties.iso_a2`
- `properties.name`
- polygon or multipolygon geometries

Search-based area selection can also use geocoder-provided polygons or bounding boxes.

## Deployment

This repo is ready for Netlify.

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

The redirect in `netlify.toml` sends all app routes to `index.html`.

## Limitations

- MorLag is only as good as the map data it can fetch.
- Overpass may time out or return sparse data in some areas.
- Water/coastline and transit-line approximations are best-effort OSM queries.
- Matching and measuring are mathematical approximations of real-world questions.
- Admin matching uses reverse geocoding samples, so boundaries can be fuzzy.
- The app does not manage cards, curses, scoring, hiding zones, or official rule enforcement.

## References

- Official store page: [Jet Lag: The Game Hide and Seek Transit Game](https://store.nebula.tv/products/jet-lag-the-game-hide-and-seek-transit-game)
- Official expansion reference rules: [Hide + Seek Expansion Pack Vol. 1 Rules](https://rules.jetlagthegame.com/expansion/)
- Community rules reference: [Jet Lag The Game: Hide and Seek](https://jetlag.denull.ru/en/rules/)
- Community question reference: [Hide + Seek questions](https://jetlag.denull.ru/en/rules/questions/)

## License

MIT

## Code Of Conduct

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.
