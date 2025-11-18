"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateReview } from "@/hooks/useReviews";
import type { ReviewCreate } from "@/lib/validations/schemas";
import { TechnologyAutocomplete } from "./TechnologyAutocomplete";

interface ReviewFormProps {
  onSuccess?: () => void;
}

export function ReviewForm({ onSuccess }: ReviewFormProps = {}) {
  const router = useRouter();
  const { createReview, loading, error } = useCreateReview();

  const [formData, setFormData] = useState<Partial<ReviewCreate>>({
    work_style: "onsite",
    wage_currency: "CAD",
    housing_provided: false,
    interview_round_count: 0,
  });

  // User-friendly fields (actual text, not UUIDs!)
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  
  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    companyName?: string;
    roleTitle?: string;
  }>({});

  const updateField = (
    field: keyof ReviewCreate,
    value: string | number | boolean | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous errors
    setFieldErrors({});

    // Validate required fields
    const errors: { companyName?: string; roleTitle?: string } = {};
    if (!companyName.trim()) {
      errors.companyName = "Please enter a company name";
    }
    if (!roleTitle.trim()) {
      errors.roleTitle = "Please enter a role title";
    }

    // If there are errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {

      // Step 1: Create or get company
      const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const companyResponse = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          slug: companySlug,
        }),
      });

      if (!companyResponse.ok) {
        throw new Error("Failed to create/get company");
      }

      const company = await companyResponse.json();

      // Step 2: Create or get role
      const roleSlug = roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const roleResponse = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: roleTitle.trim(),
          slug: roleSlug,
          company_id: company.id,
        }),
      });

      if (!roleResponse.ok) {
        throw new Error("Failed to create/get role");
      }

      const role = await roleResponse.json();

      // Step 3: Create review with the IDs
      await createReview({
        ...formData,
        company_id: company.id,
        role_id: role.id,
      } as ReviewCreate);

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
        Share your internship experience to help other students make informed decisions
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
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  // Clear error when user starts typing
                  if (fieldErrors.companyName) {
                    setFieldErrors((prev) => ({ ...prev, companyName: undefined }));
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.companyName
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-700"
                }`}
                placeholder="Google, Microsoft, Amazon..."
              />
              {fieldErrors.companyName && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Role Title *
              </label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => {
                  setRoleTitle(e.target.value);
                  // Clear error when user starts typing
                  if (fieldErrors.roleTitle) {
                    setFieldErrors((prev) => ({ ...prev, roleTitle: undefined }));
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.roleTitle
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-700"
                }`}
                placeholder="Software Engineering Intern, Product Design Intern..."
              />
              {fieldErrors.roleTitle && (
                <p className="mt-1 text-sm text-red-400">{fieldErrors.roleTitle}</p>
              )}
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
                placeholder="Toronto, ON, San Francisco, CA, Remote..."
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
                placeholder="Summer 2025, Winter 2024..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Duration (Months)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formData.duration_months || ""}
                onChange={(e) =>
                  updateField(
                    "duration_months",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="4, 8..."
              />
              <p className="mt-1 text-xs text-gray-500">
                How long was your internship?
              </p>
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

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Work Hours
              </label>
              <select
                value={formData.work_hours || ""}
                onChange={(e) => updateField("work_hours", e.target.value || undefined)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Select...</option>
                <option value="full-time">Full-time (40+ hrs/week)</option>
                <option value="part-time">Part-time (&lt;40 hrs/week)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Team Name
              </label>
              <input
                type="text"
                value={formData.team_name || ""}
                onChange={(e) => updateField("team_name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Platform Engineering, Product Design..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Technologies & Skills Used
              </label>
              <TechnologyAutocomplete
                value={formData.technologies || ""}
                onChange={(value) => updateField("technologies", value)}
                placeholder="Type to search technologies..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Start typing to see suggestions, or add custom technologies. Press Enter or comma to add.
              </p>
            </div>
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
                placeholder="Give a brief overview of your internship. What did you work on? What was the overall experience like?"
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
                placeholder="What did you enjoy most? Projects, mentorship, team culture, learning opportunities..."
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
                placeholder="What was most challenging? Steep learning curve, tight deadlines, unclear expectations..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Advice for Future Interns *
              </label>
              <textarea
                required
                rows={3}
                value={formData.advice || ""}
                onChange={(e) => updateField("advice", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What would you tell someone starting this internship? Preparation tips, what to expect, how to succeed..."
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
                Interview Process Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.interview_rounds_description || ""}
                onChange={(e) =>
                  updateField("interview_rounds_description", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe each round: Phone screen (behavioral questions), Technical interview (coding challenge on LeetCode), Final round (system design + culture fit)..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Include specific questions or topics if you remember them
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Interview Tips & Preparation Advice *
              </label>
              <textarea
                required
                rows={3}
                value={formData.interview_tips || ""}
                onChange={(e) => updateField("interview_tips", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="How should candidates prepare? What topics to study? What to expect? Any surprises or unique aspects..."
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
                placeholder="20, 30, 40..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Currency
              </label>
              <select
                value={formData.wage_currency || "CAD"}
                onChange={(e) => updateField("wage_currency", e.target.value)}
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="CNY">CNY - Chinese Yuan</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="SGD">SGD - Singapore Dollar</option>
                <option value="CHF">CHF - Swiss Franc</option>
                <option value="NZD">NZD - New Zealand Dollar</option>
                <option value="MXN">MXN - Mexican Peso</option>
                <option value="BRL">BRL - Brazilian Real</option>
                <option value="ZAR">ZAR - South African Rand</option>
                <option value="KRW">KRW - South Korean Won</option>
              </select>
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
                Housing Stipend (Monthly)
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
                placeholder="1000, 2000, 4000..."
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
                placeholder="Free meals, gym membership, transportation stipend, wellness programs, team events..."
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
