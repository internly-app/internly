"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import CompanyCard from "@/components/CompanyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Search, X, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { sanitizeText } from "@/lib/security/content-filter";
import { useDebounce } from "@/hooks/useDebounce";
import { fuzzyMatch, fuzzyMatchMultiple } from "@/lib/utils/fuzzy-match";
import type { CompanyWithStats } from "@/lib/types/database";

const COMPANIES_PER_PAGE = 15;

interface CompaniesPageClientProps {
  initialCompanies: CompanyWithStats[];
  initialSearchQuery?: string;
}

export function CompaniesPageClient({
  initialCompanies,
  initialSearchQuery = "",
}: CompaniesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ===== State Management =====
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || initialSearchQuery
  );
  const [companies, setCompanies] = useState<CompanyWithStats[]>(initialCompanies);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    return page > 0 ? page : 1;
  });

  // Track if initial load animation has played
  const hasAnimated = useRef(false);

  // Debounce search query to reduce unnecessary filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sync companies state when initialCompanies changes (e.g., after server revalidation)
  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  // ===== Filtering & Search =====
  
  // Enhanced search with fuzzy matching and word matching
  const filteredCompanies = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return companies;

    const sanitizedQuery = sanitizeText(debouncedSearchQuery).slice(0, 200).trim();
    if (!sanitizedQuery) return companies;

    // Split query into words for better matching
    const queryWords = sanitizedQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);

    // Score and filter companies using fuzzy matching
    const companiesWithScores = companies
      .map((company) => {
        // Build searchable text array
        const searchableTexts = [
          company.name,
          company.industry || "",
          ...company.common_technologies,
          ...company.common_locations,
          ...company.common_roles,
        ].filter(Boolean);

        // Calculate match scores
        const exactMatch = searchableTexts.some(text =>
          text.toLowerCase().includes(sanitizedQuery.toLowerCase())
        );

        // For multi-word queries, check if all words are present
        const allWordsMatch = queryWords.every(word =>
          searchableTexts.some(text => text.toLowerCase().includes(word))
        );

        // Fuzzy match score
        const fuzzyScore = fuzzyMatchMultiple(sanitizedQuery, searchableTexts);

        // Calculate final score
        let score = 0;
        if (exactMatch) {
          score = 1.0;
        } else if (allWordsMatch) {
          score = 0.8;
        } else if (fuzzyScore > 0) {
          score = fuzzyScore;
        }

        // Bonus for company name matches
        const nameMatch = company.name.toLowerCase().includes(sanitizedQuery.toLowerCase());
        if (nameMatch) {
          score = Math.max(score, 0.9);
        }

        return { company, score };
      })
      .filter(({ score }) => score > 0) // Only include companies with some match
      .sort((a, b) => {
        // Sort by score (highest first)
        if (Math.abs(a.score - b.score) > 0.01) {
          return b.score - a.score;
        }
        // Then by review count (more reviews = more relevant)
        return b.company.review_count - a.company.review_count;
      })
      .map(({ company }) => company);

    return companiesWithScores;
  }, [companies, debouncedSearchQuery]);

  // ===== Pagination =====
  
  // Paginate filtered companies (when not searching, show paginated results)
  const paginatedCompanies = useMemo(() => {
    if (debouncedSearchQuery.trim()) {
      // When searching, show all results (no pagination)
      return filteredCompanies;
    }
    
    // Otherwise, paginate
    const startIndex = (currentPage - 1) * COMPANIES_PER_PAGE;
    const endIndex = startIndex + COMPANIES_PER_PAGE;
    return filteredCompanies.slice(startIndex, endIndex);
  }, [filteredCompanies, currentPage, debouncedSearchQuery]);

  const total = filteredCompanies.length;
  const totalPages = Math.ceil(total / COMPANIES_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // ===== URL Sync & Effects =====
  
  // Reset to page 1 when debounced search changes
  const prevDebouncedSearchRef = useRef(debouncedSearchQuery);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const currentSearch = debouncedSearchQuery;
    
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevDebouncedSearchRef.current = currentSearch;
      return;
    }
    
    // Reset page if search changed
    if (prevDebouncedSearchRef.current !== currentSearch && currentPage !== 1) {
      setCurrentPage(1);
    }
    
    prevDebouncedSearchRef.current = currentSearch;
  }, [debouncedSearchQuery, currentPage]);

  // Update URL when debounced search or page changes
  const prevUrlParamsRef = useRef({ searchQuery: debouncedSearchQuery, currentPage });
  const isUrlInitialMountRef = useRef(true);

  useEffect(() => {
    const currentParams = { searchQuery: debouncedSearchQuery, currentPage };

    // Skip on initial mount
    if (isUrlInitialMountRef.current) {
      isUrlInitialMountRef.current = false;
      prevUrlParamsRef.current = currentParams;
      return;
    }

    // Check if URL params actually changed
    const urlParamsChanged =
      prevUrlParamsRef.current.searchQuery !== currentParams.searchQuery ||
      prevUrlParamsRef.current.currentPage !== currentParams.currentPage;

    // Update URL only if params changed
    if (urlParamsChanged) {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.set("search", sanitizeText(debouncedSearchQuery));
      if (currentPage > 1) params.set("page", currentPage.toString());

      const newUrl = `/companies${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }

    prevUrlParamsRef.current = currentParams;
  }, [debouncedSearchQuery, currentPage, router]);

  // ===== Event Handlers =====
  
  const handleSaveToggle = (companyId: string, saved: boolean) => {
    // Update local state to reflect save/unsave changes
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === companyId ? { ...c, user_has_saved: saved } : c
      )
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
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
            {debouncedSearchQuery ? (
              <>
                Showing <span className="font-semibold text-foreground">{filteredCompanies.length}</span>{" "}
                {filteredCompanies.length === 1 ? "company" : "companies"}
                {` matching "${debouncedSearchQuery}"`}
              </>
            ) : (
              <>
                Showing <span className="font-semibold text-foreground">
                  {(currentPage - 1) * COMPANIES_PER_PAGE + 1}-{Math.min(currentPage * COMPANIES_PER_PAGE, total)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{total}</span>{" "}
                {total === 1 ? "company" : "companies"}
              </>
            )}
          </p>
        </motion.div>

        {/* No Results */}
        {filteredCompanies.length === 0 && (
          <Card className="max-w-5xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {debouncedSearchQuery
                    ? "No companies match your search. Try adjusting your query."
                    : "No companies with reviews yet."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Companies Grid */}
        {paginatedCompanies.length > 0 && (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8"
              initial={hasAnimated.current ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              onAnimationComplete={() => {
                hasAnimated.current = true;
              }}
            >
              {paginatedCompanies.map((company) => (
                <div key={company.id}>
                  <CompanyCard company={company} onSaveToggle={handleSaveToggle} />
                </div>
              ))}
            </motion.div>

            {/* Pagination Controls */}
            {!debouncedSearchQuery && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 max-w-5xl mx-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage}
                  className="gap-2"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}

