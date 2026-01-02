"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { fuzzyMatch } from "@/lib/utils/fuzzy-match";

// Comprehensive list of common technologies
const TECHNOLOGY_OPTIONS = [
  // Languages
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C",
  "C#",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "R",
  "MATLAB",
  "Dart",
  "Verilog",

  // Frontend Frameworks & Libraries
  "React",
  "Vue.js",
  "Angular",
  "Next.js",
  "Svelte",
  "Nuxt.js",
  "Remix",
  "Gatsby",
  "Astro",
  "Solid.js",
  "Preact",

  // Backend Frameworks
  "Node.js",
  "Express",
  "FastAPI",
  "Django",
  "Flask",
  "Spring Boot",
  "ASP.NET",
  "Laravel",
  "Rails",
  "NestJS",
  "GraphQL",
  "REST API",

  // Databases
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "Oracle",
  "Cassandra",
  "DynamoDB",
  "Firebase",
  "Supabase",
  "Prisma",

  // Cloud & DevOps
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Jenkins",
  "GitLab CI",
  "GitHub Actions",
  "CircleCI",
  "Ansible",

  // Tools & Platforms
  "Git",
  "GitHub",
  "GitLab",
  "Jira",
  "Confluence",
  "Figma",
  "Adobe XD",
  "Postman",
  "VS Code",
  "IntelliJ",
  "Vim",
  "Emacs",

  // Mobile
  "React Native",
  "Flutter",
  "iOS",
  "Android",
  "Xamarin",
  "Ionic",

  // Data & ML
  "TensorFlow",
  "PyTorch",
  "Pandas",
  "NumPy",
  "Scikit-learn",
  "Jupyter",
  "Apache Spark",
  "Hadoop",
  "Kafka",
  "Elasticsearch",

  // Testing
  "Jest",
  "Cypress",
  "Selenium",
  "Playwright",
  "Vitest",
  "Mocha",
  "Chai",
  "Pytest",
  "JUnit",

  // Other
  "HTML",
  "CSS",
  "SASS",
  "Tailwind CSS",
  "Bootstrap",
  "Webpack",
  "Vite",
  "NPM",
  "Yarn",
  "pnpm",
  "Linux",
  "Unix",
  "Bash",
  "Shell Scripting",
].sort();

interface TechnologyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TechnologyAutocomplete({
  value,
  onChange,
  placeholder = "Type to search technologies...",
  className = "",
}: TechnologyAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse value string into array on mount/change
  useEffect(() => {
    if (value) {
      const techs = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      setSelectedTechs(techs);
    } else {
      setSelectedTechs([]);
    }
  }, [value]);

  // Filter suggestions based on input with fuzzy matching (exclude already selected)
  const filteredOptions = useMemo(() => {
    if (inputValue === "") {
      return TECHNOLOGY_OPTIONS.filter(
        (tech) => !selectedTechs.includes(tech)
      ).slice(0, 25);
    }

    const query = inputValue.toLowerCase().trim();
    const optionsWithScores = TECHNOLOGY_OPTIONS.filter(
      (tech) => !selectedTechs.includes(tech)
    )
      .map((tech) => {
        const lowerTech = tech.toLowerCase();
        const exactMatch = lowerTech.includes(query);
        const fuzzyScore = fuzzyMatch(query, lowerTech);

        let score = 0;
        if (exactMatch) {
          score = 1.0;
        } else if (fuzzyScore > 0) {
          score = fuzzyScore;
        }

        return { tech, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.01) {
          return b.score - a.score;
        }
        return a.tech.localeCompare(b.tech);
      })
      .map(({ tech }) => tech);

    return optionsWithScores.slice(0, 25); // Limit to 25 results
  }, [inputValue, selectedTechs]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true); // Always show dropdown when typing or focusing
  };

  // Handle selecting a technology
  const handleSelect = (tech: string) => {
    const newTechs = [...selectedTechs, tech];
    setSelectedTechs(newTechs);
    onChange(newTechs.join(", "));
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle removing a tag
  const handleRemove = (techToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent triggering parent events
    const newTechs = selectedTechs.filter((tech) => tech !== techToRemove);
    setSelectedTechs(newTechs);
    onChange(newTechs.join(", "));
  };

  // Handle adding custom technology (on Enter or comma)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !selectedTechs.includes(trimmed)) {
        handleSelect(trimmed);
      }
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      selectedTechs.length > 0
    ) {
      // Remove last tag on backspace when input is empty
      const lastTech = selectedTechs[selectedTechs.length - 1];
      handleRemove(lastTech);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Input with tags */}
      <div
        className="flex flex-wrap gap-2 px-3 py-1 border border-zinc-700 rounded-md bg-transparent text-foreground min-h-[36px] items-center transition-colors focus-within:border-zinc-600 [&:focus-within]:outline-none"
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {/* Selected tags */}
        {selectedTechs.map((tech) => (
          <span
            key={tech}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-foreground rounded text-sm border border-border"
          >
            {tech}
            <button
              type="button"
              onClick={(e) => handleRemove(tech, e)}
              onMouseDown={(e) => e.preventDefault()} // Prevent input blur
              className="hover:text-destructive focus:outline-none transition-colors"
              aria-label={`Remove ${tech}`}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedTechs.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none focus:outline-none focus-visible:outline-none placeholder:text-muted-foreground text-sm"
        />
      </div>

      {/* Dropdown suggestions */}
      {isOpen &&
        (filteredOptions.length > 0 ||
          (inputValue.trim() &&
            !selectedTechs.includes(inputValue.trim()))) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-card border border-border rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]"
          >
            {/* Show filtered technologies */}
            {filteredOptions.slice(0, 25).map((tech) => (
              <button
                key={tech}
                type="button"
                onClick={() => handleSelect(tech)}
                className="w-full text-left px-4 py-2 text-sm text-card-foreground hover:bg-[#333333] hover:text-foreground focus:bg-[#333333] focus:text-foreground focus:outline-none cursor-pointer transition-colors"
              >
                {tech}
              </button>
            ))}

            {/* Custom entry option */}
            {inputValue.trim() &&
              !TECHNOLOGY_OPTIONS.some(
                (t) => t.toLowerCase() === inputValue.trim().toLowerCase()
              ) &&
              !selectedTechs.includes(inputValue.trim()) && (
                <button
                  type="button"
                  onClick={() => handleSelect(inputValue.trim())}
                  className="w-full text-left px-4 py-2 text-sm text-card-foreground hover:bg-[#333333] hover:text-foreground focus:bg-[#333333] focus:text-foreground focus:outline-none border-t border-border cursor-pointer transition-colors"
                >
                  <span className="font-medium">
                    Add &quot;{inputValue.trim()}&quot;
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    (custom)
                  </span>
                </button>
              )}
          </div>
        )}
    </div>
  );
}
