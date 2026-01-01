import React, { useState } from "react";
import { useStore } from "../state/store";
import type { PoiKind } from "../services/overpass";

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
  Photo: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M21 6h-3.17L16 4h-6v2h5.12l1.83 2H21v12H5V8h2V6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
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

// Radar radii - showing all available options
const RADII = [0.5, 1, 3, 5, 10, 25, 50, 100];

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

  const [poiModalKind, setPoiModalKind] = useState<PoiKind | null>(null);
  const [poiModalLabel, setPoiModalLabel] = useState<string>("");

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
            <div className="jlGrid matching">
              {Array.from({ length: 16 }).map((_, i) => (
                <button key={i} className="jlTile matching disabled" disabled>
                  {/* Placeholder */}
                </button>
              ))}
            </div>
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
            <div className="jlGrid measuring">
              {Array.from({ length: 20 }).map((_, i) => (
                <button key={i} className="jlTile measuring disabled" disabled>
                  {/* Placeholder */}
                </button>
              ))}
            </div>
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
            <div className="jlGrid radar">
              {RADII.map((r) => (
                <button
                  key={`hit-${r}`}
                  className="jlTile radar"
                  onClick={() => applyRadar(r, true)}
                  disabled={!seeker || !candidate}
                  style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
                >
                  <span style={{ fontSize: 10, opacity: 0.8 }}>HIT</span>
                  <span>{r} mi</span>
                </button>
              ))}
              {RADII.map((r) => (
                <button
                  key={`miss-${r}`}
                  className="jlTile radar"
                  onClick={() => applyRadar(r, false)}
                  disabled={!seeker || !candidate}
                  style={{ flexDirection: "column", gap: 2, lineHeight: 1 }}
                >
                  <span style={{ fontSize: 10, opacity: 0.8 }}>MISS</span>
                  <span>{r} mi</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* THERMOMETER / TENTACLES / POI */}
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
              {Array.from({ length: 4 }).map((_, i) => (
                <button key={`tent-15-${i}`} className="jlTile tentacles disabled" disabled>
                  15 mi
                </button>
              ))}
              {Array.from({ length: 4 }).map((_, i) => (
                <button key={`tent-1-${i}`} className="jlTile tentacles disabled" disabled>
                  1 mi
                </button>
              ))}
            </div>
          </div>

          <div className="jlCategory" style={{ marginTop: "24px" }}>
            <div className="jlCatHeader">
              <div className="jlCatIcon poi">{Icons.Poi}</div>
              <div className="jlCatTitles">
                <div className="jlCatTitle">POI</div>
                <div className="jlCatSub">DATA</div>
              </div>
            </div>
            <div className="jlGrid poi">
              {POI_KINDS.slice(0, 8).map(({ kind, label }) => (
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

        {/* PHOTO */}
        <section className="jlCol">
          <div className="jlCategory">
            <div className="jlCatHeader">
              <div className="jlCatIcon photo">{Icons.Photo}</div>
              <div className="jlCatTitles">
                <div className="jlCatTitle">PHOTO</div>
                <div className="jlCatSub">DRAW 1</div>
              </div>
            </div>
            <div className="jlGrid photo">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} className="jlTile photo disabled" disabled>
                  {/* Placeholder */}
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
