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
          if (h.type === "SET_COUNTRY") {
            return (
              <div key={h.id} className="history-item">
                <div className="history-timestamp">{fmt(h.ts)}</div>
                <div className="history-action">
                  <span className="history-action-label">Area:</span> {h.name ?? h.isoA2} ({h.isoA2})
                </div>
              </div>
            );
          }
          if (h.type === "SET_AREA") {
            return (
              <div key={h.id} className="history-item">
                <div className="history-timestamp">{fmt(h.ts)}</div>
                <div className="history-action">
                  <span className="history-action-label">Area:</span> {h.label}
                </div>
              </div>
            );
          }
          if (h.type === "RADAR") {
            return (
              <div key={h.id} className="history-item">
                <div className="history-timestamp">{fmt(h.ts)}</div>
                <div className="history-action">
                  <span className="history-action-label">Radar:</span> {h.hit ? "Hit" : "Miss"} {h.radiusMiles} mi
                </div>
              </div>
            );
          }
          return (
            <div key={h.id} className="history-item">
              <div className="history-timestamp">{fmt(h.ts)}</div>
              <div className="history-action">
                <span className="history-action-label">Thermometer:</span> {h.hotter ? "Hotter" : "Colder"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
