"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateReview } from "@/hooks/useReviews";
import type { ReviewCreate } from "@/lib/validations/schemas";

interface ReviewFormProps {
  onSuccess?: () => void;
}

export function ReviewForm({ onSuccess }: ReviewFormProps = {}) {
  const router = useRouter();
  const { createReview, loading, error } = useCreateReview();

  const [formData, setFormData] = useState<Partial<ReviewCreate>>({
    work_style: "onsite",
    rating_wlb: 3,
    rating_learning: 3,
    rating_culture: 3,
    rating_management: 3,
    rating_impact: 3,
    wage_currency: "USD",
    housing_provided: false,
    interview_round_count: 0,
  });

  const updateField = (
    field: keyof ReviewCreate,
    value: string | number | boolean | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const rating_overall =
        ((formData.rating_wlb || 0) +
          (formData.rating_learning || 0) +
          (formData.rating_culture || 0) +
          (formData.rating_management || 0) +
          (formData.rating_impact || 0)) /
        5;

      await createReview({ ...formData, rating_overall } as ReviewCreate);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to create review:", err);
    }
  };

  return (
    <div className="bg-gray-900/70 rounded-xl border border-gray-800 p-6 sm:p-8 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.9)]">
      <h1 className="text-3xl font-bold text-white mb-2">Write a Review</h1>
      <p className="text-gray-400 mb-8">
        Share your internship experience to help other students
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company & Role Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Company & Role
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Company ID *
              </label>
              <input
                type="text"
                required
                value={formData.company_id || ""}
                onChange={(e) => updateField("company_id", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company UUID"
              />
              <p className="text-xs text-gray-500 mt-1">
                You&apos;ll need to create a company first
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Role ID *
              </label>
              <input
                type="text"
                required
                value={formData.role_id || ""}
                onChange={(e) => updateField("role_id", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter role UUID"
              />
              <p className="text-xs text-gray-500 mt-1">
                You&apos;ll need to create a role first
              </p>
            </div>
          </div>
        </section>

        {/* Basic Info Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={formData.location || ""}
                onChange={(e) => updateField("location", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., San Francisco, CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Term *
              </label>
              <input
                type="text"
                required
                value={formData.term || ""}
                onChange={(e) => updateField("term", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Summer 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Work Style *
              </label>
              <select
                required
                value={formData.work_style}
                onChange={(e) => updateField("work_style", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>
        </section>

        {/* Ratings Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Ratings (1-5 stars)
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Overall rating will be calculated automatically based on these 5
            categories
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "rating_wlb", label: "Work-Life Balance" },
              { key: "rating_learning", label: "Learning & Growth" },
              { key: "rating_culture", label: "Team Culture" },
              { key: "rating_management", label: "Management Support" },
              { key: "rating_impact", label: "Impactful Work" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  {label} *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        updateField(key as keyof ReviewCreate, value)
                      }
                      className={`w-12 h-12 rounded-lg border-2 font-semibold transition-colors cursor-pointer ${
                        formData[key as keyof ReviewCreate] === value
                          ? "border-blue-500 bg-blue-500/10 text-blue-200"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Written Content Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Your Experience
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Summary *
              </label>
              <textarea
                required
                rows={4}
                value={formData.summary || ""}
                onChange={(e) => updateField("summary", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Overall summary of your internship experience..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Best Part *
              </label>
              <textarea
                required
                rows={3}
                value={formData.best || ""}
                onChange={(e) => updateField("best", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What did you enjoy most?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Hardest Part *
              </label>
              <textarea
                required
                rows={3}
                value={formData.hardest || ""}
                onChange={(e) => updateField("hardest", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What was most challenging?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Advice *
              </label>
              <textarea
                required
                rows={3}
                value={formData.advice || ""}
                onChange={(e) => updateField("advice", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What advice would you give to future interns?"
              />
            </div>
          </div>
        </section>

        {/* Interview Section (Required) */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Interview Process
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Number of Interview Rounds *
              </label>
              <input
                type="number"
                required
                min="0"
                max="20"
                value={formData.interview_round_count || ""}
                onChange={(e) =>
                  updateField(
                    "interview_round_count",
                    parseInt(e.target.value) || undefined
                  )
                }
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Interview Rounds Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.interview_rounds_description || ""}
                onChange={(e) =>
                  updateField("interview_rounds_description", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Phone screen, technical interview, final round..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Interview Tips *
              </label>
              <textarea
                required
                rows={3}
                value={formData.interview_tips || ""}
                onChange={(e) => updateField("interview_tips", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tips for future candidates..."
              />
            </div>
          </div>
        </section>

        {/* Compensation Section (Optional) */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Compensation (Optional)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Hourly Wage
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.wage_hourly || ""}
                onChange={(e) =>
                  updateField(
                    "wage_hourly",
                    parseFloat(e.target.value) || undefined
                  )
                }
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="25.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Currency
              </label>
              <input
                type="text"
                maxLength={3}
                value={formData.wage_currency || "USD"}
                onChange={(e) => updateField("wage_currency", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="USD"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="housing"
                checked={formData.housing_provided || false}
                onChange={(e) =>
                  updateField("housing_provided", e.target.checked)
                }
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label
                htmlFor="housing"
                className="text-sm font-medium text-gray-200 cursor-pointer"
              >
                Housing Provided
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Housing Stipend
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.housing_stipend || ""}
                onChange={(e) =>
                  updateField(
                    "housing_stipend",
                    parseFloat(e.target.value) || undefined
                  )
                }
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="500.00"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Perks & Benefits
              </label>
              <textarea
                rows={2}
                value={formData.perks || ""}
                onChange={(e) => updateField("perks", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Free lunch, gym membership, etc."
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-3 px-6 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/30 ${
              loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSuccess) {
                onSuccess();
              } else {
                router.push("/");
              }
            }}
            className="px-6 py-3 border border-gray-700 rounded-lg font-semibold text-gray-200 hover:bg-gray-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
