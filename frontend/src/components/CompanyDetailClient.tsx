"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  Bookmark,
  MapPin,
  Briefcase,
  Clock,
  Users,
  DollarSign,
  Code,
  ArrowLeft,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CompanyWithStats, ReviewWithDetails } from "@/lib/types/database";
import { useAuth } from "@/components/AuthProvider";

const REVIEWS_PER_PAGE = 10;

// Animation variants - fade in only (no y movement)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

interface CompanyDetailClientProps {
  initialCompany: CompanyWithStats;
  initialReviews: ReviewWithDetails[];
  initialRoles: string[];
  initialIsSaved: boolean;
}

export function CompanyDetailClient({
  initialCompany,
  initialReviews,
  initialRoles,
  initialIsSaved,
}: CompanyDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // ===== State Management =====
  
  const [company] = useState<CompanyWithStats>(initialCompany);
  const [reviews] = useState<ReviewWithDetails[]>(initialReviews);
  const [roles] = useState<string[]>(initialRoles);
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    return page > 0 ? page : 1;
  });

  // ===== Filtering =====
  
  // Filter reviews by role
  const filteredReviews = useMemo(() => {
    if (!roleFilter) return reviews;
    return reviews.filter((r) => r.role?.title === roleFilter);
  }, [reviews, roleFilter]);

  // ===== Pagination =====
  
  // Paginate filtered reviews
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
    const endIndex = startIndex + REVIEWS_PER_PAGE;
    return filteredReviews.slice(startIndex, endIndex);
  }, [filteredReviews, currentPage]);

  const total = filteredReviews.length;
  const totalPages = Math.ceil(total / REVIEWS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // ===== URL Sync & Effects =====
  
  // Reset to page 1 when role filter changes
  const prevRoleFilterRef = useRef(roleFilter);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevRoleFilterRef.current = roleFilter;
      return;
    }

    // Reset page if role filter changed and not already on page 1
    if (prevRoleFilterRef.current !== roleFilter && currentPage !== 1) {
      setCurrentPage(1);
    }

    prevRoleFilterRef.current = roleFilter;
  }, [roleFilter, currentPage]);

  // Update URL when role filter or page changes
  const prevUrlParamsRef = useRef({ roleFilter, currentPage });
  const isUrlInitialMountRef = useRef(true);

  useEffect(() => {
    const currentParams = { roleFilter, currentPage };

    // Skip on initial mount
    if (isUrlInitialMountRef.current) {
      isUrlInitialMountRef.current = false;
      prevUrlParamsRef.current = currentParams;
      return;
    }

    // Check if URL params actually changed
    const urlParamsChanged =
      prevUrlParamsRef.current.roleFilter !== currentParams.roleFilter ||
      prevUrlParamsRef.current.currentPage !== currentParams.currentPage;

    // Update URL only if params changed
    if (urlParamsChanged) {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (currentPage > 1) params.set("page", currentPage.toString());

      const newUrl = `/companies/${company.slug}${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }

    prevUrlParamsRef.current = currentParams;
  }, [roleFilter, currentPage, router, company.slug]);

  // ===== Event Handlers =====
  
  const handleExpandedChange = (reviewId: string, expanded: boolean) => {
    setExpandedReviewIds((prev) => {
      const next = new Set(prev);
      if (expanded) {
        next.add(reviewId);
      } else {
        next.delete(reviewId);
      }
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      window.location.href = "/signin";
      return;
    }

    if (!company || isSaving) return;

    setIsSaving(true);
    const previousState = isSaved;
    setIsSaved(!isSaved);

    try {
      const response = await fetch(`/api/companies/save/${company.id}`, {
        method: isSaved ? "DELETE" : "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle save");
      }

      const data = await response.json();
      setIsSaved(data.saved);
    } catch (error) {
      console.error("Failed to save company:", error);
      setIsSaved(previousState);
    } finally {
      setIsSaving(false);
    }
  };

  const workStyleBadge = {
    onsite: "bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/20",
    hybrid: "bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/20",
    remote: "bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/20",
  } as const;

  const formatPayRange = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return null;
    if (min === max || !max) return `$${min?.toFixed(0)} ${currency}`;
    if (!min) return `$${max.toFixed(0)} ${currency}`;
    return `$${min.toFixed(0)}-${max.toFixed(0)} ${currency}`;
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/companies");
              }
            }}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </motion.div>

        {/* Company Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Logo and Basic Info */}
                <div className="flex items-center gap-4 flex-1">
                  <CompanyLogo
                    companyName={company.name}
                    logoUrl={company.logo_url}
                    size={80}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                          {company.name}
                        </h1>
                        {company.industry && (
                          <p className="text-muted-foreground">{company.industry}</p>
                        )}
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                          >
                            {company.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>

                      {/* Save Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveToggle}
                        disabled={isSaving}
                        className="gap-2"
                        aria-label={isSaved ? "Unsave company" : "Save company"}
                      >
                        <Bookmark
                          className={`size-4 ${isSaved ? "fill-current" : ""}`}
                        />
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                    </div>

                    {/* Review count badge */}
                    <div className="flex items-center gap-2 mt-4">
                      <Badge variant="outline">
                        {company.review_count} {company.review_count === 1 ? "review" : "reviews"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* Pay */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-4 pb-4 h-full flex flex-col justify-between min-h-[100px]">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="size-4" />
                  <span className="text-sm">Pay Range</span>
                </div>
                <div className="text-lg font-semibold">
                  {(company.min_pay_cad || company.min_pay_usd) ? (
                    <div className="space-y-1">
                      {(company.min_pay_usd || company.max_pay_usd) && (
                        <div>{formatPayRange(company.min_pay_usd, company.max_pay_usd, "USD")}/hr</div>
                      )}
                      {(company.min_pay_cad || company.max_pay_cad) && (
                        <div>{formatPayRange(company.min_pay_cad, company.max_pay_cad, "CAD")}/hr</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground font-normal">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Interview Rounds */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-4 pb-4 h-full flex flex-col justify-between min-h-[100px]">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="size-4" />
                  <span className="text-sm">Avg Interview Rounds</span>
                </div>
                <div className="text-lg font-semibold">
                  {company.avg_interview_rounds ? (
                    <>~{Math.round(company.avg_interview_rounds)} rounds</>
                  ) : (
                    <span className="text-muted-foreground font-normal">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Duration */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-4 pb-4 h-full flex flex-col justify-between min-h-[100px]">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="size-4" />
                  <span className="text-sm">Typical Term</span>
                </div>
                <div className="text-lg font-semibold">
                  {company.avg_duration_months ? (
                    <>~{Math.round(company.avg_duration_months)} months</>
                  ) : (
                    <span className="text-muted-foreground font-normal">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Work Style */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-4 pb-4 h-full flex flex-col justify-between min-h-[100px]">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Briefcase className="size-4" />
                  <span className="text-sm">Work Style</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {company.work_style_breakdown.onsite > 0 ||
                  company.work_style_breakdown.hybrid > 0 ||
                  company.work_style_breakdown.remote > 0 ? (
                    <>
                      {company.work_style_breakdown.onsite > 0 && (
                        <Badge className={workStyleBadge.onsite}>
                          Onsite ({company.work_style_breakdown.onsite})
                        </Badge>
                      )}
                      {company.work_style_breakdown.hybrid > 0 && (
                        <Badge className={workStyleBadge.hybrid}>
                          Hybrid ({company.work_style_breakdown.hybrid})
                        </Badge>
                      )}
                      {company.work_style_breakdown.remote > 0 && (
                        <Badge className={workStyleBadge.remote}>
                          Remote ({company.work_style_breakdown.remote})
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground font-normal">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Common Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          {/* Common Roles */}
          {company.common_roles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="size-4" />
                  Common Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {company.common_roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Common Locations */}
          {company.common_locations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="size-4" />
                  Locations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {company.common_locations.map((location) => (
                    <Badge key={location} variant="outline">
                      {location}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technologies */}
          {company.common_technologies.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="size-4" />
                  Technologies
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {company.common_technologies.map((tech) => (
                    <Badge key={tech} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold">
              Reviews ({total})
            </h2>

            {/* Role Filter */}
            {roles.length > 1 && (
              <Field className="w-full sm:w-64">
                <FieldLabel htmlFor="role-filter" className="sr-only">
                  Filter by role
                </FieldLabel>
                <Select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          {/* Reviews Count */}
          <div className="mb-4 text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {(currentPage - 1) * REVIEWS_PER_PAGE + 1}-{Math.min(currentPage * REVIEWS_PER_PAGE, total)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{total}</span>{" "}
            {total === 1 ? "review" : "reviews"}
            {roleFilter && ` for ${roleFilter}`}
          </div>

          {/* Reviews List */}
          {paginatedReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {roleFilter
                      ? "No reviews for this role. Try selecting a different role."
                      : "No reviews yet for this company."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 mb-8">
                {paginatedReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    compact={true}
                    expanded={expandedReviewIds.has(review.id)}
                    onExpandedChange={handleExpandedChange}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
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
        </motion.div>
      </div>
      <Footer />
    </main>
  );
}

