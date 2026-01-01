import React from "react";
import { useStore } from "../state/store";

function fmt(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function History() {
  const history = useStore(s => s.history);

  return (
    <div className="history-panel">
      <strong>History</strong>
      <div className="history-list">
        {history.length === 0 && <small className="muted">No actions yet.</small>}
        {history.slice().reverse().map((h) => {
          switch (h.type) {
            case "SET_COUNTRY":
              return (
                <div key={h.id} className="history-item">
                  <div className="history-timestamp">{fmt(h.ts)}</div>
                  <div className="history-action">
                    <span className="history-action-label">Area:</span> {h.name ?? h.isoA2} ({h.isoA2})
                  </div>
                </div>
              );
            case "SET_AREA":
              return (
                <div key={h.id} className="history-item">
                  <div className="history-timestamp">{fmt(h.ts)}</div>
                  <div className="history-action">
                    <span className="history-action-label">Area:</span> {h.label}
                  </div>
                </div>
              );
            case "POI_WITHIN":
              return (
                <div key={h.id} className="history-item">
                  <div className="history-timestamp">{fmt(h.ts)}</div>
                  <div className="history-action">
                    <span className="history-action-label">POI:</span> {h.kind} {h.radiusMiles} mi {h.answer} ({h.poiCount} found)
                  </div>
                </div>
              );
            case "RADAR":
              return (
                <div key={h.id} className="history-item">
                  <div className="history-timestamp">{fmt(h.ts)}</div>
                  <div className="history-action">
                    <span className="history-action-label">Radar:</span> {h.hit ? "Hit" : "Miss"} {h.radiusMiles} mi
                  </div>
                </div>
              );
            case "THERMOMETER":
              return (
                <div key={h.id} className="history-item">
                  <div className="history-timestamp">{fmt(h.ts)}</div>
                  <div className="history-action">
                    <span className="history-action-label">Thermometer:</span> {h.hotter ? "Hotter" : "Colder"}
                  </div>
                </div>
              );
            case "MATCHING":
              return (
                <div key={h.id} className="history-item">
                  <div className="history-timestamp">{fmt(h.ts)}</div>
                  <div className="history-action">
                    <span className="history-action-label">Matching:</span> {h.kind} {h.answer} ({h.keptCount}/{h.sampleCount} samples, {h.poiCount} POIs)
                  </div>
                </div>
              );
            case "MEASURING":
              return (
                <div key={h.id} className="history-item">
                  <div className="history-timestamp">{fmt(h.ts)}</div>
                  <div className="history-action">
                    <span className="history-action-label">Measuring:</span> {h.kind} {h.answer} ({h.keptCount}/{h.sampleCount} samples, {h.poiCount} POIs)
                  </div>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
