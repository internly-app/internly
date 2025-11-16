"use client";

import { useState, useEffect } from "react";
import { useReviews } from "@/hooks/useReviews";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewModal } from "@/components/ReviewModal";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";

export default function Home() {
  const [sort, setSort] = useState<"likes" | "recent">("likes");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { reviews, total, loading, error } = useReviews({ sort, limit: 20 });
  const { user, signOut } = useAuth();

  // Check if we should open the modal from localStorage
  useEffect(() => {
    if (user && localStorage.getItem("openReviewModal") === "true") {
      setIsModalOpen(true);
      localStorage.removeItem("openReviewModal");
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-950 text-gray-200">
        <div className="max-w-md w-full bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 font-semibold mb-2">
            Error loading reviews
          </p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
      {/* Header */}
      <header className="bg-gray-900/80 border-b border-gray-800 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Internly</h1>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-medium shadow-lg shadow-blue-500/30"
                  >
                    Write Review
                  </button>
                  <button
                    onClick={signOut}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/reviews/new"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-medium shadow-lg shadow-blue-500/30"
                  >
                    Write Review
                  </Link>
                  <Link
                    href="/reviews/new"
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Controls */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {total} {total === 1 ? "Review" : "Reviews"}
            </h2>
            <p className="text-sm text-gray-400">
              Real internship experiences from students
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Sort by:</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "likes" | "recent")}
              className="px-3 py-2 border border-gray-700 bg-gray-900 text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="likes">Most Liked</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="bg-gray-900/70 rounded-lg border border-gray-800 p-12 text-center">
            <p className="text-gray-400 mb-4">No reviews yet</p>
            <Link
              href="/reviews/new"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-medium shadow-lg shadow-blue-500/20"
            >
              Be the first to write a review
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      <ReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
