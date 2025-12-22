"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { fuzzyMatch } from "@/lib/utils/fuzzy-match";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  className?: string;
  id?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  required = false,
  searchable = false,
  className = "",
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the selected option's label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || "";

  // Initialize search query with selected value
  useEffect(() => {
    if (selectedOption && value !== "") {
      setSearchQuery(selectedOption.label);
    } else {
      setSearchQuery("");
    }
  }, [selectedOption, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Reset search query to selected value when closing
        if (selectedOption && value !== "") {
          setSearchQuery(selectedOption.label);
        } else {
          setSearchQuery("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption, value]);

  // Filter options based on search with fuzzy matching (if searchable)
  const filteredOptions = useMemo(() => {
    if (!searchable) return options;

    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase().trim();
    const optionsWithScores = options
      .map((option) => {
        const lowerLabel = option.label.toLowerCase();
        const exactMatch = lowerLabel.includes(query);
        const fuzzyScore = fuzzyMatch(query, lowerLabel);

        let score = 0;
        if (exactMatch) {
          score = 1.0;
        } else if (fuzzyScore > 0) {
          score = fuzzyScore;
        }

        return { option, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.01) {
          return b.score - a.score;
        }
        return a.option.label.localeCompare(b.option.label);
      })
      .map(({ option }) => option);

    return optionsWithScores;
  }, [searchable, options, searchQuery]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    // Update search query to selected label
    const selected = options.find((opt) => opt.value === optionValue);
    if (selected && optionValue !== "") {
      setSearchQuery(selected.label);
    } else {
      setSearchQuery("");
    }
  };

  const handleInputChange = (newValue: string) => {
    if (searchable) {
      setSearchQuery(newValue);
      setIsOpen(true);
    } else {
      // For non-searchable, just open dropdown
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchable) {
      // For non-searchable, prevent typing
      inputRef.current?.blur();
    }
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      if (!searchable) {
        // For non-searchable, prevent focus to disable typing
        inputRef.current?.blur();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (searchable && filteredOptions.length === 1) {
        // If only one option matches, select it
        handleSelect(filteredOptions[0].value);
      } else if (!searchable && isOpen && filteredOptions.length > 0) {
        // For non-searchable, select first option on Enter
        handleSelect(filteredOptions[0].value);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      if (selectedOption && value !== "") {
        setSearchQuery(selectedOption.label);
      } else {
        setSearchQuery("");
      }
    } else if (e.key === "ArrowDown" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } else if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Prevent typing for non-searchable selects
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={searchable ? searchQuery : value ? displayValue : ""}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          readOnly={!searchable}
          className={cn(
            "pr-8 cursor-pointer",
            !searchable && "cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
        />
        <ChevronDown
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-zinc-700 rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] max-h-60 overflow-y-auto no-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors duration-200 first:rounded-t-md last:rounded-b-md cursor-pointer",
                  "hover:bg-[#333333] hover:text-foreground focus:bg-[#333333] focus:text-foreground focus:outline-none",
                  option.value === value && "bg-[#333333]/50"
                )}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
