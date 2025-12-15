"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X, Filter, ChevronLeft, ChevronRight } from "lucide-react";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { CustomSelect } from "@/components/CustomSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviews } from "@/hooks/useReviews";
import { sanitizeText } from "@/lib/security/content-filter";
import { useDebounce } from "@/hooks/useDebounce";
import { fuzzyMatch, fuzzyMatchMultiple } from "@/lib/utils/fuzzy-match";
import type { ReviewWithDetails } from "@/lib/types/database";

const REVIEWS_PER_PAGE = 15;

export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ===== State Management =====
  
  // Filter states (initialized from URL params)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [companyFilter, setCompanyFilter] = useState(searchParams.get("company") || "");
  const [workStyleFilter, setWorkStyleFilter] = useState(searchParams.get("work_style") || "");
  const [sortBy, setSortBy] = useState<"likes" | "recent">(
    (searchParams.get("sort") as "likes" | "recent") || "recent"
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    return page > 0 ? page : 1;
  });

  // Debounce search query to reduce unnecessary filtering (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Companies list for filter dropdown
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // UI state
  const [optimisticReview, setOptimisticReview] = useState<ReviewWithDetails | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // ===== Data Fetching =====
  
  // Fetch companies for filter dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies");
        if (response.ok) {
          const data = await response.json();
          setCompanies(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // Build query params for reviews API
  // When searching, fetch all reviews for client-side filtering
  // Otherwise, use pagination
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      sort: sortBy,
    };

    // Search mode: fetch all reviews for client-side filtering (use debounced query)
    if (debouncedSearchQuery.trim()) {
      params.limit = 1000;
      params.offset = 0;
    } else {
      // Pagination mode: fetch only current page
      params.limit = REVIEWS_PER_PAGE;
      params.offset = (currentPage - 1) * REVIEWS_PER_PAGE;
    }

    // Validate and add filters
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (companyFilter && uuidRegex.test(companyFilter)) {
      params.company_id = companyFilter;
    }

    const validWorkStyles = ["onsite", "hybrid", "remote"];
    if (workStyleFilter && validWorkStyles.includes(workStyleFilter)) {
      params.work_style = workStyleFilter;
    }

    return params;
  }, [companyFilter, workStyleFilter, sortBy, currentPage, debouncedSearchQuery]);

  const { reviews: fetchedReviews, total, loading, error } = useReviews(queryParams);
  
  // ===== Optimistic UI Updates =====
  
  // Load optimistic review from sessionStorage (set after review creation)
  useEffect(() => {
    const newlyCreatedReviewStr = sessionStorage.getItem("newlyCreatedReview");
    if (newlyCreatedReviewStr) {
      try {
        const review = JSON.parse(newlyCreatedReviewStr) as ReviewWithDetails;
        setOptimisticReview(review);
        sessionStorage.removeItem("newlyCreatedReview");
      } catch (err) {
        console.error("Failed to parse newly created review:", err);
        sessionStorage.removeItem("newlyCreatedReview");
      }
    }
  }, []);

  // Clear optimistic review once it appears in fetched reviews
  useEffect(() => {
    if (optimisticReview && fetchedReviews.some((r) => r.id === optimisticReview.id)) {
      setOptimisticReview(null);
    }
  }, [optimisticReview, fetchedReviews]);

  // Combine fetched reviews with optimistic review
  const reviews = useMemo(() => {
    if (!optimisticReview) return fetchedReviews;
    
    const exists = fetchedReviews.some((r) => r.id === optimisticReview.id);
    if (exists) return fetchedReviews;
    
    return [optimisticReview, ...fetchedReviews];
  }, [fetchedReviews, optimisticReview]);

  // ===== Filtering & Search =====
  
  // Enhanced search with fuzzy matching and debouncing
  const filteredReviews = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return reviews;

    const sanitizedQuery = sanitizeText(debouncedSearchQuery).slice(0, 200).trim();
    if (!sanitizedQuery) return reviews;

    // Split query into words for better matching
    const queryWords = sanitizedQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);

    // Score and filter reviews using fuzzy matching
    const reviewsWithScores = reviews
      .map((review) => {
        // Build searchable text array
        const searchableTexts = [
          review.company.name,
          review.role.title,
          review.location,
          review.term,
          review.technologies,
          review.team_name,
        ].filter((field): field is string => Boolean(field));

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
        const companyMatch = review.company.name.toLowerCase().includes(sanitizedQuery.toLowerCase());
        if (companyMatch) {
          score = Math.max(score, 0.9);
        }

        return { review, score };
      })
      .filter(({ score }) => score > 0) // Only include reviews with some match
      .sort((a, b) => {
        // Sort by score (highest first)
        if (Math.abs(a.score - b.score) > 0.01) {
          return b.score - a.score;
        }
        // Then by created date (most recent first) or likes (depending on sortBy)
        if (sortBy === "likes") {
          return (b.review.like_count || 0) - (a.review.like_count || 0);
        }
        return new Date(b.review.created_at).getTime() - new Date(a.review.created_at).getTime();
      })
      .map(({ review }) => review);

    return reviewsWithScores;
  }, [reviews, debouncedSearchQuery, sortBy]);
  
  // ===== URL Sync & Filter Effects =====
  
  // Helper to check if filter values changed
  const getFilterValues = () => ({
    searchQuery: debouncedSearchQuery,
    companyFilter,
    workStyleFilter,
    sortBy,
  });

  // Reset to page 1 when filters change (skip on initial mount)
  const prevFiltersRef = useRef(getFilterValues());
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const currentFilters = getFilterValues();

    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevFiltersRef.current = currentFilters;
      return;
    }

    // Check if filters actually changed
    const filtersChanged =
      prevFiltersRef.current.searchQuery !== currentFilters.searchQuery ||
      prevFiltersRef.current.companyFilter !== currentFilters.companyFilter ||
      prevFiltersRef.current.workStyleFilter !== currentFilters.workStyleFilter ||
      prevFiltersRef.current.sortBy !== currentFilters.sortBy;

    // Reset page if filters changed and not already on page 1
    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1);
    }

    prevFiltersRef.current = currentFilters;
  }, [debouncedSearchQuery, companyFilter, workStyleFilter, sortBy, currentPage]);

  // Update URL when filters or page change (skip on initial mount to prevent infinite loop)
  const prevUrlParamsRef = useRef({
    ...getFilterValues(),
    currentPage,
  });
  const isUrlInitialMountRef = useRef(true);

  useEffect(() => {
    const currentParams = {
      ...getFilterValues(),
      currentPage,
    };

    // Skip on initial mount
    if (isUrlInitialMountRef.current) {
      isUrlInitialMountRef.current = false;
      prevUrlParamsRef.current = currentParams;
      return;
    }

    // Check if URL params actually changed
    const urlParamsChanged =
      prevUrlParamsRef.current.searchQuery !== currentParams.searchQuery ||
      prevUrlParamsRef.current.companyFilter !== currentParams.companyFilter ||
      prevUrlParamsRef.current.workStyleFilter !== currentParams.workStyleFilter ||
      prevUrlParamsRef.current.sortBy !== currentParams.sortBy ||
      prevUrlParamsRef.current.currentPage !== currentParams.currentPage;

    // Update URL only if params changed
    if (urlParamsChanged) {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.set("search", sanitizeText(debouncedSearchQuery));
      if (companyFilter) params.set("company", companyFilter);
      if (workStyleFilter) params.set("work_style", workStyleFilter);
      if (sortBy && sortBy !== "recent") params.set("sort", sortBy);
      if (currentPage > 1) params.set("page", currentPage.toString());

      const newUrl = `/reviews${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }

    prevUrlParamsRef.current = currentParams;
  }, [debouncedSearchQuery, companyFilter, workStyleFilter, sortBy, currentPage, router]);
  
  // ===== Event Handlers =====
  
  const handleExpandedChange = (reviewId: string, expanded: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (expanded) {
        next.add(reviewId);
      } else {
        next.delete(reviewId);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCompanyFilter("");
    setWorkStyleFilter("");
    setSortBy("recent");
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ===== Computed Values =====
  
  const totalPages = Math.ceil(total / REVIEWS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  const hasActiveFilters = searchQuery || companyFilter || workStyleFilter || sortBy !== "recent";
  
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <motion.div 
        className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="mb-8 sm:mb-12 max-w-5xl mx-auto text-center">
          <h1 className="text-heading-1 mb-4 text-foreground">Browse Reviews</h1>
          <p className="text-lg text-muted-foreground">
            Discover real internship experiences from students. Filter by company, role, location, and more.
          </p>
        </div>
        
        {/* Search and Filters */}
        <Card className="mb-8 max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="size-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {/* Search Bar */}
              <Field>
                <FieldLabel htmlFor="search">Search</FieldLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by company, role, location, technologies..."
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
              
              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Company Filter */}
                <Field>
                  <FieldLabel htmlFor="company">Company</FieldLabel>
                  <CustomSelect
                    id="company"
                    value={companyFilter}
                    onChange={setCompanyFilter}
                    options={[
                      { value: "", label: "All companies" },
                      ...(loadingCompanies
                        ? []
                        : companies
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((company) => ({
                              value: company.id,
                              label: company.name,
                            }))
                      ),
                    ]}
                    placeholder="All companies"
                    searchable={false}
                  />
                </Field>
                
                {/* Work Style Filter */}
                <Field>
                  <FieldLabel htmlFor="work_style">Work Style</FieldLabel>
                  <CustomSelect
                    id="work_style"
                    value={workStyleFilter}
                    onChange={setWorkStyleFilter}
                    options={[
                      { value: "", label: "All styles" },
                      { value: "onsite", label: "Onsite" },
                      { value: "hybrid", label: "Hybrid" },
                      { value: "remote", label: "Remote" },
                    ]}
                    placeholder="All styles"
                    searchable={false}
                  />
                </Field>
                
                {/* Sort */}
                <Field>
                  <FieldLabel htmlFor="sort">Sort By</FieldLabel>
                  <CustomSelect
                    id="sort"
                    value={sortBy}
                    onChange={(value) => setSortBy(value as "likes" | "recent")}
                    options={[
                      { value: "recent", label: "Most Recent" },
                      { value: "likes", label: "Most Liked" },
                    ]}
                    placeholder="Sort by..."
                    searchable={false}
                  />
                </Field>
                
                {/* Clear Filters */}
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <Button
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="size-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
        
        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4 max-w-5xl mx-auto">
          <p className="text-sm text-muted-foreground">
            {loading ? (
              "Loading..."
            ) : (
              <>
                Showing <span className="font-semibold text-foreground">
                  {debouncedSearchQuery ? filteredReviews.length : (currentPage - 1) * REVIEWS_PER_PAGE + 1}-{Math.min(currentPage * REVIEWS_PER_PAGE, total)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{total}</span>{" "}
                {total === 1 ? "review" : "reviews"}
                {debouncedSearchQuery && filteredReviews.length < total && ` (${total} total)`}
              </>
            )}
          </p>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <Card className="max-w-5xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-destructive mb-4">Error loading reviews: {error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* No Results */}
        {!loading && !error && filteredReviews.length === 0 && (
          <Card className="max-w-5xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? "No reviews match your filters. Try adjusting your search criteria or clear filters above."
                    : "No reviews yet. Be the first to share your experience!"}
                </p>
                {!hasActiveFilters && (
                  <Button asChild>
                    <a href="/write-review">Write a Review</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Grid */}
        {!loading && !error && filteredReviews.length > 0 && (
          <>
            <div className="grid gap-4 max-w-5xl mx-auto mb-8">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  compact={true}
                  expanded={expandedIds.has(review.id)}
                  onExpandedChange={handleExpandedChange}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {!debouncedSearchQuery && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 max-w-5xl mx-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage || loading}
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
                        disabled={loading}
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
                  disabled={!hasNextPage || loading}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </motion.div>
      <Footer />
    </main>
  );
}

