import React, { useState } from "react";
import { useStore } from "../state/store";
import type { PoiKind } from "../services/overpass";
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
        <div className="jlCategory">
          <div className="jlCategoryHeader">
            <div className="jlIcon matching"></div>
            <div>
              <div className="jlTitle">MATCHING</div>
              <div className="jlSubtitle">DRAW 3, PICK 1</div>
            </div>
          </div>
          <div className="jlGrid matching">
            {Array.from({ length: 16 }).map((_, i) => (
              <button key={i} className="jlTile matching" disabled>
                {/* Placeholder tiles */}
              </button>
            ))}
          </div>
        </div>

        {/* MEASURING */}
        <div className="jlCategory">
          <div className="jlCategoryHeader">
            <div className="jlIcon measuring"></div>
            <div>
              <div className="jlTitle">MEASURING</div>
              <div className="jlSubtitle">DRAW 3, PICK 1</div>
            </div>
          </div>
          <div className="jlGrid measuring">
            {Array.from({ length: 20 }).map((_, i) => (
              <button key={i} className="jlTile measuring" disabled>
                {/* Placeholder tiles */}
              </button>
            ))}
          </div>
        </div>

        {/* RADAR */}
        <div className="jlCategory">
          <div className="jlCategoryHeader">
            <div className="jlIcon radar"></div>
            <div>
              <div className="jlTitle">RADAR</div>
              <div className="jlSubtitle">DRAW 2, PICK 1</div>
            </div>
          </div>
          <div className="jlGrid radar">
            {RADII.map((r) => (
              <button
                key={`hit-${r}`}
                className="jlTile radar"
                onClick={() => applyRadar(r, true)}
                disabled={!seeker || !candidate}
              >
                HIT {r}
              </button>
            ))}
            {RADII.map((r) => (
              <button
                key={`miss-${r}`}
                className="jlTile radar"
                onClick={() => applyRadar(r, false)}
                disabled={!seeker || !candidate}
              >
                MISS {r}
              </button>
            ))}
          </div>
        </div>

        {/* THERMOMETER */}
        <div className="jlCategory">
          <div className="jlCategoryHeader">
            <div className="jlIcon thermo"></div>
            <div>
              <div className="jlTitle">THERMOMETER</div>
              <div className="jlSubtitle">DRAW 2, PICK 1</div>
            </div>
          </div>
          <div className="jlGrid thermo">
            <button
              className="jlTile thermo"
              onClick={setStart}
              disabled={!seeker || !candidate}
            >
              Set Start
            </button>
            <button
              className="jlTile thermo"
              onClick={setEnd}
              disabled={!seeker || !candidate}
            >
              Set End
            </button>
            <button
              className="jlTile thermo"
              onClick={() => applyThermo(true)}
              disabled={!candidate || !thermoStart || !thermoEnd}
            >
              Hotter
            </button>
            <button
              className="jlTile thermo"
              onClick={() => applyThermo(false)}
              disabled={!candidate || !thermoStart || !thermoEnd}
            >
              Colder
            </button>
          </div>

          {/* TENTACLES (below Thermometer) */}
          <div className="jlCategoryHeader" style={{ marginTop: "20px" }}>
            <div className="jlIcon tentacles"></div>
            <div>
              <div className="jlTitle">TENTACLES</div>
              <div className="jlSubtitle">DRAW 4, PICK 2</div>
            </div>
          </div>
          <div className="jlGrid tentacles">
            {Array.from({ length: 4 }).map((_, i) => (
              <button key={`tent-15-${i}`} className="jlTile tentacles" disabled>
                15 mi
              </button>
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <button key={`tent-1-${i}`} className="jlTile tentacles" disabled>
                1 mi
              </button>
            ))}
          </div>

          {/* POI (below Tentacles) */}
          <div className="jlCategoryHeader" style={{ marginTop: "20px" }}>
            <div className="jlIcon poi"></div>
            <div>
              <div className="jlTitle">POI</div>
              <div className="jlSubtitle">DATA</div>
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

        {/* PHOTO */}
        <div className="jlCategory">
          <div className="jlCategoryHeader">
            <div className="jlIcon photo"></div>
            <div>
              <div className="jlTitle">PHOTO</div>
              <div className="jlSubtitle">DRAW 1</div>
            </div>
          </div>
          <div className="jlGrid photo">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} className="jlTile photo" disabled>
                {/* Placeholder tiles */}
              </button>
            ))}
          </div>
        </div>
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

