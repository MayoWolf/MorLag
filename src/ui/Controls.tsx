import React, { useEffect, useState } from "react";
import { useStore } from "../state/store";
import PoiMenu from "./PoiMenu";
import { testOverpass } from "../services/overpass";

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
  const applyPoiWithin = useStore(s => s.applyPoiWithin);

  const [selectedPoiKind, setSelectedPoiKind] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [isTestingOverpass, setIsTestingOverpass] = useState(false);
  const [overpassTestResult, setOverpassTestResult] = useState<{ message: string; error?: boolean } | null>(null);

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

  const handleTestOverpass = async () => {
    if (!selectedPoiKind) return;
    
    setIsTestingOverpass(true);
    setOverpassTestResult(null);
    
    try {
      // Map UI label to kind string
      const kindMap: Record<string, string> = {
        "zoo": "zoo",
        "hospital": "hospital",
        "museum": "museum",
        "airport": "airport",
        "library": "library",
        "park": "park",
        "trainstation": "trainstation"
      };
      const mappedKind = kindMap[selectedPoiKind];
      if (!mappedKind) {
        throw new Error(`Unknown kind: ${selectedPoiKind}`);
      }
      
      const result = await testOverpass(mappedKind);
      setOverpassTestResult({
        message: `Fetched ${result.count} POIs`,
        error: false
      });
    } catch (err) {
      setOverpassTestResult({
        message: err instanceof Error ? err.message : String(err),
        error: true
      });
    } finally {
      setIsTestingOverpass(false);
    }
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

      {/* RADAR */}
      <section className="panel">
        <div className="panelHeader radar">RADAR</div>
        <div className="panelBody">
          <div className="section-label">Hit</div>
          <div className="tileGrid">
            {RADII.map((r) => (
              <button
                key={`hit-${r}`}
                className="tileBtn orange"
                onClick={() => applyRadar(r, true)}
                disabled={!seeker || !candidate}
              >
                {r} mi
              </button>
            ))}
          </div>
          <div className="section-label">Miss</div>
          <div className="tileGrid">
            {RADII.map((r) => (
              <button
                key={`miss-${r}`}
                className="tileBtn orange"
                onClick={() => applyRadar(r, false)}
                disabled={!seeker || !candidate}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* THERMOMETER */}
      <section className="panel">
        <div className="panelHeader thermometer">THERMOMETER</div>
        <div className="panelBody">
          <div className="tileGrid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <button
              className="tileBtn"
              onClick={setStart}
              disabled={!seeker || !candidate}
            >
              Set Start
            </button>
            <button
              className="tileBtn"
              onClick={setEnd}
              disabled={!seeker || !candidate}
            >
              Set End
            </button>
          </div>
          {(thermoStart || thermoEnd) && (
            <div className="coords-display">
              {thermoStart ? `Start: ${thermoStart[0].toFixed(4)}, ${thermoStart[1].toFixed(4)}` : "Start: not set"}
              <br />
              {thermoEnd ? `End: ${thermoEnd[0].toFixed(4)}, ${thermoEnd[1].toFixed(4)}` : "End: not set"}
            </div>
          )}
          <div className="tileGrid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <button
              className="tileBtn yellow large"
              onClick={() => applyThermo(true)}
              disabled={!candidate || !thermoStart || !thermoEnd}
            >
              Hotter
            </button>
            <button
              className="tileBtn yellow large"
              onClick={() => applyThermo(false)}
              disabled={!candidate || !thermoStart || !thermoEnd}
            >
              Colder
            </button>
          </div>
        </div>
      </section>

      {/* POI (Overpass) - Debug Section */}
      <section className="panel">
        <div className="panelHeader poi">POI (Overpass)</div>
        <div className="panelBody">
          {import.meta.env.DEV && (
            <div style={{ 
              padding: "8px", 
              background: "#fff3cd", 
              border: "1px solid #ffc107",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#856404"
            }}>
              Run <code>npx netlify dev</code> to enable functions locally.
            </div>
          )}
          <div className="section-label">Kind</div>
          <div className="tileGrid poi-grid">
            {["Zoo", "Hospital", "Museum", "Airport", "Library", "Park", "Train Station"].map((label) => {
              const kindKey = label.toLowerCase().replace(" ", "");
              return (
                <button
                  key={label}
                  className={`tileBtn ${selectedPoiKind === kindKey ? "selected" : ""}`}
                  onClick={() => setSelectedPoiKind(kindKey)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {selectedPoiKind && (
            <>
              <div className="section-label">Radius</div>
              <div className="tileGrid">
                {[1, 3, 5, 10].map((r) => (
                  <button
                    key={r}
                    className={`tileBtn ${selectedRadius === r ? "selected" : ""}`}
                    onClick={() => setSelectedRadius(r)}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
              <div className="tileGrid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <button
                  className="tileBtn yellow large"
                  onClick={() => {
                    if (selectedPoiKind) {
                      const kindMap: Record<string, string> = {
                        "zoo": "zoo",
                        "hospital": "hospital",
                        "museum": "museum",
                        "airport": "airport",
                        "library": "library",
                        "park": "park",
                        "trainstation": "trainstation"
                      };
                      const mappedKind = kindMap[selectedPoiKind];
                      if (mappedKind) {
                        applyPoiWithin(mappedKind as any, selectedRadius, "YES").catch(err => {
                          alert(err instanceof Error ? err.message : String(err));
                        });
                      }
                    }
                  }}
                  disabled={!candidate}
                >
                  YES
                </button>
                <button
                  className="tileBtn yellow large"
                  onClick={() => {
                    if (selectedPoiKind) {
                      const kindMap: Record<string, string> = {
                        "zoo": "zoo",
                        "hospital": "hospital",
                        "museum": "museum",
                        "airport": "airport",
                        "library": "library",
                        "park": "park",
                        "trainstation": "trainstation"
                      };
                      const mappedKind = kindMap[selectedPoiKind];
                      if (mappedKind) {
                        applyPoiWithin(mappedKind as any, selectedRadius, "NO").catch(err => {
                          alert(err instanceof Error ? err.message : String(err));
                        });
                      }
                    }
                  }}
                  disabled={!candidate}
                >
                  NO
                </button>
              </div>
            </>
          )}
          <div style={{ paddingTop: "10px", borderTop: "1px solid rgba(0,0,0,0.12)" }}>
            <button
              className="tileBtn"
              onClick={handleTestOverpass}
              disabled={!selectedPoiKind || isTestingOverpass}
            >
              {isTestingOverpass ? "Testing..." : "Test Overpass"}
            </button>
            {overpassTestResult && (
              <div className={overpassTestResult.error ? "errorBox" : ""} style={{
                marginTop: "8px",
                background: overpassTestResult.error ? "rgba(220,0,0,0.08)" : "#e8f5e9",
                border: overpassTestResult.error ? "1px solid rgba(220,0,0,0.35)" : "1px solid #4caf50",
                color: overpassTestResult.error ? "#c62828" : "#2e7d32"
              }}>
                {overpassTestResult.error ? (
                  <><strong>Error:</strong> {overpassTestResult.message}</>
                ) : (
                  <><strong>Success:</strong> {overpassTestResult.message}</>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <PoiMenu />
    </>
  );
}
