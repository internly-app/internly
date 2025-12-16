"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import Link from "next/link";
import { stripHTML } from "@/lib/security/xss-protection";

interface ReviewCardProps {
  review: ReviewWithDetails;
  compact?: boolean; // If true, shows compact view that can expand
  onDelete?: (reviewId: string) => void; // If provided, shows delete button (for My Reviews page)
  showEditButton?: boolean; // If true, shows edit button (for My Reviews page)
  expanded?: boolean; // Controlled expanded state (optional)
  onExpandedChange?: (reviewId: string, expanded: boolean) => void; // Notify parent of expand/collapse
}

export default function ReviewCard({ review, compact = false, onDelete, showEditButton, expanded, onExpandedChange }: ReviewCardProps) {
  const { user, loading: authLoading } = useAuth();
  const isControlled = typeof expanded === "boolean";
  const [isExpanded, setIsExpanded] = useState(expanded ?? false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Sync expanded state if controlled
  useEffect(() => {
    if (isControlled) {
      setIsExpanded(expanded ?? false);
    }
  }, [expanded, isControlled]);

  const toggleExpanded = () => {
    const next = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(review.id, next);
    }
    if (!isControlled) {
      setIsExpanded(next);
    }
  };


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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking like

    // Prevent multiple simultaneous clicks (200ms debounce)
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

    // Re-enable button after short delay (feels instant, prevents spam)
    setTimeout(() => setIsLiking(false), 200);

    // Fire-and-forget: API call in background
    fetch(`/api/reviews/${review.id}/like`, {
        method: "POST",
    })
      .then(async (response) => {
        // Check if response is ok (status 200-299)
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to like review');
        }
        return response.json();
      })
      .then((data) => {
        console.log('Like toggled:', data);
      })
      .catch((error) => {
        console.error("Failed to like review:", error);
        // Rollback to previous state on error
        setLikeData(previousState);
        // Show subtle error (avoid disruptive alert)
        console.error("Like failed - rolled back. Error:", error.message);
      });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking delete
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setShowDeleteModal(false);

    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
      const data = await response.json();
        throw new Error(data.error || "Failed to delete review");
      }

      // Call the onDelete callback to update parent state
      onDelete?.(review.id);
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert(error instanceof Error ? error.message : "Failed to delete review. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
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
    <>
      <Card
        className="transition-all duration-200 cursor-pointer hover:shadow-md hover:border-zinc-500"
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`Review of ${review.role.title} at ${review.company.name}. Click to ${isExpanded ? 'collapse' : 'expand'} details.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <CardHeader className="pb-3 px-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
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

            {/* Top Right: Date, Like & Delete buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer group ${
                  likeData.hasLiked 
                    ? "text-red-500 hover:bg-red-500/10" 
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                }`}
                aria-label={likeData.hasLiked ? `Unlike this review (${likeData.likeCount} likes)` : `Like this review (${likeData.likeCount} likes)`}
                aria-pressed={likeData.hasLiked}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={likeData.hasLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-200"
                  aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-sm font-medium">{likeData.likeCount}</span>
              </button>
              {showEditButton && (
                <Link
                  href={`/write-review?edit=${review.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-700/50 transition-all cursor-pointer"
                  aria-label="Edit this review"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Link>
              )}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={`p-1.5 rounded-md transition-all disabled:opacity-50 cursor-pointer ${
                    isDeleting 
                      ? "text-red-500 bg-red-500/10" 
                      : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  }`}
                  aria-label="Delete this review"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
      </div>

          {/* Key Info Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {review.work_style && (
            <Badge
              variant="outline"
                className={`text-xs ${workStyleBadge[review.work_style] || ""}`}
        >
                {review.work_style.charAt(0).toUpperCase() + review.work_style.slice(1)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">{review.location}</Badge>
            {review.duration_months && (
              <Badge variant="outline" className="text-xs">
                {review.duration_months} {review.duration_months === 1 ? "mo" : "mos"}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {review.term}
            </Badge>
          </div>
        </CardHeader>

        {/* Preview text - only show when collapsed */}
        {!isExpanded && (
          <CardContent className="pt-0 pb-3 px-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
              {truncateText(stripHTML(review.best), 150)}
          </p>
        </CardContent>
        )}

        <CardFooter className="flex items-center justify-end pt-0 pb-3 px-4">
          {/* Expand/Collapse indicator */}
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
                      {stripHTML(tech.trim())}
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
                  {stripHTML(review.best)}
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
                  {stripHTML(review.hardest)}
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
                  {stripHTML(review.interview_rounds_description)}
                </p>
                {review.interview_tips && (
                <p>
                  <span className="font-medium text-foreground">Tips:</span>{" "}
                  {stripHTML(review.interview_tips)}
                </p>
                )}
              </div>
            </div>

            {/* Compensation */}
              <div>
                <div className="border-t border-zinc-700 mb-4" />
                <h4 className="font-semibold mb-2 text-sm">Compensation</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  ${review.wage_hourly?.toFixed(2) || "0.00"}/hr {review.wage_currency || "CAD"}
                    </p>
                {review.housing_stipend_provided && (
                    <p>
                    {review.housing_stipend
                      ? `$${review.housing_stipend.toFixed(2)}/mo housing`
                      : "Housing provided"
                    }
                    </p>
                  )}
                  {review.perks && (
                    <p>
                      <span className="font-medium text-foreground">Perks:</span>{" "}
                      {stripHTML(review.perks)}
                    </p>
                  )}
                </div>
              </div>
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={handleDeleteCancel}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="max-w-md w-full">
                <CardHeader>
                  <CardTitle>Delete Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Are you sure you want to delete this review? This action cannot be undone.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleDeleteCancel}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
    );
  }

  // Full view (original implementation for detail pages)
  return (
    <>
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

          {/* Top Right: Date & Term Badge */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
          <CardAction>
            <Badge variant="outline" className="h-fit">
              {review.term}
            </Badge>
          </CardAction>
          </div>
        </div>

        {/* Meta info badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {review.work_style && (
          <Badge
            variant="outline"
              className={`${workStyleBadge[review.work_style] || ""}`}
          >
              {review.work_style.charAt(0).toUpperCase() + review.work_style.slice(1)}
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
        {/* Technologies */}
        {review.technologies && (
          <div className="space-y-2">
            <h4 className="font-semibold">Technologies Used</h4>
            <div className="flex flex-wrap gap-2">
              {review.technologies.split(",").map((tech, idx) => (
                <Badge key={idx} variant="outline">
                  {stripHTML(tech.trim())}
                </Badge>
              ))}
            </div>
        </div>
        )}

        {/* Best & Hardest */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
              ✓ Best Part
            </Badge>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {stripHTML(review.best)}
            </p>
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
              ✗ Hardest Part
            </Badge>
            <p className="text-sm text-muted-foreground leading-relaxed">
            {stripHTML(review.hardest)}
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
            {stripHTML(review.interview_rounds_description)}
          </p>
            {review.interview_tips && (
          <p>
              <span className="font-medium text-foreground">Tips:</span>{" "}
            {stripHTML(review.interview_tips)}
          </p>
            )}
        </div>
      </div>

      {/* Compensation */}
          <div>
            <div className="border-t border-zinc-700 my-4" />
            <h4 className="font-semibold mb-2">Compensation</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
            ${review.wage_hourly?.toFixed(2) || "0.00"}/hr {review.wage_currency || "CAD"}
              </p>
          {review.housing_stipend_provided && (
              <p>
              {review.housing_stipend
                ? `$${review.housing_stipend.toFixed(2)}/mo housing`
                : "Housing provided"
              }
              </p>
            )}
            {review.perks && (
              <p>
                  <span className="font-medium text-foreground">Perks:</span>{" "}
                {stripHTML(review.perks)}
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-6">
        <span className="text-sm text-muted-foreground">
          {formatDate(review.created_at)}
        </span>

        <div className="flex items-center gap-2">
          {/* Delete Button (only on My Reviews page) */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="gap-2 px-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all duration-200 disabled:opacity-50 cursor-pointer"
              aria-label="Delete this review"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="text-sm">{isDeleting ? "Deleting..." : "Delete"}</span>
            </Button>
          )}

        {/* Like Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLiking}
            className={`gap-0 px-4 rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer group ${
              likeData.hasLiked 
                ? "text-red-500 hover:bg-red-500/10" 
                : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            }`}
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
              className="transition-all duration-200 flex-shrink-0"
              aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
            <span className="text-sm font-medium ml-4" aria-hidden="true">{likeData.likeCount}</span>
        </Button>
        </div>
      </CardFooter>
    </Card>

    {/* Delete Confirmation Modal */}
    <AnimatePresence>
      {showDeleteModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleDeleteCancel}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Delete Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Are you sure you want to delete this review? This action cannot be undone.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleDeleteCancel}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
