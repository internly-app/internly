"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import type { CompanyWithStats, ReviewWithDetails } from "@/lib/types/database";
import { useAuth } from "@/components/AuthProvider";

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

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();

  const [company, setCompany] = useState<CompanyWithStats | null>(null);
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set());

  // Fetch company data
  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/companies/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Company not found");
          } else {
            throw new Error("Failed to fetch company");
          }
          return;
        }
        const data = await response.json();
        setCompany(data.company);
        setReviews(data.reviews);
        setRoles(data.roles);
        setIsSaved(data.company.user_has_saved || false);
      } catch (err) {
        console.error("Failed to fetch company:", err);
        setError("Failed to load company. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [slug]);

  // Filter reviews by role
  const filteredReviews = useMemo(() => {
    if (!roleFilter) return reviews;
    return reviews.filter((r) => r.role?.title === roleFilter);
  }, [reviews, roleFilter]);

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

  const workLocationBadge = {
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

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-48 w-full rounded-xl mb-8" />
          <Skeleton className="h-64 w-full rounded-xl mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Footer />
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full">
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
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button asChild>
                  <Link href="/companies">Browse Companies</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </main>
    );
  }

  if (!company) return null;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />

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
                <div className="flex items-start gap-4 flex-1">
                  <CompanyLogo
                    companyName={company.name}
                    size={80}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
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

          {/* Work Location */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-4 pb-4 h-full flex flex-col justify-between min-h-[100px]">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Briefcase className="size-4" />
                  <span className="text-sm">Work Location</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {company.work_location_breakdown.onsite > 0 ||
                  company.work_location_breakdown.hybrid > 0 ||
                  company.work_location_breakdown.remote > 0 ? (
                    <>
                      {company.work_location_breakdown.onsite > 0 && (
                        <Badge className={workLocationBadge.onsite}>
                          Onsite ({company.work_location_breakdown.onsite})
                        </Badge>
                      )}
                      {company.work_location_breakdown.hybrid > 0 && (
                        <Badge className={workLocationBadge.hybrid}>
                          Hybrid ({company.work_location_breakdown.hybrid})
                        </Badge>
                      )}
                      {company.work_location_breakdown.remote > 0 && (
                        <Badge className={workLocationBadge.remote}>
                          Remote ({company.work_location_breakdown.remote})
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
              Reviews ({filteredReviews.length})
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

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
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
            <div className="grid gap-4">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  compact={true}
                  expanded={expandedReviewIds.has(review.id)}
                  onExpandedChange={handleExpandedChange}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </main>
  );
}

