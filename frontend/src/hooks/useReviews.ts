"use client";

import { useState, useEffect, useRef } from "react";
import type { ReviewWithDetails } from "@/lib/types/database";
import type { ReviewsQuery, ReviewCreate } from "@/lib/validations/schemas";
import { useAuth } from "@/components/AuthProvider";

interface ReviewsResponse {
  reviews: ReviewWithDetails[];
  total: number;
  limit: number;
  offset: number;
}

export function useReviews(query: Partial<ReviewsQuery> = {}) {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  // Use ref to track one-time force refresh (prevents double refetch)
  const forceRefreshRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Wait for auth to finish loading before fetching reviews
    if (authLoading) return;

    const fetchReviews = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (query.company_id) params.set("company_id", query.company_id);
        if (query.role_id) params.set("role_id", query.role_id);
        if (query.work_style) params.set("work_style", query.work_style);
        if (query.sort) params.set("sort", query.sort);
        if (query.limit) params.set("limit", query.limit.toString());
        if (query.offset) params.set("offset", query.offset.toString());

        // Add cache-busting timestamp when force refresh is needed
        const shouldForceRefresh = forceRefreshRef.current;
        const fetchUrl = shouldForceRefresh
          ? `/api/reviews?${params.toString()}&_t=${Date.now()}`
          : `/api/reviews?${params.toString()}`;
        
        // Use no-store to bypass ALL caches (browser + CDN) when forcing refresh
        const response = await fetch(fetchUrl, {
          cache: shouldForceRefresh ? 'no-store' : 'default',
          headers: shouldForceRefresh ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          } : undefined,
        });
        
        // Reset force refresh flag AFTER fetch completes
        if (shouldForceRefresh) {
          forceRefreshRef.current = false;
        }

        if (!response.ok) {
          // Try to extract error message from response
          let errorMsg = "Failed to fetch reviews";
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMsg = errorData.error;
            } else if (response.status === 401) {
              errorMsg = "Please sign in to view reviews";
            } else if (response.status >= 500) {
              errorMsg = "Server error. Please try again later.";
            }
          } catch {
            // If response isn't JSON, use default message
          }
          throw new Error(errorMsg);
        }

        const data: ReviewsResponse = await response.json();
        setReviews(data.reviews);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [
    query.company_id,
    query.role_id,
    query.work_style,
    query.sort,
    query.limit,
    query.offset,
    refreshKey, // Triggers refetch when refresh is requested
    user, // Refetch when user changes (sign in/out)
    authLoading, // Wait for auth to load
  ]);

  // Expose function to trigger force refresh (for use after review creation)
  const triggerRefresh = () => {
    if (!forceRefreshRef.current) {
      forceRefreshRef.current = true;
      setRefreshKey(prev => prev + 1); // Trigger refetch
    }
  };

  return { reviews, total, loading, error, triggerRefresh };
}

export function useCreateReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReview = async (reviewData: ReviewCreate) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      try {
        response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });
      } catch {
        throw new Error("Network error: Unable to connect to server. Please check your internet connection.");
      }

      if (!response.ok) {
        // Try to extract error message from response
        let errorMsg = "Failed to create review";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          } else if (errorData.details) {
            errorMsg = `${errorData.error || "Validation error"}: ${errorData.details}`;
          } else if (response.status === 401) {
            errorMsg = "Please sign in to create a review";
          } else if (response.status === 409) {
            errorMsg = "You have already reviewed this role";
          } else if (response.status === 400) {
            errorMsg = "Invalid data. Please check all required fields.";
          } else if (response.status >= 500) {
            errorMsg = "Server error. Please try again later.";
          }
        } catch {
          // If response isn't JSON, use status-based message
          if (response.status === 401) {
            errorMsg = "Please sign in to create a review";
          } else if (response.status >= 500) {
            errorMsg = "Server error. Please try again later.";
          }
        }
        throw new Error(errorMsg);
      }

      const review = await response.json();
      return review;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createReview, loading, error };
}

export function useLikeReview() {
  const [loading, setLoading] = useState(false);

  const toggleLike = async (reviewId: string) => {
    setLoading(true);

    try {
      let response;
      try {
        response = await fetch(`/api/reviews/${reviewId}/like`, {
        method: "POST",
      });
      } catch {
        throw new Error("Network error: Unable to connect to server. Please check your internet connection.");
      }

      if (!response.ok) {
        // Try to extract error message from response
        let errorMsg = "Failed to toggle like";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          } else if (response.status === 401) {
            errorMsg = "Please sign in to like reviews";
          } else if (response.status === 404) {
            errorMsg = "Review not found";
          } else if (response.status >= 500) {
            errorMsg = "Server error. Please try again later.";
          }
        } catch {
          // If response isn't JSON, use status-based message
          if (response.status === 401) {
            errorMsg = "Please sign in to like reviews";
          } else if (response.status >= 500) {
            errorMsg = "Server error. Please try again later.";
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data.liked;
    } catch (err) {
      console.error("Like error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { toggleLike, loading };
}
