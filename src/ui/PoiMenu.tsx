import React, { useState } from "react";
import { useStore } from "../state/store";
import type { PoiKind } from "../services/overpass";

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

const RADII = [1, 3, 5, 10, 25];

interface PoiModalProps {
  kind: PoiKind;
  label: string;
  onClose: () => void;
  onAnswer: (radiusMiles: number, answer: "YES" | "NO") => void;
}

function PoiModal({ kind, label, onClose, onAnswer }: PoiModalProps) {
  const [selectedRadius, setSelectedRadius] = useState(5);

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

export default function PoiMenu() {
  const applyPoiWithin = useStore(s => s.applyPoiWithin);
  const [modalKind, setModalKind] = useState<PoiKind | null>(null);
  const [modalLabel, setModalLabel] = useState<string>("");

  const handlePoiClick = (kind: PoiKind, label: string) => {
    setModalKind(kind);
    setModalLabel(label);
  };

  const handleAnswer = async (radiusMiles: number, answer: "YES" | "NO") => {
    if (modalKind) {
      await applyPoiWithin(modalKind, radiusMiles, answer);
    }
  };

  return (
    <>
      <div className="panel">
        <div className="panel-header poi">POI</div>
        <div className="panel-content">
          <div className="tile-grid poi-grid">
            {POI_KINDS.map(({ kind, label }) => (
              <button
                key={kind}
                className="tile-button"
                onClick={() => handlePoiClick(kind, label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modalKind && (
        <PoiModal
          kind={modalKind}
          label={modalLabel}
          onClose={() => {
            setModalKind(null);
            setModalLabel("");
          }}
          onAnswer={handleAnswer}
        />
      )}
    </>
  );
}

