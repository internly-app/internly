import type { ReviewWithDetails } from "@/lib/types/database";

interface RatingDisplayProps {
  label: string;
  value: number;
  compact?: boolean;
}

export function RatingDisplay({
  label,
  value,
  compact = false,
}: RatingDisplayProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-gray-400">{label}:</span>
        <div className="flex">
          {stars.map((star) => (
            <span
              key={star}
              className={star <= value ? "text-yellow-400" : "text-gray-600"}
            >
              ★
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-200">{label}</span>
        <span className="text-sm text-gray-400">{value.toFixed(1)}/5</span>
      </div>
      <div className="flex gap-1">
        {stars.map((star) => (
          <span
            key={star}
            className={`text-xl ${
              star <= value ? "text-yellow-400" : "text-gray-700"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

interface RatingsGridProps {
  review: ReviewWithDetails;
}

export function RatingsGrid({ review }: RatingsGridProps) {
  const ratings = [
    { label: "Work-Life Balance", value: review.rating_wlb ?? 0 },
    { label: "Learning & Growth", value: review.rating_learning ?? 0 },
    { label: "Team Culture", value: review.rating_culture ?? 0 },
    { label: "Management Support", value: review.rating_management ?? 0 },
    { label: "Impactful Work", value: review.rating_impact ?? 0 },
  ];

  const overallRating = review.rating_overall ?? 0;

  return (
    <div className="space-y-3">
      {/* Overall Rating - Prominent */}
      <div className="bg-blue-500/10 border border-blue-500/40 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-white">Overall Rating</span>
          <span className="text-lg font-bold text-blue-300">
            {overallRating.toFixed(1)}/5
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
            <span
              key={star}
              className={`text-2xl ${
                star <= overallRating
                  ? "text-yellow-400"
                  : "text-gray-700"
              }`}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Category Ratings */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ratings.map((rating) => (
          <RatingDisplay
            key={rating.label}
            label={rating.label}
            value={rating.value}
            compact
          />
        ))}
      </div>
    </div>
  );
}
