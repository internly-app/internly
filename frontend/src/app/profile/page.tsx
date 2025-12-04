"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
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
  const [myReviews, setMyReviews] = useState<ReviewWithDetails[]>([]);
  const [savedCompanies, setSavedCompanies] = useState<CompanyWithStats[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin?redirect=/profile");
    }
  }, [user, authLoading, router]);

  // Fetch user's reviews
  useEffect(() => {
    if (!user) return;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const response = await fetch("/api/user/reviews");
        if (response.ok) {
          const data = await response.json();
          setMyReviews(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [user]);

  // Fetch saved companies
  useEffect(() => {
    if (!user) return;

    const fetchSaved = async () => {
      setLoadingSaved(true);
      try {
        const response = await fetch("/api/user/saved-companies");
        if (response.ok) {
          const data = await response.json();
          setSavedCompanies(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch saved companies:", error);
      } finally {
        setLoadingSaved(false);
      }
    };

    fetchSaved();
  }, [user]);

  const handleUnsave = (companyId: string, saved: boolean) => {
    if (!saved) {
      setSavedCompanies((prev) => prev.filter((c) => c.id !== companyId));
    }
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
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12">
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
      </main>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  const userInfo = getUserInfo();

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-semibold">
            {userInfo.initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{userInfo.name}</h1>
            <p className="text-muted-foreground">{userInfo.email}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex gap-2 mb-8"
        >
          <Button
            variant={activeTab === "reviews" ? "default" : "outline"}
            onClick={() => setActiveTab("reviews")}
            className="gap-2"
          >
            <FileText className="size-4" />
            My Reviews ({myReviews.length})
          </Button>
          <Button
            variant={activeTab === "saved" ? "default" : "outline"}
            onClick={() => setActiveTab("saved")}
            className="gap-2"
          >
            <Bookmark className="size-4" />
            Saved Companies ({savedCompanies.length})
          </Button>
        </motion.div>

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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
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
              </motion.div>
            ) : (
              <motion.div
                className="grid gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {myReviews.map((review) => (
                  <motion.div key={review.id} variants={itemVariants}>
                    <ReviewCard review={review} compact={true} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-80 w-full rounded-xl" />
                ))}
              </div>
            ) : savedCompanies.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
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
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
    </main>
  );
}

