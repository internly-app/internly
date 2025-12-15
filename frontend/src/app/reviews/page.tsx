"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useReviews } from "@/hooks/useReviews";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { sanitizeText } from "@/lib/security/content-filter";
import type { ReviewWithDetails } from "@/lib/types/database";

export const dynamic = 'force-dynamic';

const REVIEWS_PER_PAGE = 15;

export default function ReviewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter states
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
  
  // Companies list for filter
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  
  // Fetch companies for filter
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
  
  // Build query params with validation
  // When searching, fetch all reviews for client-side filtering
  // Otherwise, use pagination
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      sort: sortBy,
    };
    
    // If there's a search query, fetch all reviews (high limit for client-side filtering)
    // Otherwise, use pagination
    if (searchQuery.trim()) {
      params.limit = 1000; // High limit to fetch all reviews for search
      params.offset = 0;
    } else {
      params.limit = REVIEWS_PER_PAGE;
      params.offset = (currentPage - 1) * REVIEWS_PER_PAGE;
    }
    
    // Validate company_id is a valid UUID format
    if (companyFilter && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyFilter)) {
      params.company_id = companyFilter;
    }
    
    // Validate work_style is one of the allowed values
    if (workStyleFilter && ["onsite", "hybrid", "remote"].includes(workStyleFilter)) {
      params.work_style = workStyleFilter;
    }
    
    return params;
  }, [companyFilter, workStyleFilter, sortBy, currentPage, searchQuery]);
  
  const { reviews: fetchedReviews, total, loading, error } = useReviews(queryParams);
  const [optimisticReview, setOptimisticReview] = useState<ReviewWithDetails | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Optimistically add newly created review to the list
  useEffect(() => {
    const newlyCreatedReviewStr = sessionStorage.getItem("newlyCreatedReview");
    if (newlyCreatedReviewStr) {
      try {
        const newlyCreatedReview = JSON.parse(newlyCreatedReviewStr) as ReviewWithDetails;
        setOptimisticReview(newlyCreatedReview);
        // Clear sessionStorage after reading
        sessionStorage.removeItem("newlyCreatedReview");
      } catch (err) {
        console.error("Failed to parse newly created review:", err);
        sessionStorage.removeItem("newlyCreatedReview");
      }
    }
  }, []);
  
  // Clear optimistic review when it appears in fetched reviews
  useEffect(() => {
    if (optimisticReview && fetchedReviews.some(r => r.id === optimisticReview.id)) {
      setOptimisticReview(null);
    }
  }, [optimisticReview, fetchedReviews]);
  
  // Combine fetched reviews with optimistic review (if not already in list)
  const reviews = useMemo(() => {
    if (!optimisticReview) return fetchedReviews;
    const exists = fetchedReviews.some(r => r.id === optimisticReview.id);
    if (exists) {
      // If it's already in the fetched list, return fetched reviews only
      // (the useEffect above will clear the optimistic state)
      return fetchedReviews;
    }
    // Add optimistic review to the beginning
    return [optimisticReview, ...fetchedReviews];
  }, [fetchedReviews, optimisticReview]);

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
  
  // Filter reviews by search query (client-side for text search)
  // Sanitize search query to prevent XSS
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    
    // Sanitize and limit search query length
    const sanitizedQuery = sanitizeText(searchQuery).slice(0, 200).toLowerCase();
    if (!sanitizedQuery) return reviews;
    
    return reviews.filter((review) => {
      const companyName = review.company.name.toLowerCase();
      const roleName = review.role.title.toLowerCase();
      const location = review.location?.toLowerCase() || "";
      const term = review.term?.toLowerCase() || "";
      const technologies = review.technologies?.toLowerCase() || "";
      const teamName = review.team_name?.toLowerCase() || "";
      
      return (
        companyName.includes(sanitizedQuery) ||
        roleName.includes(sanitizedQuery) ||
        location.includes(sanitizedQuery) ||
        term.includes(sanitizedQuery) ||
        technologies.includes(sanitizedQuery) ||
        teamName.includes(sanitizedQuery)
      );
    });
  }, [reviews, searchQuery]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, companyFilter, workStyleFilter, sortBy]);

  // Update URL when filters or page change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", sanitizeText(searchQuery));
    if (companyFilter) params.set("company", companyFilter);
    if (workStyleFilter) params.set("work_style", workStyleFilter);
    if (sortBy) params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());
    
    const newUrl = `/reviews${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, companyFilter, workStyleFilter, sortBy, currentPage, router]);
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setCompanyFilter("");
    setWorkStyleFilter("");
    setSortBy("recent");
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(total / REVIEWS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  
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
                  <Select
                    id="company"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  >
                    <option value="">All companies</option>
                    {loadingCompanies ? (
                      <option value="loading" disabled>Loading...</option>
                    ) : (
                      companies
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))
                    )}
                  </Select>
                </Field>
                
                {/* Work Style Filter */}
                <Field>
                  <FieldLabel htmlFor="work_style">Work Style</FieldLabel>
                  <Select
                    id="work_style"
                    value={workStyleFilter}
                    onChange={(e) => setWorkStyleFilter(e.target.value)}
                  >
                    <option value="">All styles</option>
                    <option value="onsite">Onsite</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </Select>
                </Field>
                
                {/* Sort */}
                <Field>
                  <FieldLabel htmlFor="sort">Sort By</FieldLabel>
                  <Select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "likes" | "recent")}
                  >
                    <option value="recent">Most Recent</option>
                    <option value="likes">Most Liked</option>
                  </Select>
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
                  {searchQuery ? filteredReviews.length : (currentPage - 1) * REVIEWS_PER_PAGE + 1}-{Math.min(currentPage * REVIEWS_PER_PAGE, total)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{total}</span>{" "}
                {total === 1 ? "review" : "reviews"}
                {searchQuery && filteredReviews.length < total && ` (${total} total)`}
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
            {!searchQuery && totalPages > 1 && (
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

