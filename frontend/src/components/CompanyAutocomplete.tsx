"use client";

import { useState, useRef, useEffect } from "react";

// Comprehensive list of popular companies (big tech, medium companies, popular startups)
const POPULAR_COMPANIES = [
  // Big Tech
  "Google", "Microsoft", "Apple", "Amazon", "Meta", "Netflix", "Tesla", "Nvidia",
  "Oracle", "IBM", "Salesforce", "Adobe", "Intel", "Cisco", "PayPal", "Uber",
  "Airbnb", "Lyft", "Spotify", "Twitter", "LinkedIn", "Snapchat", "TikTok",
  "ByteDance", "Alibaba", "Tencent", "Samsung", "Sony", "Nintendo",

  // Finance & Fintech
  "Goldman Sachs", "JPMorgan Chase", "Morgan Stanley", "Bank of America", "Citigroup",
  "Wells Fargo", "BlackRock", "Visa", "Mastercard", "Stripe", "Square", "Coinbase",
  "Robinhood", "Chime", "Plaid", "Affirm", "SoFi", "Revolut", "Wise",
  "Brex", "Ramp", "Mercury", "Deel", "Kraken", "Binance",

  // E-commerce & Retail
  "Shopify", "Etsy", "eBay", "Walmart", "Target", "Costco", "Best Buy",
  "Wayfair", "Instacart", "DoorDash", "Grubhub", "Zalando", "ASOS", "Farfetch",
  "StockX", "GOAT", "Poshmark", "Alibaba", "JD.com", "Flipkart",

  // SaaS & Enterprise
  "Slack", "Zoom", "Dropbox", "Box", "Atlassian", "ServiceNow", "Workday",
  "Splunk", "Datadog", "Snowflake", "Palantir", "MongoDB", "Elastic",
  "Twilio", "SendGrid", "HubSpot", "Zendesk", "Asana", "Notion", "Airtable",
  "Monday.com", "ClickUp", "Linear", "Jira", "Confluence", "Trello",
  "Miro", "Figma", "Canva", "Adobe Creative Cloud", "Framer", "Webflow",

  // Developer Tools & Infrastructure
  "GitHub", "GitLab", "Bitbucket", "Vercel", "Netlify", "Render", "Railway",
  "Fly.io", "Heroku", "AWS", "Google Cloud", "Azure", "Cloudflare", "Fastly",
  "Akamai", "DigitalOcean", "PlanetScale", "Supabase", "Firebase",
  "Postman", "Apollo GraphQL", "Prisma",

  // Gaming & Entertainment
  "Electronic Arts", "Activision Blizzard", "Epic Games", "Riot Games", "Unity",
  "Roblox", "Discord", "Reddit", "Pinterest", "Tumblr", "Twitch", "YouTube",
  "TikTok", "Instagram", "Snapchat", "BeReal", "VSCO", "VSCO",

  // Healthcare & Biotech
  "Pfizer", "Johnson & Johnson", "Merck", "AbbVie", "Gilead Sciences",
  "Oscar Health", "One Medical", "Ro", "Hims", "Calm", "Headspace", "BetterHelp",

  // Hardware & Semiconductors
  "AMD", "Qualcomm", "Broadcom", "Micron", "Lam Research",
  "ASML", "TSMC", "Samsung Electronics", "SK Hynix", "MediaTek",

  // AI & ML
  "OpenAI", "Anthropic", "Hugging Face", "Cohere", "Stability AI",
  "Midjourney", "Runway", "Jasper", "Copy.ai", "Grammarly", "DeepL",
  "Scale AI", "Weights & Biases",

  // Popular Startups & Unicorns
  "Figma", "Canva", "Notion", "Linear", "Loom", "Calendly", "Gong", "Outreach",
  "Databricks", "Confluent", "Hashicorp", "Terraform", "Ansible", "Docker",
  "Kubernetes", "Zapier", "Make", "Retool", "Bubble",

  // Consulting & Services
  "McKinsey & Company", "Boston Consulting Group", "Bain & Company", "Deloitte",
  "PwC", "EY", "KPMG", "Accenture", "Capgemini", "Cognizant", "Infosys",
  "TCS", "Wipro",

  // Media & Publishing
  "The New York Times", "Washington Post", "Bloomberg", "Reuters", "CNN",
  "Disney", "Warner Bros", "Paramount", "Comcast", "NBCUniversal", "ViacomCBS",
  "Fox", "ABC", "CBS", "NBC", "ESPN", "HBO", "Netflix", "Hulu", "Disney+",

  // Travel & Hospitality
  "Booking.com", "Expedia", "Tripadvisor", "Kayak", "Hopper",
  "Airbnb", "Vrbo", "Marriott", "Hilton", "Hyatt",

  // Food & Beverage
  "Starbucks", "Chipotle", "McDonald's", "Domino's", "Papa John's",
  "DoorDash", "Grubhub", "Uber Eats",

  // Automotive & Transportation
  "Ford", "General Motors", "Rivian", "Lucid Motors", "Waymo", "Cruise",
  "Zoox", "Aurora", "Uber", "Lyft",

 // Energy & Utilities
  "ExxonMobil", "Chevron", "Shell", "BP", "ConocoPhillips", "Schlumberger",
  "Halliburton", "Baker Hughes",

  // Real Estate & PropTech
  "Zillow", "Redfin", "Compass", "Opendoor", "Realtor.com",
  "Trulia", "Apartments.com",

  // EdTech
  "Coursera", "Udemy", "Khan Academy", "Duolingo", "Chegg", "Quizlet",
  "MasterClass", "Skillshare", "Pluralsight", "Codecademy",

  // HR & Recruiting
  "LinkedIn", "Indeed", "Glassdoor", "Monster", "ZipRecruiter", "Hired",
  "Triplebyte", "AngelList", "Wellfound", "Greenhouse", "Lever", "SmartRecruiters",
].sort();

