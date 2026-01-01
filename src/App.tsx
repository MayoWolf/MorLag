import React from "react";
import MapView from "./map/MapView";
import Controls from "./ui/Controls";
import History from "./ui/History";

export default function App() {
  return (
    <div className="app">
      <div className="sidebar">
        <div className="header-band">
          <div className="brand">MorLag</div>
          QUESTION MENU
        </div>
        <div className="content-area">
          <Controls />
          <History />
        </div>
      </div>

      <MapView />
    </div>
  );
}