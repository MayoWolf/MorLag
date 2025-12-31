import React from "react";
import MapView from "./map/MapView";
import Controls from "./ui/Controls";
import History from "./ui/History";

export default function App() {
  return (
    <div className="app">
      <div className="sidebar">
        <h1>MorLag</h1>
        <small className="muted">
          GPS-only seeker, manual iMessage answers, shaded possible area.
        </small>

        <Controls />
        <History />

        <div className="card">
          <strong>Next upgrades</strong>
          <div className="hr" />
          <small className="muted">
            Hatch fill pattern, export session JSON, save/load, Matching by region, Measuring, Photo prompts.
          </small>
        </div>
      </div>

      <MapView />
    </div>
  );
}