interface Company {
  id: string;
  name: string;
}

interface CompanyAutocompleteProps {
  value: string; // company_id
  onChange: (companyId: string, companyName: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function CompanyAutocomplete({
  value,
  onChange,
  placeholder = "Type to search companies...",
  className = "",
  disabled = false,
  error,
}: CompanyAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dbCompanies, setDbCompanies] = useState<Company[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch companies from database and merge with popular companies
  useEffect(() => {
    const fetchAndMergeCompanies = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/companies`);
        if (response.ok) {
          const data = await response.json();
          setDbCompanies(data || []);

          // Merge popular companies with database companies
          const dbCompanyNames = new Set((data || []).map((c: Company) => c.name.toLowerCase()));
          const allCompanyNames = [
            ...POPULAR_COMPANIES,
            ...(data || []).map((c: Company) => c.name)
          ];

          // Remove duplicates (case-insensitive) and sort
          const unique = Array.from(
            new Map(
              allCompanyNames.map(name => [name.toLowerCase(), name])
            ).values()
          ).sort();

          setCompanies(unique);

          // If we have a value, find and set the selected company name
          if (value) {
            const company = (data || []).find((c: Company) => c.id === value);
            if (company) {
              setSelectedCompanyName(company.name);
              setInputValue(company.name);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err);
        // Fallback to just popular companies if API fails
        setCompanies(POPULAR_COMPANIES);
      } finally {
        setLoading(false);
      }
    };
    fetchAndMergeCompanies();
  }, [value]);

  // Filter companies based on input (like TechnologyAutocomplete)
  const filteredCompanies = companies.filter((companyName) =>
    companyName.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true); // Keep dropdown open while typing
    // Only clear selection if the user is typing something different
    if (selectedCompanyName && val !== selectedCompanyName) {
      setSelectedCompanyName("");
      onChange("", "");
    }
  };

  // Handle selecting a company
  const handleSelect = async (companyName: string) => {
    setSelectedCompanyName(companyName);
    setInputValue(companyName);

    // Check if company exists in database, if not create it
    let companyId = "";
    const existingCompany = dbCompanies.find(
      (c) => c.name.toLowerCase() === companyName.toLowerCase()
    );

    if (existingCompany) {
      companyId = existingCompany.id;
      onChange(companyId, companyName);
    } else {
      // Company doesn't exist in DB, create it
      try {
        const response = await fetch("/api/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: companyName,
            slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          }),
        });

        if (response.ok) {
          const newCompany = await response.json();
          companyId = newCompany.id;
          // Add to database companies list
          setDbCompanies([...dbCompanies, newCompany]);
          onChange(companyId, companyName);
        } else {
          console.error("Failed to create company");
          // Still allow selection even if creation fails
          onChange("", companyName);
        }
      } catch (err) {
        console.error("Failed to create company:", err);
        onChange("", companyName);
      }
    }

    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle creating a new company (custom entry)
  const handleCreateCompany = async () => {
    const companyName = inputValue.trim();
    if (!companyName) return;
    await handleSelect(companyName);
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCompanies.length > 0) {
        handleSelect(filteredCompanies[0]);
      } else if (inputValue.trim()) {
        handleCreateCompany();
      }
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

  const showCreateOption =
    inputValue.trim() &&
    !companies.some(
      (name) => name.toLowerCase() === inputValue.trim().toLowerCase()
    ) &&
    !selectedCompanyName;

  return (
    <div className={`relative ${className}`}>
      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none focus-visible:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${
          error
            ? "border-destructive"
            : ""
        }`}
      />

      {/* Dropdown suggestions */}
      {isOpen && (filteredCompanies.length > 0 || showCreateOption || inputValue.trim()) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-card border border-border rounded-md shadow-lg"
        >
          {/* Suggestions from list */}
          {filteredCompanies.slice(0, 25).map((companyName) => (
            <button
              key={companyName}
              type="button"
              onClick={() => handleSelect(companyName)}
              className="w-full text-left px-4 py-2 text-sm text-card-foreground hover:bg-muted/30 focus:bg-muted/30 focus:outline-none transition-colors"
            >
              {companyName}
            </button>
          ))}

          {/* Create new company option */}
          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreateCompany}
              className="w-full text-left px-4 py-2 text-sm text-card-foreground hover:bg-muted/50 hover:text-foreground focus:bg-muted/50 focus:text-foreground focus:outline-none border-t border-border transition-colors"
            >
              <span className="font-medium">Add &quot;{inputValue.trim()}&quot;</span>
              <span className="text-xs text-muted-foreground ml-2">(create new)</span>
            </button>
          )}

          {/* No results */}
          {filteredCompanies.length === 0 && !showCreateOption && inputValue.trim() && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              No companies found. Type to create a new one.
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

