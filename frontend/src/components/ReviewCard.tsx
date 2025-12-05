"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReviewWithDetails } from "@/lib/types/database";
import { useAuth } from "@/components/AuthProvider";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";

interface ReviewCardProps {
  review: ReviewWithDetails;
  compact?: boolean; // If true, shows compact view that can expand
}

export default function ReviewCard({ review, compact = false }: ReviewCardProps) {
  const { user, loading: authLoading } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Local state for like data - synced with review prop
  const [likeData, setLikeData] = useState({
    hasLiked: review.user_has_liked,
    likeCount: review.like_count,
  });

  // Sync with prop changes (when data refreshes from API)
  useEffect(() => {
    // Don't update while auth is loading to prevent flash
    if (authLoading) return;

    const newHasLiked = user ? review.user_has_liked : false;

    setLikeData({
      hasLiked: newHasLiked,
      likeCount: review.like_count,
    });
  }, [review.user_has_liked, review.like_count, user, authLoading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking like

    // Prevent multiple simultaneous clicks
    if (isLiking) return;

    if (!user) {
      window.location.href = "/signin";
      return;
    }

    setIsLiking(true);

    // Store previous state for rollback
    const previousState = { ...likeData };

    // Optimistic update - instant UI feedback
    const newLikedState = !likeData.hasLiked;
    setLikeData({
      hasLiked: newLikedState,
      likeCount: newLikedState
        ? likeData.likeCount + 1
        : Math.max(0, likeData.likeCount - 1),
    });

    try {
      const response = await fetch(`/api/reviews/${review.id}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      const data = await response.json();

      // Update with actual database values to ensure consistency
      setLikeData({
        hasLiked: data.liked,
        likeCount: data.likeCount,
      });
    } catch (error) {
      console.error("Failed to like review:", error);
      // Rollback to previous state on error
      setLikeData(previousState);
      // Show error to user
      alert("Failed to update like. Please try again.");
    } finally {
      setIsLiking(false);
    }
  };

  const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  };

  const workStyleBadge = {
    onsite: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    hybrid: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
    remote: "bg-green-500/20 text-green-300 border border-green-500/40",
  } satisfies Record<string, string>;


  // Compact view
  if (compact) {
  return (
      <Card
        className="transition-all duration-200 cursor-pointer hover:shadow-md hover:border-zinc-500"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`Review of ${review.role.title} at ${review.company.name}. Click to ${isExpanded ? 'collapse' : 'expand'} details.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <CardHeader className="pb-3 px-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Company Logo */}
              <CompanyLogo
                companyName={review.company.name}
                logoUrl={review.company.logo_url}
                size={40}
              />

              {/* Company & Role */}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold mb-0.5 truncate">
                  {review.company.name}
                </CardTitle>
                <CardDescription className="text-sm truncate">
                  {review.role.title}
                </CardDescription>
              </div>
            </div>

            {/* Term Badge */}
            <Badge variant="outline" className="h-fit flex-shrink-0 text-xs">
              {review.term}
            </Badge>
          </div>

          {/* Key Info Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge
              variant="outline"
              className={`text-xs ${workStyleBadge[review.work_style]}`}
            >
              {review.work_style}
            </Badge>
            {review.work_hours && (
              <Badge variant="outline" className="text-xs">
                {review.work_hours === "full-time" ? "Full-time" : "Part-time"}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">{review.location}</Badge>
            {review.duration_months && (
              <Badge variant="outline" className="text-xs">
                {review.duration_months} {review.duration_months === 1 ? "mo" : "mos"}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 px-4">
          {/* Truncated Best Part */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {truncateText(review.best, 150)}
          </p>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-0 pb-3 px-4">
          {/* Left side: Date and Like */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              aria-label={likeData.hasLiked ? `Unlike this review (${likeData.likeCount} likes)` : `Like this review (${likeData.likeCount} likes)`}
              aria-pressed={likeData.hasLiked}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={likeData.hasLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-colors ${likeData.hasLiked ? "text-red-500" : ""}`}
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-xs">{likeData.likeCount}</span>
            </button>
          </div>
          
          {/* Right side: Expand/Collapse indicator */}
          <div className="text-muted-foreground" aria-hidden="true">
            {isExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </div>
        </CardFooter>

        {/* Expanded Content */}
        {isExpanded && (
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            <div className="border-t border-zinc-700 mb-4" />

      {/* Technologies */}
            {review.technologies && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Technologies Used</h4>
                <div className="flex flex-wrap gap-2">
                  {review.technologies.split(",").map((tech, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tech.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

      {/* Best & Hardest */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 text-xs"
                >
                  ✓ Best Part
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.best}
                </p>
              </div>
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 text-xs"
                >
                  ✗ Hardest Part
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.hardest}
                </p>
              </div>
            </div>

            {/* Interview Process */}
            <div>
              <div className="border-t border-zinc-700 mb-4" />
              <h4 className="font-semibold mb-2 text-sm">Interview Process</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Rounds:</span>{" "}
                  {review.interview_round_count}
                </p>
                <p>
                  <span className="font-medium text-foreground">Description:</span>{" "}
                  {review.interview_rounds_description}
                </p>
                <p>
                  <span className="font-medium text-foreground">Tips:</span>{" "}
                  {review.interview_tips}
                </p>
              </div>
            </div>

            {/* Compensation */}
            {(review.wage_hourly || review.housing_provided || review.perks) && (
              <div>
                <div className="border-t border-zinc-700 mb-4" />
                <h4 className="font-semibold mb-2 text-sm">Compensation</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {review.wage_hourly && (
                    <p>
                      <span className="font-medium text-foreground">Hourly:</span>{" "}
                      {review.wage_currency || "CAD"} {review.wage_hourly.toFixed(2)}
                    </p>
                  )}
                  {review.housing_provided && (
                    <p>
                      <span className="font-medium text-foreground">Housing:</span>{" "}
                      Provided
                      {review.housing_stipend &&
                        ` (${review.wage_currency || "CAD"} ${review.housing_stipend.toFixed(2)} stipend)`}
                    </p>
                  )}
                  {review.perks && (
                    <p>
                      <span className="font-medium text-foreground">Perks:</span>{" "}
                      {review.perks}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  // Full view (original implementation for detail pages)
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Company Logo */}
            <CompanyLogo
              companyName={review.company.name}
              logoUrl={review.company.logo_url}
              size={48}
            />

            {/* Company & Position */}
        <div>
              <CardTitle className="text-lg">{review.company.name}</CardTitle>
              <CardDescription>{review.role.title}</CardDescription>
            </div>
          </div>

          {/* Term Badge */}
          <CardAction>
            <Badge variant="outline" className="h-fit">
              {review.term}
            </Badge>
          </CardAction>
        </div>

        {/* Meta info badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Badge
            variant="outline"
            className={`${workStyleBadge[review.work_style]}`}
          >
            {review.work_style}
          </Badge>
          {review.work_hours && (
            <Badge variant="outline">
              {review.work_hours === "full-time" ? "Full-time" : "Part-time"}
            </Badge>
          )}
          <Badge variant="outline">{review.location}</Badge>
          {review.duration_months && (
            <Badge variant="outline">
              {review.duration_months}{" "}
              {review.duration_months === 1 ? "month" : "months"}
            </Badge>
          )}
          {review.team_name && (
            <Badge variant="outline">{review.team_name}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">


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

        {/* Interview Process */}
        <div>
          <div className="border-t border-zinc-700 my-4" />
          <h4 className="font-semibold mb-2">Interview Process</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
          <p>
              <span className="font-medium text-foreground">Rounds:</span>{" "}
            {review.interview_round_count}
          </p>
          <p>
              <span className="font-medium text-foreground">Description:</span>{" "}
            {review.interview_rounds_description}
          </p>
          <p>
              <span className="font-medium text-foreground">Tips:</span>{" "}
            {review.interview_tips}
          </p>
        </div>
      </div>

      {/* Compensation (if provided) */}
      {(review.wage_hourly || review.housing_provided || review.perks) && (
          <div>
            <div className="border-t border-zinc-700 my-4" />
            <h4 className="font-semibold mb-2">Compensation</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
            {review.wage_hourly && (
              <p>
                  <span className="font-medium text-foreground">Hourly:</span> $
                  {review.wage_hourly.toFixed(2)} {review.wage_currency || "CAD"}
              </p>
            )}
            {review.housing_provided && (
              <p>
                  <span className="font-medium text-foreground">Housing:</span>{" "}
                Provided
                {review.housing_stipend &&
                  ` ($${review.housing_stipend.toFixed(2)} stipend)`}
              </p>
            )}
            {review.perks && (
              <p>
                  <span className="font-medium text-foreground">Perks:</span>{" "}
                {review.perks}
              </p>
            )}
          </div>
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
          disabled={isLiking}
          className="gap-0 px-4 hover:bg-muted rounded-full transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
          aria-label={likeData.hasLiked ? `Unlike this review (${likeData.likeCount} likes)` : `Like this review (${likeData.likeCount} likes)`}
          aria-pressed={likeData.hasLiked}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={likeData.hasLiked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-200 flex-shrink-0 ${likeData.hasLiked ? "text-red-500" : ""}`}
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-sm font-medium ml-4" aria-hidden="true">{likeData.likeCount}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
