"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { fuzzyMatch } from "@/lib/utils/fuzzy-match";

const COMMON_LOCATIONS = [
  "Remote",
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
  "Austin, TX",
  "Boston, MA",
  "Los Angeles, CA",
  "Chicago, IL",
  "Washington, DC",
  "Denver, CO",
  "Atlanta, GA",
  "Miami, FL",
  "San Jose, CA",
  "Palo Alto, CA",
  "Mountain View, CA",
  "Sunnyvale, CA",
  "Santa Clara, CA",
  "Menlo Park, CA",
  "Redmond, WA",
  "Bellevue, WA",
  "Portland, OR",
  "San Diego, CA",
  "Dallas, TX",
  "Houston, TX",
  "Philadelphia, PA",
  "Phoenix, AZ",
  "Toronto, ON",
  "Vancouver, BC",
  "Montreal, QC",
  "Waterloo, ON",
  "Ottawa, ON",
  "London, UK",
  "London, ON",
  "Cambridge, MA",
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Select location...",
  disabled = false,
  required = false,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state with prop
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter locations based on search with fuzzy matching
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return COMMON_LOCATIONS;

    const query = searchQuery.toLowerCase().trim();
    // If the query is exactly a common location, we still want to show it (and others)
    // But specific logic to "hide" unrelated ones comes from fuzzy match.

    const locationsWithScores = COMMON_LOCATIONS.map((location) => {
      const lowerLocation = location.toLowerCase();
      const exactMatch = lowerLocation.includes(query);
      const fuzzyScore = fuzzyMatch(query, lowerLocation);

      let score = 0;
      if (exactMatch) {
        score = 1.0;
      } else if (fuzzyScore > 0) {
        score = fuzzyScore;
      }

      return { location, score };
    })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.01) {
          return b.score - a.score;
        }
        return a.location.localeCompare(b.location);
      })
      .map(({ location }) => location);

    return locationsWithScores;
  }, [searchQuery]);

  const handleSelect = (location: string) => {
    setSearchQuery(location);
    onChange(location);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Select the first option if available, or the current text if it's custom
      if (filteredLocations.length > 0) {
        handleSelect(filteredLocations[0]);
      } else if (searchQuery.trim()) {
        handleSelect(searchQuery.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={searchQuery}
        onChange={(e) => {
          const newValue = e.target.value;
          setSearchQuery(newValue);
          onChange(newValue);
          setIsOpen(true);
          // We don't call onChange here to avoid "custom" values being set before the user confirms?
          // Actually, for a text input, we usually want it to be controlled.
          // But here we want to encourage picking from list or explicitly adding.
          // However, if I don't call onChange, the parent form state doesn't have the value.
          // The previous "Other" implementation:
          //   onChange(newValue) was called if isOtherSelected was true.
          // So for custom locations, it was updating live.
          // For common locations, it was updating live too?
          // No, `handleSelect` called `onChange`.
          // Let's update live.
          onChange(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-zinc-700 rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] max-h-60 overflow-y-auto no-scrollbar">
          {filteredLocations.map((location) => (
            <button
              key={location}
              onClick={() => handleSelect(location)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] hover:text-foreground focus:bg-[#333333] focus:text-foreground focus:outline-none cursor-pointer transition-colors duration-200"
            >
              {location}
            </button>
          ))}

          {/* Custom option if not exact match */}
          {searchQuery.trim() &&
            !COMMON_LOCATIONS.some(
              (l) => l.toLowerCase() === searchQuery.trim().toLowerCase()
            ) && (
              <button
                key="custom-add"
                onClick={() => handleSelect(searchQuery.trim())}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] hover:text-foreground focus:bg-[#333333] focus:text-foreground focus:outline-none border-t border-zinc-700 cursor-pointer transition-colors duration-200"
              >
                <span className="font-medium">
                  Add &quot;{searchQuery.trim()}&quot;
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  (custom)
                </span>
              </button>
            )}

          {filteredLocations.length === 0 && !searchQuery.trim() && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Type to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
