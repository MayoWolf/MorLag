import React, { useState } from "react";
import { useStore } from "../state/store";
import type { PoiKind } from "../services/overpass";
import type { OsmKind } from "../../shared/osmKinds";

// Icons
const Icons = {
  Matching: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  ),
  Measuring: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z" />
    </svg>
  ),
  Radar: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.27-7.5-3.22zm6.31-4.06l-2.06.9 2.06.91z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Thermometer: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-2V5c0-.55.45-1 1-1s1 .45 1 1v1h-1v1h1v2h-2z" />
    </svg>
  ),
  Tentacles: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
    </svg>
  ),
  Poi: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  ),
};

// Import PoiModal component logic
interface PoiModalProps {
  kind: PoiKind;
  label: string;
  onClose: () => void;
  onAnswer: (radiusMiles: number, answer: "YES" | "NO") => void;
}


function PoiModal({ kind, label, onClose, onAnswer }: PoiModalProps) {
  const [selectedRadius, setSelectedRadius] = useState(5);
  const RADII = [1, 3, 5, 10, 25];

  const handleAnswer = (answer: "YES" | "NO") => {
    onAnswer(selectedRadius, answer);
    onClose();
  };

  return (
    <div className="poi-modal-overlay" onClick={onClose}>
      <div className="poi-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="poi-modal-header">
          <h3>POI – {label}</h3>
          <button className="poi-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="poi-modal-content">
          <div className="poi-modal-prompt">
            Within <strong>{selectedRadius} mi</strong> of a <strong>{label.toLowerCase()}</strong>?
          </div>
          <div className="poi-modal-radii">
            <div className="section-label">Radius</div>
            <div className="tile-grid">
              {RADII.map((r) => (
                <button
                  key={r}
                  className={`tile-button ${selectedRadius === r ? "selected" : ""}`}
                  onClick={() => setSelectedRadius(r)}
                >
                  {r} mi
                </button>
              ))}
            </div>
          </div>
          <div className="poi-modal-answers">
            <button
              className="tile-button yellow large"
              onClick={() => handleAnswer("YES")}
            >
              YES
            </button>
            <button
              className="tile-button yellow large"
              onClick={() => handleAnswer("NO")}
            >
              NO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const RADAR_DISTANCES: Array<{ miles: number; label: string }> = [
  { miles: 0.5, label: "0.5 MI" },
  { miles: 1, label: "1 MI" },
  { miles: 3, label: "3 MI" },
  { miles: 5, label: "5 MI" },
  { miles: 10, label: "10 MI" },
  { miles: 25, label: "25 MI" },
  { miles: 50, label: "50 MI" },
  { miles: 100, label: "100 MI" }
];

const MATCHING_TILES: Array<{ label: string; kind: OsmKind }> = [
  { label: "Airport", kind: "airport" },
  { label: "Train Station", kind: "trainstation" },
  { label: "Metro/Subway", kind: "metro_station" },
  { label: "Highway Access", kind: "highway_access" },
  { label: "Park", kind: "park" },
  { label: "Hospital", kind: "hospital" },
  { label: "Library", kind: "library" },
  { label: "Museum", kind: "museum" },
  { label: "Government", kind: "government" },
  { label: "Stadium", kind: "stadium" },
  { label: "University", kind: "university" },
  { label: "School", kind: "school" },
  { label: "Police", kind: "police" },
  { label: "Fire Station", kind: "fire_station" },
  { label: "Castle", kind: "castle" },
  { label: "Ferry Terminal", kind: "ferry_terminal" }
];

const MEASURING_TILES: Array<{ label: string; kind: OsmKind }> = [...MATCHING_TILES];

const TENTACLE_LABELS = [
  { label: "Airport", dist: "15 mi" },
  { label: "Park", dist: "15 mi" },
  { label: "Mountain", dist: "15 mi" },
  { label: "Transit", dist: "15 mi" },
  { label: "Airport", dist: "1 mi" },
  { label: "Park", dist: "1 mi" },
  { label: "Mountain", dist: "1 mi" },
  { label: "Transit", dist: "1 mi" }
];

// POI kinds for the menu
const POI_KINDS: Array<{ kind: PoiKind; label: string }> = [
  { kind: "zoo", label: "Zoo" },
  { kind: "hospital", label: "Hospital" },
  { kind: "museum", label: "Museum" },
  { kind: "library", label: "Library" },
  { kind: "university", label: "University" },
  { kind: "school", label: "School" },
  { kind: "police", label: "Police" },
  { kind: "firestation", label: "Fire Station" },
  { kind: "courthouse", label: "Courthouse" },
  { kind: "townhall", label: "Town Hall" },
  { kind: "embassy", label: "Embassy" },
  { kind: "park", label: "Park" },
  { kind: "stadium", label: "Stadium" },
  { kind: "themepark", label: "Theme Park" },
  { kind: "castle", label: "Castle" },
  { kind: "peak", label: "Peak" },
  { kind: "airport", label: "Airport" },
  { kind: "trainstation", label: "Train Station" },
  { kind: "ferry", label: "Ferry Terminal" }
];

export default function JetLagMenu() {
  const candidate = useStore(s => s.candidate);
  const seeker = useStore(s => s.seekerLngLat);
  const thermoStart = useStore(s => s.thermoStart);
  const thermoEnd = useStore(s => s.thermoEnd);
  const setStart = useStore(s => s.setThermoStartNow);
  const setEnd = useStore(s => s.setThermoEndNow);
  const applyRadar = useStore(s => s.applyRadarNow);
  const applyThermo = useStore(s => s.applyThermo);
  const applyPoiWithin = useStore(s => s.applyPoiWithin);
  const applyMatching = useStore(s => s.applyMatching);
  const applyMeasuring = useStore(s => s.applyMeasuring);

  const [poiModalKind, setPoiModalKind] = useState<PoiKind | null>(null);
  const [poiModalLabel, setPoiModalLabel] = useState<string>("");
  const [matchingSelected, setMatchingSelected] = useState<OsmKind | null>(null);
  const [measuringSelected, setMeasuringSelected] = useState<OsmKind | null>(null);
  const [measuringLastAnswer, setMeasuringLastAnswer] = useState<"CLOSER" | "FARTHER">("CLOSER");
  const [radarCustomMode, setRadarCustomMode] = useState<"HIT" | "MISS" | null>(null);
  const [radarCustomMiles, setRadarCustomMiles] = useState<string>("");

  const handlePoiClick = (kind: PoiKind, label: string) => {
    setPoiModalKind(kind);
    setPoiModalLabel(label);
  };

  const handlePoiAnswer = async (radiusMiles: number, answer: "YES" | "NO") => {
    if (poiModalKind) {
      await applyPoiWithin(poiModalKind, radiusMiles, answer);
    }
  };

  return (
    <div className="jlMenu">
      <div className="jlBanner">QUESTION MENU</div>
      <div className="jlColumns">
        {/* MATCHING */}
        <section className="jlCol">
          <div className="jlCategory">
            <div className="jlCatHeader">
              <div className="jlCatIcon matching">{Icons.Matching}</div>
              <div className="jlCatTitles">
                <div className="jlCatTitle">MATCHING</div>
                <div className="jlCatSub">DRAW 3, PICK 1</div>
              </div>
            </div>
            {!seeker && (
              <div style={{ fontSize: "11px", color: "#d32f2f", fontWeight: 600, marginTop: "4px" }}>
                Requires seeker GPS
              </div>
            )}
            <div className="jlGrid matching">
              {MATCHING_TILES.map((t) => (
                <button
                  key={t.kind}
                  className="jlTile matching"
                  disabled={!candidate || !seeker}
                  onClick={() => setMatchingSelected(t.kind)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            {matchingSelected && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="tileBtn"
                  onClick={() => applyMatching(matchingSelected, "YES")}
                  disabled={!candidate || !seeker}
                >
                  YES
                </button>
                <button
                  type="button"
                  className="tileBtn"
                  onClick={() => applyMatching(matchingSelected, "NO")}
                  disabled={!candidate || !seeker}
                >
                  NO
                </button>
                <button type="button" className="tileBtn" onClick={() => setMatchingSelected(null)}>
                  Clear
                </button>
              </div>
            )}
          </div>
        </section>

        {/* MEASURING */}
        <section className="jlCol">
          <div className="jlCategory">
            <div className="jlCatHeader">
              <div className="jlCatIcon measuring">{Icons.Measuring}</div>
              <div className="jlCatTitles">
                <div className="jlCatTitle">MEASURING</div>
                <div className="jlCatSub">DRAW 3, PICK 1</div>
              </div>
            </div>
            {!seeker && (
              <div style={{ fontSize: "11px", color: "#d32f2f", fontWeight: 600, marginTop: "4px" }}>
                Requires seeker GPS
              </div>
            )}
            <div className="jlGrid measuring">
              {MEASURING_TILES.map((t) => (
                <button
                  key={t.kind}
                  className="jlTile measuring"
                  disabled={!candidate || !seeker}
                  onClick={() => {
                    setMeasuringSelected(t.kind);
                    applyMeasuring(t.kind, measuringLastAnswer);
                  }}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            {measuringSelected && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="tileBtn"
                  onClick={() => {
                    setMeasuringLastAnswer("CLOSER");
                    applyMeasuring(measuringSelected, "CLOSER");
                  }}
                  disabled={!candidate || !seeker}
                >
                  CLOSER
                </button>
                <button
                  type="button"
                  className="tileBtn"
                  onClick={() => {
                    setMeasuringLastAnswer("FARTHER");
                    applyMeasuring(measuringSelected, "FARTHER");
                  }}
                  disabled={!candidate || !seeker}
                >
                  FARTHER
                </button>
                <button type="button" className="tileBtn" onClick={() => setMeasuringSelected(null)}>
                  Clear
                </button>
              </div>
            )}
          </div>
        </section>

        {/* RADAR */}
        <section className="jlCol">
          <div className="jlCategory">
            <div className="jlCatHeader">
              <div className="jlCatIcon radar">{Icons.Radar}</div>
              <div className="jlCatTitles">
                <div className="jlCatTitle">RADAR</div>
                <div className="jlCatSub">DRAW 2, PICK 1</div>
              </div>
            </div>
            {!seeker && (
              <div style={{ fontSize: "11px", color: "#d32f2f", fontWeight: 600, marginTop: "4px" }}>
                Requires seeker GPS
              </div>
            )}
            <div className="section-label" style={{ marginTop: "8px", fontSize: "10px", opacity: 0.7 }}>HIT</div>
            <div className="jlGrid radar">
              {RADAR_DISTANCES.map((d) => (
                <button
                  key={`hit-${d.miles}`}
                  className="jlTile radar"
                  onClick={() => applyRadar(d.miles, true)}
                  disabled={!seeker || !candidate}
                  style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
                >
                  <span style={{ fontSize: 10, opacity: 0.8 }}>HIT</span>
                  <span>{d.label}</span>
                </button>
              ))}
              <button
                className="jlTile radar"
                onClick={() => setRadarCustomMode("HIT")}
                disabled={!seeker || !candidate}
                style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
                type="button"
              >
                <span style={{ fontSize: 10, opacity: 0.8 }}>HIT</span>
                <span>CUSTOM</span>
              </button>
            </div>

            <div className="section-label" style={{ marginTop: "14px", fontSize: "10px", opacity: 0.7 }}>MISS</div>
            <div className="jlGrid radar">
              {RADAR_DISTANCES.map((d) => (
                <button
                  key={`miss-${d.miles}`}
                  className="jlTile radar"
                  onClick={() => applyRadar(d.miles, false)}
                  disabled={!seeker || !candidate}
                  style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
                >
                  <span style={{ fontSize: 10, opacity: 0.8 }}>MISS</span>
                  <span>{d.label}</span>
                </button>
              ))}
              <button
                className="jlTile radar"
                onClick={() => setRadarCustomMode("MISS")}
                disabled={!seeker || !candidate}
                style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
                type="button"
              >
                <span style={{ fontSize: 10, opacity: 0.8 }}>MISS</span>
                <span>CUSTOM</span>
              </button>
            </div>

            {radarCustomMode && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>
                  Custom {radarCustomMode.toLowerCase()} (miles):
                </div>
                <input
                  value={radarCustomMiles}
                  onChange={(e) => setRadarCustomMiles(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 7.5"
                  style={{
                    width: 110,
                    padding: "10px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,.2)"
                  }}
                />
                <button
                  type="button"
                  className="tileBtn"
                  onClick={() => {
                    const miles = Number(radarCustomMiles);
                    if (!Number.isFinite(miles) || miles <= 0) return;
                    applyRadar(miles, radarCustomMode === "HIT");
                    setRadarCustomMode(null);
                    setRadarCustomMiles("");
                  }}
                  disabled={!seeker || !candidate}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="tileBtn"
                  onClick={() => {
                    setRadarCustomMode(null);
                    setRadarCustomMiles("");
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* THERMOMETER / TENTACLES (includes POI data) */}
        <section className="jlCol">
          <div className="jlCategory">
            <div className="jlCatHeader">
              <div className="jlCatIcon thermo">{Icons.Thermometer}</div>
              <div className="jlCatTitles">
                <div className="jlCatTitle">THERMOMETER</div>
                <div className="jlCatSub">DRAW 2, PICK 1</div>
              </div>
            </div>
            <div className="jlGrid thermo">
              <button
                className="jlTile thermo"
                onClick={setStart}
                disabled={!seeker || !candidate}
                style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
              >
                <span>SET</span><span>START</span>
              </button>
              <button
                className="jlTile thermo"
                onClick={setEnd}
                disabled={!seeker || !candidate}
                style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
              >
                <span>SET</span><span>END</span>
              </button>
              <button
                className="jlTile thermo"
                onClick={() => applyThermo(true)}
                disabled={!candidate || !thermoStart || !thermoEnd}
              >
                HOTTER
              </button>
              <button
                className="jlTile thermo"
                onClick={() => applyThermo(false)}
                disabled={!candidate || !thermoStart || !thermoEnd}
              >
                COLDER
              </button>
            </div>
          </div>

          <div className="jlCategory" style={{ marginTop: "24px" }}>
            <div className="jlCatHeader">
              <div className="jlCatIcon tentacles">{Icons.Tentacles}</div>
              <div className="jlCatTitles">
                <div className="jlCatTitle">TENTACLES</div>
                <div className="jlCatSub">DRAW 4, PICK 2</div>
              </div>
            </div>
            <div className="jlGrid tentacles">
              {TENTACLE_LABELS.map((t, i) => (
                <button key={i} className="jlTile tentacles disabled" disabled style={{flexDirection:"column", gap:2, lineHeight:1}}>
                  <span>{t.label}</span>
                  <span style={{fontSize:"10px", opacity:0.8}}>{t.dist}</span>
                </button>
              ))}
            </div>

            <div className="section-label" style={{ marginTop: "16px", fontSize: "10px", opacity: 0.7 }}>PLACES (OSM)</div>
            <div className="jlGrid poi">
              {POI_KINDS.map(({ kind, label }) => (
                <button
                  key={kind}
                  className="jlTile poi"
                  onClick={() => handlePoiClick(kind, label)}
                  disabled={!candidate}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

      </div>

      {/* POI Modal */}
      {poiModalKind && (
        <PoiModal
          kind={poiModalKind}
          label={poiModalLabel}
          onClose={() => {
            setPoiModalKind(null);
            setPoiModalLabel("");
          }}
          onAnswer={handlePoiAnswer}
        />
      )}
    </div>
  );
}
