import React from "react";
import { useStore } from "../state/store";

const RADII = [0.5, 1, 3, 5, 10, 25, 50, 100];

export default function Controls() {
  const countries = useStore(s => s.countries);
  const selectedIsoA2 = useStore(s => s.selectedIsoA2);
  const setCountry = useStore(s => s.setCountry);

  const seeker = useStore(s => s.seekerLngLat);
  const acc = useStore(s => s.seekerAccuracyM);
  const updateSeeker = useStore(s => s.updateSeekerFromGPS);

  const thermoStart = useStore(s => s.thermoStart);
  const thermoEnd = useStore(s => s.thermoEnd);
  const setStart = useStore(s => s.setThermoStartNow);
  const setEnd = useStore(s => s.setThermoEndNow);

  const applyRadar = useStore(s => s.applyRadarNow);
  const applyThermo = useStore(s => s.applyThermo);

  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const reset = useStore(s => s.resetCandidateToCountry);

  const searchQuery = useStore(s => s.searchQuery);
  const searchResults = useStore(s => s.searchResults);
  const setSearchQuery = useStore(s => s.setSearchQuery);
  const runSearch = useStore(s => s.runSearch);
  const selectSearchResult = useStore(s => s.selectSearchResult);

  const handleSearch = async () => {
    try {
      await runSearch();
    } catch (err) {
      alert(String(err instanceof Error ? err.message : err));
    }
  };

  const truncateName = (name: string, maxLength: number = 50) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + "...";
  };

  return (
    <>
      <div className="card">
        <div className="row">
          <strong>Search area</strong>
        </div>
        <div className="row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="e.g., Los Angeles, California, Europe"
            style={{ flex: 1, marginRight: "8px", padding: "6px" }}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        {searchResults.length > 0 && (
          <div className="row" style={{ marginTop: "8px", maxHeight: "200px", overflowY: "auto" }}>
            <div style={{ width: "100%" }}>
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSearchResult(result)}
                  style={{
                    padding: "8px",
                    marginBottom: "4px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: "#f9f9f9"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f0f0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9f9f9";
                  }}
                >
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                    {truncateName(result.display_name)}
                  </div>
                  <div style={{ fontSize: "0.85em", color: "#666" }}>
                    {result.class && result.type && `${result.class}/${result.type}`}
                    {result.address?.country && (
                      <span>
                        {result.class && result.type ? " • " : ""}
                        {result.address.country}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="row">
          <strong>Country</strong>
        </div>
        <div className="row">
          <select value={selectedIsoA2} onChange={(e) => setCountry(e.target.value)}>
            {countries.map((c) => {
              const iso = (c.properties?.iso_a2 ?? "").toUpperCase();
              const name = c.properties?.name ?? iso;
              return (
                <option key={iso} value={iso}>
                  {name} ({iso})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <strong>Seeker GPS</strong>
        </div>
        <div className="row">
          <button
            className="primary"
            onClick={() => updateSeeker().catch(err => alert(err?.message ?? String(err)))}
          >
            Use GPS
          </button>
          <button onClick={reset}>Reset Area</button>
          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>
        </div>
        <div className="row">
          <small className="muted">
            {seeker ? `LngLat: ${seeker[0].toFixed(5)}, ${seeker[1].toFixed(5)}` : "No seeker position yet."}
            {acc ? ` • ±${Math.round(acc)}m` : ""}
          </small>
        </div>
      </div>

      <div className="card">
        <strong>Radar</strong>
        <div className="hr" />
        <div className="row">
          {RADII.map((r) => (
            <button key={`hit-${r}`} onClick={() => applyRadar(r, true)} disabled={!seeker}>
              Hit {r} mi
            </button>
          ))}
        </div>
        <div className="row">
          {RADII.map((r) => (
            <button key={`miss-${r}`} onClick={() => applyRadar(r, false)} disabled={!seeker}>
              Miss {r} mi
            </button>
          ))}
        </div>
        <small className="muted">Requires seeker GPS.</small>
      </div>

      <div className="card">
        <strong>Thermometer</strong>
        <div className="hr" />
        <div className="row">
          <button onClick={setStart} disabled={!seeker}>Set Start</button>
          <button onClick={setEnd} disabled={!seeker}>Set End</button>
        </div>
        <small className="muted">
          Start: {thermoStart ? `${thermoStart[0].toFixed(4)}, ${thermoStart[1].toFixed(4)}` : "not set"}
          <br />
          End: {thermoEnd ? `${thermoEnd[0].toFixed(4)}, ${thermoEnd[1].toFixed(4)}` : "not set"}
        </small>
        <div className="hr" />
        <div className="row">
          <button className="primary" onClick={() => applyThermo(true)} disabled={!thermoStart || !thermoEnd}>
            Hotter
          </button>
          <button className="primary" onClick={() => applyThermo(false)} disabled={!thermoStart || !thermoEnd}>
            Colder
          </button>
        </div>
        <small className="muted">
          Uses a Voronoi split between Start and End, then keeps the correct half.
        </small>
      </div>
    </>
  );
}
