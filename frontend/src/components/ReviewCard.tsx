"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReviewWithDetails } from "@/lib/types/database";
import { useLikeReview } from "@/hooks/useReviews";
import { useAuth } from "@/components/AuthProvider";

interface ReviewCardProps {
  review: ReviewWithDetails;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const { user } = useAuth();
  const { toggleLike, loading: likeLoading } = useLikeReview();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const handleLike = async () => {
    if (!user) {
      window.location.href = "/signin";
      return;
    }
    try {
      await toggleLike(review.id);
      window.location.reload(); // Temporary - should use state management
    } catch (error) {
      console.error("Failed to like review:", error);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
              {review.company.name[0]}
            </div>

            {/* Company & Position */}
            <div>
              <h3 className="text-heading-3 font-semibold mb-1">
                {review.company.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {review.role.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {review.location} • {review.work_style}
              </p>
            </div>
          </div>

          {/* Term Badge */}
          <Badge variant="outline" className="h-fit">
            {review.term}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div>
          <h4 className="font-semibold mb-2">Summary</h4>
          <p className="text-base leading-relaxed text-foreground">
            {review.summary}
          </p>
        </div>

        {/* Best & Hardest */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
              ✓ Best Part
            </Badge>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {review.best}
            </p>
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
              ✗ Hardest Part
            </Badge>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {review.hardest}
            </p>
          </div>
        </div>

        {/* Advice */}
        {review.advice && (
          <div>
            <h4 className="font-semibold mb-2">Advice for Future Interns</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {review.advice}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-6">
        <span className="text-sm text-muted-foreground">
          {formatDate(review.created_at)}
        </span>

        {/* Like Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={likeLoading}
          className="gap-2 hover:bg-muted rounded-full transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill={review.user_has_liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            className={`transition-all duration-200 ${review.user_has_liked ? "text-red-500" : ""}`}
          >
            <path d="M8 14s-6-4-6-8c0-2.21 1.79-4 4-4 1.42 0 2.66.74 3.36 1.85C9.84 2.74 11.08 2 12.5 2c2.21 0 4 1.79 4 4 0 4-6 8-6 8z" />
          </svg>
          <span className="text-sm font-medium">{review.like_count}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
