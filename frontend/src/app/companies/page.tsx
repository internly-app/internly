"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CompanyCard from "@/components/CompanyCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Building2 } from "lucide-react";
import { sanitizeText } from "@/lib/security/content-filter";
import type { CompanyWithStats } from "@/lib/types/database";

export const dynamic = 'force-dynamic';

export default function CompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if initial load animation has played
  const hasAnimated = useRef(false);

  // Fetch companies with stats
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/companies/with-stats");
        if (!response.ok) {
          throw new Error("Failed to fetch companies");
        }
        const data = await response.json();
        setCompanies(data || []);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
        setError("Failed to load companies. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Improved search with word matching and fuzzy search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;

    const sanitizedQuery = sanitizeText(searchQuery).slice(0, 200).toLowerCase().trim();
    if (!sanitizedQuery) return companies;

    // Split query into words for better matching
    const queryWords = sanitizedQuery.split(/\s+/).filter(word => word.length > 0);

    return companies.filter((company) => {
      const searchableText = [
        company.name,
        company.industry || "",
        ...company.common_technologies,
        ...company.common_locations,
        ...company.common_roles,
      ].join(" ").toLowerCase();

      // Check if ALL query words are found (AND logic for multi-word search)
      return queryWords.every(word => searchableText.includes(word));
    }).sort((a, b) => {
      // Prioritize exact company name matches
      const aNameMatch = a.name.toLowerCase().includes(sanitizedQuery);
      const bNameMatch = b.name.toLowerCase().includes(sanitizedQuery);
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Then sort by review count (more reviews = more relevant)
      return b.review_count - a.review_count;
    });
  }, [companies, searchQuery]);

  // Update URL when search changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", sanitizeText(searchQuery));

    const newUrl = `/companies${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, router]);

  const handleSaveToggle = (companyId: string, saved: boolean) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === companyId ? { ...c, user_has_saved: saved } : c
      )
    );
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-8 sm:mb-12 max-w-5xl mx-auto text-center"
        >
          <h1 className="text-heading-1 mb-4 text-foreground">Browse Companies</h1>
          <p className="text-lg text-muted-foreground">
            Explore companies with internship reviews. See pay data, interview processes, and more.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="mb-8 max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                Search Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="search">Search</FieldLabel>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search by company name, technologies, location, roles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                      maxLength={200}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 flex items-center justify-between flex-wrap gap-4 max-w-5xl mx-auto"
        >
          <p className="text-sm text-muted-foreground">
            {loading ? (
              "Loading..."
            ) : (
              <>
                Showing <span className="font-semibold text-foreground">{filteredCompanies.length}</span>{" "}
                {filteredCompanies.length === 1 ? "company" : "companies"}
                {searchQuery && ` matching "${searchQuery}"`}
              </>
            )}
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="max-w-5xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-primary hover:underline"
                >
                  Try Again
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {!loading && !error && filteredCompanies.length === 0 && (
          <Card className="max-w-5xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "No companies match your search. Try adjusting your query."
                    : "No companies with reviews yet."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Companies Grid */}
        {!loading && !error && filteredCompanies.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial={hasAnimated.current ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={() => {
              hasAnimated.current = true;
            }}
          >
            {filteredCompanies.map((company) => (
              <div key={company.id}>
                <CompanyCard company={company} onSaveToggle={handleSaveToggle} />
              </div>
            ))}
          </motion.div>
        )}
      </div>
      <Footer />
    </main>
  );
}

