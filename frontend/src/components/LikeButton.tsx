"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

interface LikeButtonProps {
  reviewId: string;
  initialLiked: boolean;
  initialCount: number;
  onLikeChange?: (liked: boolean) => void;
}

export function LikeButton({
  reviewId,
  initialLiked,
  initialCount,
  onLikeChange,
}: LikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLike = async () => {
    if (!user) {
      setAuthMessage("Sign in to like reviews");
      return;
    }
    if (loading) return;

    setLoading(true);
    setErrorMessage(null);
    setAuthMessage(null);

    try {
      const response = await fetch(`/api/reviews/${reviewId}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthMessage("Sign in to like reviews");
          return;
        }
        
        // Try to extract error message from response
        let errorMsg = "Failed to update like. Please try again.";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch {
          // If response isn't JSON, use default message
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const newLiked = data.liked;
      setAuthMessage(null);
      setErrorMessage(null);

      setLiked(newLiked);
      setCount((prev) => (newLiked ? prev + 1 : prev - 1));
      onLikeChange?.(newLiked);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to update like. Please try again.";
      setErrorMessage(errorMsg);
      console.error("Like error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
          liked
            ? "bg-red-500/20 border-red-400/40 text-red-200"
            : "bg-gray-900/60 border-gray-700 text-gray-300 hover:border-gray-500"
        } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`text-xl ${liked ? "animate-pulse" : ""}`}>
          {liked ? "❤️" : "🤍"}
        </span>
        <span className="font-medium">{count}</span>
      </button>
      {authMessage && (
        <p className="text-xs text-red-300" role="status">
          {authMessage}
        </p>
      )}
      {errorMessage && (
        <p className="text-xs text-red-300" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
