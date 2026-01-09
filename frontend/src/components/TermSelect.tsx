"use client";

import { useEffect, useState } from "react";
import { CustomSelect } from "@/components/CustomSelect";

interface TermSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const SEASONS = [
  { value: "Winter", label: "Winter" },
  { value: "Spring", label: "Spring" },
  { value: "Summer", label: "Summer" },
  { value: "Fall", label: "Fall" },
];

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  // Next 2 years, previous 5 years
  for (let i = currentYear + 2; i >= currentYear - 5; i--) {
    years.push({ value: i.toString(), label: i.toString() });
  }
  return years;
};

export function TermSelect({
  value,
  onChange,
  disabled = false,
  required = false,
}: TermSelectProps) {
  const [season, setSeason] = useState("");
  const [year, setYear] = useState("");

  // Parse initial value
  useEffect(() => {
    if (value) {
      const parts = value.split(" ");
      if (parts.length === 2) {
        setSeason(parts[0]);
        setYear(parts[1]);
      }
    }
  }, [value]);

  // Update parent when both selected
  const updateTerm = (newSeason: string, newYear: string) => {
    if (newSeason && newYear) {
      onChange(`${newSeason} ${newYear}`);
    } else {
      // Don't call onChange with partial values to avoid invalid state up top?
      // Or maybe clear it? Let's clear it if incomplete so validation fails properly.
      onChange("");
    }
  };

  const handleSeasonChange = (newSeason: string) => {
    setSeason(newSeason);
    updateTerm(newSeason, year);
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    updateTerm(season, newYear);
  };

  const years = generateYears();

  return (
    <div className="flex gap-4 w-full">
      <div className="flex-1">
        <CustomSelect
          value={season}
          onChange={handleSeasonChange}
          options={SEASONS}
          placeholder="Season"
          disabled={disabled}
          searchable={false}
          required={required}
        />
      </div>
      <div className="flex-1">
        <CustomSelect
          value={year}
          onChange={handleYearChange}
          options={years}
          placeholder="Year"
          disabled={disabled}
          searchable={false}
          required={required}
        />
      </div>
    </div>
  );
}
