"use client";

import type { ReviewWithDetails } from "@/lib/types/database";
import { CompanyTag } from "./CompanyTag";
import { LikeButton } from "./LikeButton";

interface ReviewCardProps {
  review: ReviewWithDetails;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  const workStyleBadge = {
    onsite: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    hybrid: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
    remote: "bg-green-500/20 text-green-300 border border-green-500/40",
  } satisfies Record<string, string>;

  return (
    <article className="bg-gray-900/70 rounded-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] border border-gray-800 p-6 hover:border-gray-700 transition-colors text-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <CompanyTag company={review.company} role={review.role} />
        <LikeButton
          reviewId={review.id}
          initialLiked={review.user_has_liked || false}
          initialCount={review.like_count}
        />
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-400">
        <span
          className={`px-3 py-1 rounded-full font-medium ${
            workStyleBadge[review.work_style]
          }`}
        >
          {review.work_style}
        </span>
        {review.work_hours && (
          <>
            <span className="px-2 py-1 rounded bg-gray-800 text-gray-300">
              {review.work_hours === "full-time" ? "Full-time" : "Part-time"}
            </span>
          </>
        )}
        <span>{review.location}</span>
        <span>•</span>
        <span>{review.term}</span>
        {review.duration_months && (
          <>
            <span>•</span>
            <span>{review.duration_months} {review.duration_months === 1 ? 'month' : 'months'}</span>
          </>
        )}
        {review.team_name && (
          <>
            <span>•</span>
            <span>{review.team_name}</span>
          </>
        )}
        <span>•</span>
        <span>{formatDate(review.created_at)}</span>
      </div>

      {/* Technologies */}
      {review.technologies && (
        <div className="mb-4">
          <h4 className="font-semibold text-white mb-2 text-sm">Technologies</h4>
          <p className="text-gray-300 text-sm">{review.technologies}</p>
        </div>
      )}

      {/* Summary */}
      <div className="mb-4">
        <h4 className="font-semibold text-white mb-2">Summary</h4>
        <p className="text-gray-300 leading-relaxed">{review.summary}</p>
      </div>

      {/* Best & Hardest */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold text-white mb-2">Best Part</h4>
          <p className="text-gray-300 text-sm leading-relaxed">{review.best}</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Hardest Part</h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            {review.hardest}
          </p>
        </div>
      </div>

      {/* Advice */}
      <div className="mb-4">
        <h4 className="font-semibold text-white mb-2">
          Advice for Incoming Interns
        </h4>
        <p className="text-gray-300 text-sm leading-relaxed">{review.advice}</p>
      </div>

      {/* Interview */}
      <div className="border-t border-gray-800 pt-4 mb-4">
        <h4 className="font-semibold text-white mb-2">Interview Process</h4>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <span className="font-medium text-gray-100">Rounds:</span>{" "}
            {review.interview_round_count}
          </p>
          <p>
            <span className="font-medium text-gray-100">Description:</span>{" "}
            {review.interview_rounds_description}
          </p>
          <p>
            <span className="font-medium text-gray-100">Tips:</span>{" "}
            {review.interview_tips}
          </p>
        </div>
      </div>

      {/* Compensation (if provided) */}
      {(review.wage_hourly || review.housing_provided || review.perks) && (
        <div className="border-t border-gray-800 pt-4">
          <h4 className="font-semibold text-white mb-2">Compensation</h4>
          <div className="space-y-1 text-sm text-gray-300">
            {review.wage_hourly && (
              <p>
                <span className="font-medium text-gray-100">Hourly:</span> $
                {review.wage_hourly.toFixed(2)} {review.wage_currency || "USD"}
              </p>
            )}
            {review.housing_provided && (
              <p>
                <span className="font-medium text-gray-100">Housing:</span>{" "}
                Provided
                {review.housing_stipend &&
                  ` ($${review.housing_stipend.toFixed(2)} stipend)`}
              </p>
            )}
            {review.perks && (
              <p>
                <span className="font-medium text-gray-100">Perks:</span>{" "}
                {review.perks}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
