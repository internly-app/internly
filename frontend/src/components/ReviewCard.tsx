"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ReviewCardProps {
  review: {
    id: string;
    company: string;
    position: string;
    rating: number;
    review_text: string;
    pros: string;
    cons: string;
    created_at: string;
    likes_count: number;
    author?: {
      first_name?: string;
      last_name?: string;
    };
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getInitials = () => {
    if (review.author?.first_name && review.author?.last_name) {
      return `${review.author.first_name[0]}${review.author.last_name[0]}`;
    }
    return "IN";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
              {getInitials()}
            </div>

            {/* Company & Position */}
            <div>
              <h3 className="text-heading-3 font-semibold mb-1">
                {review.company}
              </h3>
              <p className="text-sm text-muted-foreground">
                {review.position}
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill={i < review.rating ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                className={i < review.rating ? "text-foreground" : "text-border"}
              >
                <path d="M10 1l2.5 6.5L19 8l-5.5 4.5L15 19l-5-3.5L5 19l1.5-6.5L1 8l6.5-.5L10 1z" />
              </svg>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Review Text */}
        <p className="text-base leading-relaxed text-foreground">
          {review.review_text}
        </p>

        {/* Pros & Cons */}
        {(review.pros || review.cons) && (
          <div className="grid md:grid-cols-2 gap-6">
            {review.pros && (
              <div className="space-y-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✓ Pros
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.pros}
                </p>
              </div>
            )}
            {review.cons && (
              <div className="space-y-2">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  ✗ Cons
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.cons}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between pt-4">
        <span className="text-sm text-muted-foreground">
          {formatDate(review.created_at)}
        </span>

        {/* Like Button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-muted rounded-full"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M8 14s-6-4-6-8c0-2.21 1.79-4 4-4 1.42 0 2.66.74 3.36 1.85C9.84 2.74 11.08 2 12.5 2c2.21 0 4 1.79 4 4 0 4-6 8-6 8z" />
          </svg>
          <span className="text-sm font-medium">{review.likes_count}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
