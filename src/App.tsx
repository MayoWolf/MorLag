import React, { useEffect, useState } from "react";
import { useStore } from "./state/store";
import MapView from "./map/MapView";
import Controls from "./ui/Controls";
import History from "./ui/History";
import QuickSearch from "./ui/QuickSearch";
import JetLagMenu from "./ui/JetLagMenu";

export default function App() {
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const lastToast = useStore(s => s.lastToast);
  const setLastToast = useStore(s => s.setLastToast);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      const isContentEditable = target.isContentEditable;

      // Cmd+K / Ctrl+K to open quick search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setInitialQuery("");
        setQuickSearchOpen(true);
        return;
      }

      // Don't trigger on input/textarea/select/contenteditable
      if (isInput || isContentEditable) {
        return;
      }

      // Printable character (length === 1, not special keys)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Open quick search and set initial query
        setInitialQuery(e.key);
        setQuickSearchOpen(true);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Auto-clear toast after 3 seconds
  useEffect(() => {
    if (lastToast) {
      const timer = setTimeout(() => {
        setLastToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastToast, setLastToast]);

  return (
    <div className="app">
      <aside className="sidebar">
        {lastToast && (
          <div className="toast-message">
            {lastToast}
          </div>
        )}
        <div className="sidebarInner">
          <Controls />
          <JetLagMenu />
          <History />
        </div>
      </aside>

      <main className="mapWrap">
        <MapView />
      </main>

      <QuickSearch
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        initialQuery={initialQuery}
      />
    </div>
  );
}