import React, { useEffect } from "react";
import { useStore } from "../state/store";
import PoiMenu from "./PoiMenu";

const RADII = [0.5, 1, 3, 5, 10, 25, 50, 100];

export default function Controls() {
  const candidate = useStore(s => s.candidate);
  const seeker = useStore(s => s.seekerLngLat);
  const acc = useStore(s => s.seekerAccuracyM);
  const lastUpdatedMs = useStore(s => s.seekerLastUpdatedMs);
  const isTrackingGPS = useStore(s => s.isTrackingGPS);
  const updateSeeker = useStore(s => s.updateSeekerFromGPS);
  const startTracking = useStore(s => s.startGPSTracking);
  const stopTracking = useStore(s => s.stopGPSTracking);

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
      {/* SEARCH AREA */}
      <div className="panel">
        <div className="panel-header search">SEARCH AREA</div>
        <div className="panel-content">
          {!candidate && (
            <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
              Select an area to begin
            </div>
          )}
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
            />
            <button onClick={handleSearch}>Search</button>
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="search-result-item"
                  onClick={() => selectSearchResult(result)}
                >
                  <div className="search-result-title">
                    {truncateName(result.display_name)}
                  </div>
                  <div className="search-result-meta">
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
          )}
        </div>
      </div>

      {/* SEEKER GPS */}
      <div className="panel">
        <div className="panel-header seeker">SEEKER GPS</div>
        <div className="panel-content">
          <div className="row">
            <button
              className="primary"
              onClick={() => updateSeeker().catch(err => alert(err?.message ?? String(err)))}
            >
              Use GPS
            </button>
            <button
              onClick={() => {
                if (isTrackingGPS) {
                  stopTracking();
                } else {
                  try {
                    startTracking();
                  } catch (err) {
                    alert(err instanceof Error ? err.message : String(err));
                  }
                }
              }}
            >
              {isTrackingGPS ? "Stop Tracking" : "Track GPS"}
            </button>
            <button onClick={reset}>Reset Area</button>
            <button onClick={undo}>Undo</button>
            <button onClick={redo}>Redo</button>
          </div>
          {seeker ? (
            <div className="coords-display">
              {seeker[0].toFixed(5)}, {seeker[1].toFixed(5)}
              {acc && ` • ±${Math.round(acc)}m`}
              {lastUpdatedMs && (
                <>
                  <br />
                  Last updated: {new Date(lastUpdatedMs).toLocaleTimeString()}
                </>
              )}
            </div>
          ) : (
            <div className="coords-display" style={{ color: "#999", fontStyle: "italic" }}>
              No seeker position yet.
            </div>
          )}
        </div>
      </div>

      {/* RADAR */}
      <div className="panel">
        <div className="panel-header radar">RADAR</div>
        <div className="panel-content">
          <div className="section-label">Hit</div>
          <div className="tile-grid">
            {RADII.map((r) => (
              <button
                key={`hit-${r}`}
                className="tile-button orange"
                onClick={() => applyRadar(r, true)}
                disabled={!seeker || !candidate}
              >
                {r} mi
              </button>
            ))}
          </div>
          <div className="section-label" style={{ marginTop: "12px" }}>Miss</div>
          <div className="tile-grid">
            {RADII.map((r) => (
              <button
                key={`miss-${r}`}
                className="tile-button orange"
                onClick={() => applyRadar(r, false)}
                disabled={!seeker || !candidate}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* THERMOMETER */}
      <div className="panel">
        <div className="panel-header thermometer">THERMOMETER</div>
        <div className="panel-content">
          <div className="tile-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <button
              className="tile-button"
              onClick={setStart}
              disabled={!seeker || !candidate}
            >
              Set Start
            </button>
            <button
              className="tile-button"
              onClick={setEnd}
              disabled={!seeker || !candidate}
            >
              Set End
            </button>
          </div>
          {(thermoStart || thermoEnd) && (
            <div className="coords-display" style={{ marginTop: "8px" }}>
              {thermoStart ? `Start: ${thermoStart[0].toFixed(4)}, ${thermoStart[1].toFixed(4)}` : "Start: not set"}
              <br />
              {thermoEnd ? `End: ${thermoEnd[0].toFixed(4)}, ${thermoEnd[1].toFixed(4)}` : "End: not set"}
            </div>
          )}
          <div className="tile-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: "12px" }}>
            <button
              className="tile-button yellow large"
              onClick={() => applyThermo(true)}
              disabled={!candidate || !thermoStart || !thermoEnd}
            >
              Hotter
            </button>
            <button
              className="tile-button yellow large"
              onClick={() => applyThermo(false)}
              disabled={!candidate || !thermoStart || !thermoEnd}
            >
              Colder
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
