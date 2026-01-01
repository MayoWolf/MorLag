import React from "react";
import { useStore } from "../state/store";

function fmt(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function History() {
  const history = useStore(s => s.history);

  return (
    <div className="card">
      <strong>History</strong>
      <div className="hr" />
      <div style={{ display: "grid", gap: 8 }}>
        {history.length === 0 && <small className="muted">No actions yet.</small>}
        {history.slice().reverse().map((h) => {
          if (h.type === "SET_COUNTRY") {
            return (
              <div key={h.id}>
                <small className="muted">{fmt(h.ts)}</small>
                <div>Country: {h.name ?? h.isoA2} ({h.isoA2})</div>
              </div>
            );
          }
          if (h.type === "SET_AREA") {
            return (
              <div key={h.id}>
                <small className="muted">{fmt(h.ts)}</small>
                <div>Area: {h.label}</div>
              </div>
            );
          }
          if (h.type === "RADAR") {
            return (
              <div key={h.id}>
                <small className="muted">{fmt(h.ts)}</small>
                <div>Radar: {h.hit ? "Hit" : "Miss"} {h.radiusMiles} mi</div>
              </div>
            );
          }
          return (
            <div key={h.id}>
              <small className="muted">{fmt(h.ts)}</small>
              <div>Thermometer: {h.hotter ? "Hotter" : "Colder"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
