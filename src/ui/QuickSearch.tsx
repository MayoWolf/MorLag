import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";

interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function QuickSearch({ isOpen, onClose, initialQuery = "" }: QuickSearchProps) {
  const searchQuery = useStore(s => s.searchQuery);
  const searchResults = useStore(s => s.searchResults);
  const setSearchQuery = useStore(s => s.setSearchQuery);
  const runSearch = useStore(s => s.runSearch);
  const selectSearchResult = useStore(s => s.selectSearchResult);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      if (initialQuery) {
        setSearchQuery(initialQuery);
        // Trigger search after setting initial query
        setTimeout(() => {
          runSearch().catch(() => {
            // Ignore errors
          });
        }, 50);
      } else if (!searchQuery) {
        setSearchQuery("");
      }
      setHighlightedIndex(-1);
    }
  }, [isOpen, initialQuery, setSearchQuery, searchQuery, runSearch]);

  // Handle Escape key to close overlay
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Update highlighted index when results change
  useEffect(() => {
    if (searchResults.length > 0 && highlightedIndex >= searchResults.length) {
      setHighlightedIndex(-1);
    }
  }, [searchResults.length, highlightedIndex]);

  if (!isOpen) return null;

  const truncateName = (name: string, maxLength: number = 60) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + "...";
  };

  const handleResultClick = (result: typeof searchResults[0]) => {
    selectSearchResult(result);
    onClose();
  };

  return (
    <div className="quick-search-overlay" onClick={onClose}>
      <div className="quick-search-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="quick-search-input"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setHighlightedIndex(-1);
            // Debounce search
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }
            searchTimeoutRef.current = setTimeout(() => {
              runSearch().catch(() => {
                // Ignore errors
              });
            }, 300);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex(prev => {
                if (prev < searchResults.length - 1) {
                  return prev + 1;
                }
                return prev;
              });
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex(prev => {
                if (prev > 0) {
                  return prev - 1;
                }
                return -1;
              });
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (searchResults.length > 0 && highlightedIndex >= 0) {
                selectSearchResult(searchResults[highlightedIndex]);
                onClose();
              } else if (searchResults.length > 0) {
                // Select first result if none highlighted
                selectSearchResult(searchResults[0]);
                onClose();
              }
            } else if (e.key === "Escape") {
              // Let the overlay handler deal with Escape
              e.stopPropagation();
            }
          }}
          placeholder="Search for a place..."
        />
        {searchResults.length > 0 && (
          <div className="quick-search-results">
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className={`quick-search-result-item ${idx === highlightedIndex ? "highlighted" : ""}`}
                onClick={() => handleResultClick(result)}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <div className="quick-search-result-title">
                  {truncateName(result.display_name)}
                </div>
                <div className="quick-search-result-meta">
                  {result.class && result.type && `${result.class}/${result.type}`}
                  {result.address?.country && (
                    <span>
                      {result.class && result.type ? " • " : ""}
                      {result.address.country}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

