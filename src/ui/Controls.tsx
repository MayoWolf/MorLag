import React, { useEffect } from "react";
import { useStore } from "../state/store";

export default function Controls() {
  const candidate = useStore(s => s.candidate);
  const seeker = useStore(s => s.seekerLngLat);
  const acc = useStore(s => s.seekerAccuracyM);
  const lastUpdatedMs = useStore(s => s.seekerLastUpdatedMs);
  const isTrackingGPS = useStore(s => s.isTrackingGPS);
  const updateSeeker = useStore(s => s.updateSeekerFromGPS);
  const startTracking = useStore(s => s.startGPSTracking);
  const stopTracking = useStore(s => s.stopGPSTracking);

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
      <section className="panel">
        <div className="panelHeader search">SEARCH AREA</div>
        <div className="panelBody">
          {!candidate && (
            <div style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
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
            <button className="btn" onClick={handleSearch}>Search</button>
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
      </section>

      {/* SEEKER GPS */}
      <section className="panel">
        <div className="panelHeader seeker">SEEKER GPS</div>
        <div className="panelBody">
          <div className="row">
            <button
              className="btn primary"
              onClick={() => updateSeeker().catch(err => alert(err?.message ?? String(err)))}
            >
              Use GPS
            </button>
            <button
              className="btn"
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
            <button className="btn" onClick={reset}>Reset Area</button>
            <button className="btn" onClick={undo}>Undo</button>
            <button className="btn" onClick={redo}>Redo</button>
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
      </section>

    </>
  );
}
