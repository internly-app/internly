"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import CompanyCard from "@/components/CompanyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/AuthProvider";
import { FileText, Bookmark, ArrowRight } from "lucide-react";
import type { ReviewWithDetails, CompanyWithStats } from "@/lib/types/database";

// Animation variants - fade in only (no y movement for smoother loading)
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

type Tab = "reviews" | "saved";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("reviews");
  // Initialize from cache if available to prevent loading flash
  const getCachedReviews = (): ReviewWithDetails[] => {
    try {
      const cached = sessionStorage.getItem("profile_myReviews");
      if (cached) {
        const parsed = JSON.parse(cached) as { data: ReviewWithDetails[]; ts: number };
        const CACHE_TTL_MS = 5 * 60 * 1000;
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          return parsed.data || [];
        }
      }
    } catch {}
    return [];
  };

  const getCachedSaved = (): CompanyWithStats[] => {
    try {
      const cached = sessionStorage.getItem("profile_savedCompanies");
      if (cached) {
        const parsed = JSON.parse(cached) as { data: CompanyWithStats[]; ts: number };
        const CACHE_TTL_MS = 5 * 60 * 1000;
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          return parsed.data || [];
        }
      }
    } catch {}
    return [];
  };

  const cachedReviews = getCachedReviews();
  const cachedSaved = getCachedSaved();
  const [myReviews, setMyReviews] = useState<ReviewWithDetails[]>(cachedReviews);
  const [savedCompanies, setSavedCompanies] = useState<CompanyWithStats[]>(cachedSaved);
  const [loadingReviews, setLoadingReviews] = useState(cachedReviews.length === 0);
  const [loadingSaved, setLoadingSaved] = useState(cachedSaved.length === 0);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set());
  const fetchedReviewsForUserId = useRef<string | null>(null);
  const fetchedSavedForUserId = useRef<string | null>(null);
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin?redirect=/profile");
    }
  }, [user, authLoading, router]);

  // Reset when user ID changes (not user object reference)
  useEffect(() => {
    const userId = user?.id || null;
    if (userId !== fetchedReviewsForUserId.current) {
      fetchedReviewsForUserId.current = null;
      fetchedSavedForUserId.current = null;
      // Clear cache when user changes
      if (userId) {
        sessionStorage.removeItem("profile_myReviews");
        sessionStorage.removeItem("profile_savedCompanies");
      }
    }
  }, [user?.id]);

  // Fetch user's reviews and saved companies in parallel - only once per user ID
  useEffect(() => {
    if (!user?.id || authLoading) return;
    if (fetchedReviewsForUserId.current === user.id) return;

    // Try cached data from sessionStorage first
    const cachedReviews = sessionStorage.getItem("profile_myReviews");
    const cachedSaved = sessionStorage.getItem("profile_savedCompanies");
    
    let hasCachedReviews = false;
    let hasCachedSaved = false;

    if (cachedReviews) {
      try {
        const parsed = JSON.parse(cachedReviews) as { data: ReviewWithDetails[]; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          setMyReviews(parsed.data || []);
          setLoadingReviews(false);
          hasCachedReviews = true;
        }
      } catch {
        // ignore cache parse errors
      }
    }

    if (cachedSaved) {
      try {
        const parsed = JSON.parse(cachedSaved) as { data: CompanyWithStats[]; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL_MS) {
          setSavedCompanies(parsed.data || []);
          setLoadingSaved(false);
          hasCachedSaved = true;
        }
      } catch {
        // ignore cache parse errors
      }
    }

    // If both are cached, mark as fetched and return
    if (hasCachedReviews && hasCachedSaved) {
      fetchedReviewsForUserId.current = user.id;
      fetchedSavedForUserId.current = user.id;
      return;
    }

    // Fetch missing data in parallel
    let isCancelled = false;
    
    if (!hasCachedReviews) setLoadingReviews(true);
    if (!hasCachedSaved) setLoadingSaved(true);

    const fetchReviews = fetch("/api/user/reviews").then(async (response) => {
      if (response.ok) {
        return response.json();
      }
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Failed to fetch reviews (${response.status})`);
    });

    const fetchSaved = fetch("/api/user/saved-companies").then(async (response) => {
      if (response.ok) {
        return response.json();
      }
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Failed to fetch saved companies (${response.status})`);
    });

    Promise.allSettled([fetchReviews, fetchSaved]).then((results) => {
      if (isCancelled) return;

      const [reviewsResult, savedResult] = results;

      if (reviewsResult.status === "fulfilled") {
        setMyReviews(reviewsResult.value || []);
        sessionStorage.setItem(
          "profile_myReviews",
          JSON.stringify({ data: reviewsResult.value || [], ts: Date.now() })
        );
      } else {
        console.error("Failed to fetch reviews:", reviewsResult.reason);
      }

      if (savedResult.status === "fulfilled") {
        setSavedCompanies(savedResult.value || []);
        sessionStorage.setItem(
          "profile_savedCompanies",
          JSON.stringify({ data: savedResult.value || [], ts: Date.now() })
        );
      } else {
        console.error("Failed to fetch saved companies:", savedResult.reason);
      }

      fetchedReviewsForUserId.current = user.id;
      fetchedSavedForUserId.current = user.id;
      setLoadingReviews(false);
      setLoadingSaved(false);
    });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const handleUnsave = (companyId: string, saved: boolean) => {
    if (!saved) {
      setSavedCompanies((prev) => prev.filter((c) => c.id !== companyId));
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    // Update local state
    setMyReviews((prev) => prev.filter((r) => r.id !== reviewId));
    
    // Clear sessionStorage cache to force refetch on next load
    sessionStorage.removeItem("profile_myReviews");
    
    // Update cache with new data
    const updatedReviews = myReviews.filter((r) => r.id !== reviewId);
    sessionStorage.setItem(
      "profile_myReviews",
      JSON.stringify({ data: updatedReviews, ts: Date.now() })
    );
  };

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

  // Get user display info
  const getUserInfo = () => {
    if (!user) return { name: "User", email: "", initials: "U" };

    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;
    const fullName = user.user_metadata?.full_name;

    let name = "";
    let initials = "";

    if (firstName && lastName) {
      name = `${firstName} ${lastName}`;
      initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (fullName) {
      name = fullName;
      const parts = fullName.split(" ");
      initials =
        parts.length > 1
          ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
          : fullName.substring(0, 2).toUpperCase();
    } else if (user.email) {
      const emailName = user.email.split("@")[0];
      const parts = emailName.split(".");
      if (parts.length > 1) {
        name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
        initials = `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      } else {
        name = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        initials = emailName.substring(0, 2).toUpperCase();
      }
    } else {
      name = "User";
      initials = "U";
    }

    return { name, email: user.email || "", initials };
  };

  // Loading state (auth check)
  if (authLoading) {
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  const userInfo = getUserInfo();

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <motion.div 
        className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 max-w-5xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-semibold">
            {userInfo.initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{userInfo.name}</h1>
            <p className="text-muted-foreground">{userInfo.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 mb-6 sm:mb-8 max-w-5xl mx-auto">
          <Button
            variant={activeTab === "reviews" ? "default" : "outline"}
            onClick={() => setActiveTab("reviews")}
            className="gap-2 flex-1 sm:flex-initial"
          >
            <FileText className="size-4" />
            <span className="hidden sm:inline">My Reviews</span>
            <span className="sm:hidden">Reviews</span>
            <span className="ml-1">({myReviews.length})</span>
          </Button>
          <Button
            variant={activeTab === "saved" ? "default" : "outline"}
            onClick={() => setActiveTab("saved")}
            className="gap-2 flex-1 sm:flex-initial"
          >
            <Bookmark className="size-4" />
            <span className="hidden sm:inline">Saved Companies</span>
            <span className="sm:hidden">Saved</span>
            <span className="ml-1">({savedCompanies.length})</span>
          </Button>
        </div>

        {/* Content Area - Same structure for both tabs */}
        <div className="max-w-5xl mx-auto w-full">
          {/* My Reviews Tab */}
          {activeTab === "reviews" && (
            <>
              {loadingReviews ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64 w-full rounded-xl" />
                  ))}
                </div>
              ) : myReviews.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <FileText className="size-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Share your internship experience and help other students.
                      </p>
                      <Button asChild className="gap-2">
                        <Link href="/write-review">
                          Write a Review
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <motion.div
                  className="grid gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {myReviews.map((review) => (
                    <motion.div key={review.id} variants={itemVariants}>
                      <ReviewCard 
                        review={review} 
                        compact={true} 
                        onDelete={handleDeleteReview}
                        showEditButton
                        expanded={expandedReviewIds.has(review.id)}
                        onExpandedChange={handleExpandedChange}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </>
          )}

          {/* Saved Companies Tab */}
          {activeTab === "saved" && (
            <>
              {loadingSaved ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-80 w-full rounded-xl" />
                  ))}
                </div>
              ) : savedCompanies.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Bookmark className="size-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No saved companies</h3>
                      <p className="text-muted-foreground mb-4">
                        Save companies you&apos;re interested in to easily find them later.
                      </p>
                      <Button asChild className="gap-2">
                        <Link href="/companies">
                          Browse Companies
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {savedCompanies.map((company) => (
                    <motion.div key={company.id} variants={itemVariants}>
                      <CompanyCard company={company} onSaveToggle={handleUnsave} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
      <Footer />
    </main>
  );
}

