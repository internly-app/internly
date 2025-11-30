"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

const COMMON_LOCATIONS = [
  "Remote",
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
  "Los Angeles, CA",
  "Chicago, IL",
  "Boston, MA",
  "Austin, TX",
  "Washington, DC",
  "San Diego, CA",
  "Dallas, TX",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Jose, CA",
  "Denver, CO",
  "Portland, OR",
  "Atlanta, GA",
  "Minneapolis, MN",
  "Miami, FL",
  "Nashville, TN",
  "Raleigh, NC",
  "Salt Lake City, UT",
  "Orlando, FL",
  "Las Vegas, NV",
  "Detroit, MI",
  "Toronto, ON",
  "Vancouver, BC",
  "Montreal, QC",
  "Calgary, AB",
  "Ottawa, ON",
  "Edmonton, AB",
  "Winnipeg, MB",
  "Quebec City, QC",
  "Halifax, NS",
  "London, UK",
  "Berlin, Germany",
  "Amsterdam, Netherlands",
  "Zurich, Switzerland",
  "Paris, France",
  "Dublin, Ireland",
  "Stockholm, Sweden",
  "Copenhagen, Denmark",
  "Tel Aviv, Israel",
  "Singapore",
  "Tokyo, Japan",
  "Seoul, South Korea",
  "Hong Kong",
  "Sydney, Australia",
  "Melbourne, Australia",
  "Bangalore, India",
  "Mumbai, India",
  "Delhi, India",
  "São Paulo, Brazil",
  "Mexico City, Mexico",
  "Other"
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
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if current value is "Other" or custom location
  useEffect(() => {
    const isCommonLocation = COMMON_LOCATIONS.includes(value);
    setIsOtherSelected(!isCommonLocation && value !== "");

    // If it's a common location or empty, show the location name
    // If it's custom, show the custom value
    if (isCommonLocation || value === "") {
      setSearchQuery(value);
    } else {
      setSearchQuery(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter locations based on search
  const filteredLocations = COMMON_LOCATIONS.filter(location =>
    location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (location: string) => {
    if (location === "Other") {
      setIsOtherSelected(true);
      setSearchQuery("");
      onChange("");
      setIsOpen(false);
    } else {
      setIsOtherSelected(false);
      setSearchQuery(location);
      onChange(location);
      setIsOpen(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);

    if (isOtherSelected) {
      // If "Other" is selected, update the actual value
      onChange(newValue);
    } else {
      // If searching through common locations, open dropdown
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isOtherSelected) {
      // Allow custom entry when "Other" is selected
      onChange(searchQuery);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={searchQuery}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => !isOtherSelected && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={isOtherSelected ? "Enter custom location..." : placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />

      {isOpen && !isOtherSelected && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredLocations.length > 0 ? (
            filteredLocations.map((location) => (
              <button
                key={location}
                onClick={() => handleSelect(location)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#333333] hover:text-foreground focus:bg-[#333333] focus:text-foreground focus:outline-none cursor-pointer transition-colors"
              >
                {location === "Other" ? (
                  <span className="text-muted-foreground">Other (custom location)</span>
                ) : (
                  location
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No locations found
            </div>
          )}
        </div>
      )}

      {isOtherSelected && (
        <div className="mt-1 text-xs text-muted-foreground">
          Custom location - type any city/location
        </div>
      )}
    </div>
  );
}