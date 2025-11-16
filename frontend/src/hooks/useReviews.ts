"use client";

import { useState, useEffect } from "react";
import type { ReviewWithDetails } from "@/lib/types/database";
import type { ReviewsQuery, ReviewCreate } from "@/lib/validations/schemas";

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

  useEffect(() => {
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

        const response = await fetch(`/api/reviews?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch reviews");
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
  ]);

  return { reviews, total, loading, error };
}

export function useCreateReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReview = async (reviewData: ReviewCreate) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create review");
      }

      const review = await response.json();
      return review;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
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
      const response = await fetch(`/api/reviews/${reviewId}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
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
