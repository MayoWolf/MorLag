# MorLag

MorLag is a simple, open-source map helper for hide-and-seek deduction games.
You still text answers manually (iMessage or anything). MorLag just visualizes the remaining possible area.

## Features (v0.1)
- GPS-only seeker location
- Any country (from a countries GeoJSON)
- Radar constraints (hit/miss)
- Thermometer constraints (hotter/colder) using Voronoi split
- History log + undo/redo
- Netlify-ready

## Quickstart
```bash
npm install
npm run dev
```

## GPS notes
Browser geolocation usually requires HTTPS. Netlify provides HTTPS automatically.

## Countries data
This repo ships with `src/data/countries.sample.geojson` so it runs immediately.
Replace it with a full world countries GeoJSON that includes:
- `properties.iso_a2`
- `properties.name`
- polygon or multipolygon geometries

Then update the import in `src/state/store.ts` to your file name if needed.

## Deploy to Netlify
- Push to GitHub
- Create a Netlify site from the repo
- Build command: `npm run build`
- Publish directory: `dist`

## License
MIT
