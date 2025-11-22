"use client";

import { useState, useRef, useEffect } from "react";

// Comprehensive list of common technologies
const TECHNOLOGY_OPTIONS = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust",
  "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Dart",
  
  // Frontend Frameworks & Libraries
  "React", "Vue.js", "Angular", "Next.js", "Svelte", "Nuxt.js", "Remix",
  "Gatsby", "Astro", "Solid.js", "Preact",
  
  // Backend Frameworks
  "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
  "ASP.NET", "Laravel", "Rails", "NestJS", "GraphQL", "REST API",
  
  // Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Oracle",
  "Cassandra", "DynamoDB", "Firebase", "Supabase", "Prisma",
  
  // Cloud & DevOps
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
  "Jenkins", "GitLab CI", "GitHub Actions", "CircleCI", "Ansible",
  
  // Tools & Platforms
  "Git", "GitHub", "GitLab", "Jira", "Confluence", "Figma", "Adobe XD",
  "Postman", "VS Code", "IntelliJ", "Vim", "Emacs",
  
  // Mobile
  "React Native", "Flutter", "iOS", "Android", "Xamarin", "Ionic",
  
  // Data & ML
  "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn", "Jupyter",
  "Apache Spark", "Hadoop", "Kafka", "Elasticsearch",
  
  // Testing
  "Jest", "Cypress", "Selenium", "Playwright", "Vitest", "Mocha",
  "Chai", "Pytest", "JUnit",
  
  // Other
  "HTML", "CSS", "SASS", "Tailwind CSS", "Bootstrap", "Webpack", "Vite",
  "NPM", "Yarn", "pnpm", "Linux", "Unix", "Bash", "Shell Scripting",
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
      const techs = value.split(",").map((t) => t.trim()).filter(Boolean);
      setSelectedTechs(techs);
    } else {
      setSelectedTechs([]);
    }
  }, [value]);

  // Filter suggestions based on input
  const filteredOptions = TECHNOLOGY_OPTIONS.filter(
    (tech) =>
      tech.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTechs.includes(tech)
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(val.length > 0);
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
  const handleRemove = (techToRemove: string) => {
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
    } else if (e.key === "Backspace" && inputValue === "" && selectedTechs.length > 0) {
      // Remove last tag on backspace when input is empty
      handleRemove(selectedTechs[selectedTechs.length - 1]);
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
      <div className="flex flex-wrap gap-2 px-4 py-2 border border-input rounded-lg bg-background text-foreground focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent min-h-[42px]">
        {/* Selected tags */}
        {selectedTechs.map((tech) => (
          <span
            key={tech}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-200 rounded text-sm border border-blue-500/40"
          >
            {tech}
            <button
              type="button"
              onClick={() => handleRemove(tech)}
              className="hover:text-blue-100 focus:outline-none"
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
          onFocus={() => setIsOpen(inputValue.length > 0 || filteredOptions.length > 0)}
          placeholder={selectedTechs.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Dropdown suggestions */}
      {isOpen && (filteredOptions.length > 0 || inputValue.trim()) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-popover border border-border rounded-lg shadow-lg"
        >
          {/* Suggestions from list */}
          {filteredOptions.slice(0, 10).map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => handleSelect(tech)}
              className="w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-colors"
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
                className="w-full text-left px-4 py-2 text-sm text-accent hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-t border-border transition-colors"
              >
                <span className="font-medium">Add &quot;{inputValue.trim()}&quot;</span>
                <span className="text-xs text-muted-foreground ml-2">(custom)</span>
              </button>
            )}
        </div>
      )}
    </div>
  );
}

