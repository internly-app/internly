"use client";

import Link from "next/link";
import ReviewCard from "./ReviewCard";
import type { ReviewWithDetails } from "@/lib/types/database";

interface ReviewCardLinkProps {
  review: ReviewWithDetails;
}

/**
 * Wrapper component that makes ReviewCard clickable and links to company page
 * Used on landing page to avoid expand/collapse issues with compact cards
 */
export function ReviewCardLink({ review }: ReviewCardLinkProps) {
  return (
    <Link
      href={`/companies/${review.company.slug}`}
      className="block h-full group"
    >
      <div className="h-full transition-transform duration-200 group-hover:scale-[1.02]">
        <ReviewCard 
          review={review} 
          compact={false}
        />
      </div>
    </Link>
  );
}

