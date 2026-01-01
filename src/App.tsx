import React from "react";
import MapView from "./map/MapView";
import Controls from "./ui/Controls";
import History from "./ui/History";

export default function App() {
  return (
    <div className="app">
      <div className="sidebar">
        <h1>MorLag</h1>

        <Controls />
        <History />
      </div>

      <MapView />
    </div>
  );
}