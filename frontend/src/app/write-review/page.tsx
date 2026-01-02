"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CustomSelect } from "@/components/CustomSelect";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { useCreateReview } from "@/hooks/useReviews";
import { TechnologyAutocomplete } from "@/components/TechnologyAutocomplete";
import { CompanyAutocomplete } from "@/components/CompanyAutocomplete";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { TermSelect } from "@/components/TermSelect";
import { cn } from "@/lib/utils";
import type { ReviewWithDetails } from "@/lib/types/database";

function WriteReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const { user, loading: authLoading } = useAuth();
  const { createReview, loading: submitting, error } = useCreateReview();

  const [loadingReview, setLoadingReview] = useState(isEditMode);
  const [editingReview, setEditingReview] = useState<ReviewWithDetails | null>(
    null
  );
  const [hasFetchedReview, setHasFetchedReview] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin?redirect=review");
    }
  }, [user, authLoading, router]);

  // Fetch review data if in edit mode (only once)
  useEffect(() => {
    if (!editId || !user || hasFetchedReview) return;

    const fetchReview = async () => {
      try {
        const response = await fetch(`/api/reviews/${editId}`);
        if (response.ok) {
          const review = await response.json();
          // Verify ownership
          if (review.user_id !== user.id) {
            router.push("/profile");
            return;
          }
          setEditingReview(review);
          // Pre-fill form data
          setFormData({
            company_id: review.company_id,
            role_id: review.role_id,
            companyName: review.company?.name || "",
            roleName: review.role?.title || "",
            location: review.location,
            term: review.term,
            work_style: review.work_style,
            duration_months: review.duration_months || "",
            team_name: review.team_name || "",
            overall_experience:
              review.best === review.hardest
                ? review.best
                : `${review.best}\n\nHardest part: ${review.hardest}`,
            technologies: review.technologies || "",
            interview_round_count:
              review.interview_round_count?.toString() || "",
            interview_rounds_description:
              review.interview_rounds_description || "",
            interview_tips: review.interview_tips || "",
            wage_hourly: review.wage_hourly?.toString() || "",
            wage_currency: review.wage_currency || "CAD",
            housing_stipend_provided: review.housing_stipend_provided || false,
            housing_stipend: review.housing_stipend?.toString() || "",
            perks: review.perks || "",
          });
          // Start at step 1 in edit mode (company locked, role editable)
          setStep(1);
          setHasFetchedReview(true);
        } else {
          router.push("/profile");
        }
      } catch (err) {
        console.error("Failed to fetch review:", err);
        router.push("/profile");
      } finally {
        setLoadingReview(false);
      }
    };

    fetchReview();
  }, [editId, user, router, hasFetchedReview]);

  // Form state - start at step 2 if editing
  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [formData, setFormData] = useState({
    // Company & Role (Step 1)
    company_id: "",
    role_id: "",
    companyName: "",
    roleName: "",

    // Your Experience (Step 2) - Combined Details + Experience
    location: "",
    term: "",
    work_style: "onsite" as "onsite" | "hybrid" | "remote",
    duration_months: "" as string | number,
    team_name: "",
    overall_experience: "",
    technologies: "",

    // Interview (Step 3)
    interview_round_count: "",
    interview_rounds_description: "",
    interview_tips: "",

    // Compensation (Step 4)
    wage_hourly: "",
    wage_currency: "CAD",
    housing_stipend_provided: false,
    housing_stipend: "",
    perks: "",
  });

  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    company_id?: string;
    role_id?: string;
    roleName?: string;
  }>({});

  // Submission error (for API/network errors)
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setFieldErrors({});
    setSubmissionError(null);

    // Validate required fields (skip company/role validation in edit mode)
    if (!isEditMode) {
      const errors: { company_id?: string; roleName?: string } = {};
      // Check for company name (not ID, since new companies won't have an ID yet)
      if (!formData.companyName || !formData.companyName.trim()) {
        errors.company_id = "Please select a company";
      }
      if (!formData.roleName || !formData.roleName.trim()) {
        errors.roleName = "Please enter a role name";
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    try {
      if (isEditMode && editId) {
        // Update existing review
        let finalRoleId = formData.role_id;

        // If role_id is empty (user typed a new role name), create/get the role
        if (!finalRoleId && formData.roleName) {
          const roleSlug = formData.roleName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/-+/g, "-");

          const roleResponse = await fetch("/api/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: formData.roleName.trim(),
              company_id: formData.company_id,
              slug: roleSlug,
            }),
          });

          if (!roleResponse.ok) {
            const error = await roleResponse.json();
            throw new Error(error.error || "Failed to create role");
          }

          const role = await roleResponse.json();
          finalRoleId = role.id;
        }

        const parsedWage = parseFloat(formData.wage_hourly);
        const parsedHousingStipend = formData.housing_stipend
          ? parseFloat(formData.housing_stipend)
          : undefined;
        const parsedDuration = formData.duration_months
          ? typeof formData.duration_months === "string"
            ? parseInt(formData.duration_months)
            : formData.duration_months
          : undefined;

        const updateData = {
          role_id: finalRoleId,
          location: formData.location,
          term: formData.term,
          work_style: formData.work_style,
          duration_months: parsedDuration,
          team_name: formData.team_name || undefined,
          technologies: formData.technologies || undefined,
          overall_experience: formData.overall_experience || undefined,
          wage_hourly: isNaN(parsedWage) ? undefined : parsedWage,
          wage_currency: formData.wage_currency || "CAD",
          housing_stipend_provided: formData.housing_stipend_provided,
          housing_stipend:
            formData.housing_stipend_provided &&
            parsedHousingStipend &&
            !isNaN(parsedHousingStipend)
              ? parsedHousingStipend
              : undefined,
          perks: formData.perks || undefined,
          interview_round_count: formData.interview_round_count
            ? parseInt(formData.interview_round_count)
            : 0,
          interview_rounds_description:
            formData.interview_rounds_description || undefined,
          interview_tips: formData.interview_tips || undefined,
        };

        const response = await fetch(`/api/reviews/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error.details || error.error || "Failed to update review"
          );
        }

        router.push("/profile");
      } else {
        // Create new review
        let companyId = formData.company_id;

        // If company_id is empty, we need to create the company first
        if (!companyId && formData.companyName) {
          // Generate slug: lowercase, replace non-alphanumeric with hyphens, trim hyphens, collapse multiple hyphens
          const slug = formData.companyName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
            .replace(/-+/g, "-"); // Collapse multiple hyphens to single

          const companyResponse = await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formData.companyName.trim(),
              slug: slug,
            }),
          });

          if (!companyResponse.ok) {
            const error = await companyResponse.json();
            const errorMessage = error.error || "Failed to create company";
            const errorDetails = error.details ? `: ${error.details}` : "";
            throw new Error(`${errorMessage}${errorDetails}`);
          }

          const newCompany = await companyResponse.json();
          companyId = newCompany.id;
        }

        // Create or get role
        // Generate slug: lowercase, replace non-alphanumeric with hyphens, trim hyphens, collapse multiple hyphens
        const roleSlug = formData.roleName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
          .replace(/-+/g, "-"); // Collapse multiple hyphens to single

        const roleResponse = await fetch("/api/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formData.roleName.trim(),
            company_id: companyId,
            slug: roleSlug,
          }),
        });

        if (!roleResponse.ok) {
          const error = await roleResponse.json();
          throw new Error(error.error || "Failed to create role");
        }

        const role = await roleResponse.json();

        const reviewData = {
          company_id: companyId,
          role_id: role.id,
          location: formData.location,
          term: formData.term,
          work_style: formData.work_style,
          duration_months: formData.duration_months
            ? typeof formData.duration_months === "string"
              ? parseInt(formData.duration_months)
              : formData.duration_months
            : undefined,
          team_name: formData.team_name || undefined,
          technologies: formData.technologies || undefined,
          overall_experience: formData.overall_experience,
          // Backwards-compatibility for the current shared ReviewCreate type.
          // The API/DB will store overall_experience as canonical.
          best: formData.overall_experience,
          hardest: formData.overall_experience,
          advice: undefined,
          wage_hourly: parseFloat(formData.wage_hourly),
          wage_currency: formData.wage_currency || "CAD",
          housing_stipend_provided: formData.housing_stipend_provided,
          housing_stipend:
            formData.housing_stipend_provided && formData.housing_stipend
              ? parseFloat(formData.housing_stipend)
              : undefined,
          perks: formData.perks || undefined,
          interview_round_count: formData.interview_round_count
            ? parseInt(formData.interview_round_count)
            : 0,
          interview_rounds_description: formData.interview_rounds_description,
          interview_tips: formData.interview_tips,
        };

        const newReview = await createReview(reviewData);
        // Store new review in sessionStorage for optimistic UI update
        if (newReview) {
          sessionStorage.setItem(
            "newlyCreatedReview",
            JSON.stringify(newReview)
          );
        }
        // Server-side revalidation handles cache invalidation
        router.push("/reviews");
      }
    } catch (err) {
      // Extract user-friendly error message
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      // Set submission error to display to user
      setSubmissionError(errorMessage);
      console.error("Failed to submit review:", err);
    }
  };

  const canProceedFromStep1 =
    formData.companyName &&
    formData.companyName.trim() &&
    formData.roleName &&
    formData.roleName.trim();
  // Easy-first flow:
  // 1) Company/role/term
  // 2) Work style + basics
  // 3) Pay
  // 4) Written experience + interview
  const canProceedFromStep2 =
    formData.location && formData.term && formData.work_style;
  const canProceedFromStep3 =
    formData.wage_hourly && parseFloat(formData.wage_hourly) > 0;
  const canProceedFromStep4 =
    formData.overall_experience &&
    formData.interview_round_count &&
    formData.interview_rounds_description;

  if (authLoading || loadingReview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background py-16 sm:py-20 md:py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              // Go back if there's history, otherwise go to home
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
            {isEditMode ? "Edit Review" : "Write a Review"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isEditMode
              ? `Editing your review for ${
                  editingReview?.company?.name || "this company"
                }`
              : "Share your internship experience to help fellow students"}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {[
              { num: 1, label: "Position & Company" },
              { num: 2, label: "Role Details" },
              { num: 3, label: "Compensation" },
              { num: 4, label: "Experience & Interview" },
            ].map((s, index) => (
              <div key={s.num} className="flex flex-col items-center space-y-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    s.num === step
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : s.num < step
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground border-2 border-zinc-700"
                  }`}
                >
                  {s.num < step ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-xs transition-colors duration-200 ${
                    s.num === step
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Step 1: Company & Role */}
            {step === 1 && (
              <form>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="company">
                      Company <span className="text-red-500">*</span>
                    </Label>
                    {isEditMode ? (
                      <div className="relative">
                        <Input
                          value={formData.companyName}
                          disabled
                          className="bg-muted text-muted-foreground opacity-100"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Company cannot be changed when editing a review
                        </p>
                      </div>
                    ) : (
                      <CompanyAutocomplete
                        value={formData.company_id}
                        onChange={(companyId, companyName) => {
                          setFormData({
                            ...formData,
                            company_id: companyId,
                            companyName: companyName,
                            role_id: "", // Reset role when company changes
                            roleName: "",
                          });
                          // Clear error when user selects
                          if (fieldErrors.company_id) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              company_id: undefined,
                            }));
                          }
                        }}
                        placeholder="Type to search companies..."
                        error={fieldErrors.company_id}
                      />
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="role"
                      type="text"
                      placeholder="e.g., Software Engineering Intern, Product Design Intern..."
                      value={formData.roleName}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          roleName: e.target.value,
                          role_id: "", // Clear role_id when user types
                        });
                        // Clear error when user types
                        if (fieldErrors.role_id || fieldErrors.roleName) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            role_id: undefined,
                            roleName: undefined,
                          }));
                        }
                      }}
                      disabled={!formData.companyName}
                      className={
                        fieldErrors.roleName || fieldErrors.role_id
                          ? "border-destructive"
                          : ""
                      }
                      required
                    />
                    {(fieldErrors.roleName || fieldErrors.role_id) && (
                      <p className="mt-1 text-sm text-destructive">
                        {fieldErrors.roleName || fieldErrors.role_id}
                      </p>
                    )}
                    {!formData.companyName &&
                      !fieldErrors.roleName &&
                      !fieldErrors.role_id && (
                        <p className="text-xs text-muted-foreground">
                          Please select a company first
                        </p>
                      )}
                  </div>
                </div>
              </form>
            )}

            {/* Step 2: Role Details (quick basics) */}
            {step === 2 && (
              <form>
                <div className="flex flex-col gap-6">
                  {/* Basic Details */}
                  <div className="grid gap-2">
                    <Label htmlFor="location">
                      Location <span className="text-red-500">*</span>
                    </Label>
                    <LocationAutocomplete
                      value={formData.location}
                      onChange={(value) =>
                        setFormData({ ...formData, location: value })
                      }
                      placeholder="Select location..."
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="term">
                      Term <span className="text-red-500">*</span>
                    </Label>
                    <TermSelect
                      value={formData.term}
                      onChange={(value) =>
                        setFormData({ ...formData, term: value })
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>
                      Work Style <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={formData.work_style}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          work_style: value as "onsite" | "hybrid" | "remote",
                        })
                      }
                      className="flex gap-6"
                      required
                    >
                      {(["onsite", "hybrid", "remote"] as const).map(
                        (style) => (
                          <div
                            key={style}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem value={style} id={style} />
                            <Label
                              htmlFor={style}
                              className="cursor-pointer capitalize"
                            >
                              {style}
                            </Label>
                          </div>
                        )
                      )}
                    </RadioGroup>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="duration_months">Duration (Months)</Label>
                    <Input
                      id="duration_months"
                      type="number"
                      min="1"
                      max="24"
                      placeholder="4, 8..."
                      value={formData.duration_months}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_months: e.target.value
                            ? parseInt(e.target.value)
                            : "",
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="team_name">Team Name</Label>
                    <Input
                      id="team_name"
                      placeholder="Platform Engineering, Product Design..."
                      value={formData.team_name}
                      onChange={(e) =>
                        setFormData({ ...formData, team_name: e.target.value })
                      }
                    />
                  </div>
                </div>
              </form>
            )}

            {/* Step 3: Compensation */}
            {step === 3 && (
              <form>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="wage_currency">
                      Currency <span className="text-red-500">*</span>
                    </Label>
                    <CustomSelect
                      id="wage_currency"
                      value={formData.wage_currency}
                      onChange={(value) =>
                        setFormData({ ...formData, wage_currency: value })
                      }
                      options={[
                        { value: "CAD", label: "CAD - Canadian Dollar" },
                        { value: "USD", label: "USD - US Dollar" },
                        { value: "EUR", label: "EUR - Euro" },
                        { value: "GBP", label: "GBP - British Pound" },
                        { value: "AUD", label: "AUD - Australian Dollar" },
                        { value: "JPY", label: "JPY - Japanese Yen" },
                        { value: "CHF", label: "CHF - Swiss Franc" },
                        { value: "CNY", label: "CNY - Chinese Yuan" },
                        { value: "INR", label: "INR - Indian Rupee" },
                        { value: "SGD", label: "SGD - Singapore Dollar" },
                      ]}
                      placeholder="Select currency..."
                      required
                      searchable={false}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="wage_hourly">
                      Hourly Wage <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="wage_hourly"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 25.00"
                      value={formData.wage_hourly}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wage_hourly: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Housing Stipend Provided?</Label>
                    <RadioGroup
                      value={formData.housing_stipend_provided ? "yes" : "no"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          housing_stipend_provided: value === "yes",
                          housing_stipend:
                            value === "no" ? "" : formData.housing_stipend,
                        })
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="housing_yes" />
                        <Label htmlFor="housing_yes" className="cursor-pointer">
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="housing_no" />
                        <Label htmlFor="housing_no" className="cursor-pointer">
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.housing_stipend_provided && (
                    <div className="grid gap-2">
                      <Label htmlFor="housing_stipend">
                        Monthly Housing Stipend Amount
                      </Label>
                      <Input
                        id="housing_stipend"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g., 2000.00"
                        value={formData.housing_stipend}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            housing_stipend: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="perks">Other Perks</Label>
                    <textarea
                      id="perks"
                      placeholder="List any additional perks or benefits you received (e.g., free lunch, gym membership, relocation bonus, transportation allowance, learning budget, team events...)"
                      value={formData.perks}
                      onChange={(e) =>
                        setFormData({ ...formData, perks: e.target.value })
                      }
                      rows={3}
                      maxLength={500}
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-base transition-colors placeholder:text-muted-foreground hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                      )}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.perks.length}/500
                    </p>
                  </div>
                </div>
              </form>
            )}

            {/* Step 4: Your Experience (text last) + Interview */}
            {step === 4 && (
              <form>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="overall_experience">
                      Overall experience (good + bad){" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="overall_experience"
                      placeholder="Example: Great mentorship and meaningful work, but long hours near deadlines and a steep learning curve. I learned a ton and would still recommend it."
                      value={formData.overall_experience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          overall_experience: e.target.value,
                        })
                      }
                      rows={4}
                      maxLength={600}
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-base transition-colors placeholder:text-muted-foreground hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                      )}
                      required
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.overall_experience.length}/600
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="technologies">
                      Technologies & Skills Used
                    </Label>
                    <TechnologyAutocomplete
                      value={formData.technologies}
                      onChange={(value) =>
                        setFormData({ ...formData, technologies: value })
                      }
                      placeholder="Type to search technologies..."
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="interview_round_count">
                      Number of Interview Rounds{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="interview_round_count"
                      type="number"
                      placeholder="2, 3, 4..."
                      value={formData.interview_round_count}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interview_round_count: e.target.value,
                        })
                      }
                      min="0"
                      max="20"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="interview_rounds_description">
                      Interview Rounds Description{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="interview_rounds_description"
                      placeholder="Example: Round 1: 30-min phone screen with recruiter discussing background and resume grill. Round 2: 1-hour technical coding challenge on CodeSignal. I was asked to implement a function to find the longest common subsequence of two strings (Leetcode 1143). Round 3: 1-hour System Design interview with a senior engineer discussing the architecture of Netflix."
                      value={formData.interview_rounds_description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interview_rounds_description: e.target.value,
                        })
                      }
                      rows={4}
                      maxLength={600}
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-base transition-colors placeholder:text-muted-foreground hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                      )}
                      required
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.interview_rounds_description.length}/600
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="interview_tips">Interview Tips</Label>
                    <textarea
                      id="interview_tips"
                      placeholder="Share your tips and advice for candidates preparing for this interview. What should they study? What topics are commonly asked? How should they prepare? Any specific resources or strategies that helped you?"
                      value={formData.interview_tips}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interview_tips: e.target.value,
                        })
                      }
                      rows={4}
                      maxLength={400}
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-base transition-colors placeholder:text-muted-foreground hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                      )}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.interview_tips.length}/400
                    </p>
                  </div>
                </div>
              </form>
            )}

            {/* Error Messages */}
            {(error || submissionError) && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-semibold mb-1">
                  {submissionError ? "Error submitting review" : "Error"}
                </p>
                <p className="text-sm text-destructive">
                  {error || submissionError}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                className="w-auto"
              >
                Back
              </Button>

              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !canProceedFromStep1) ||
                    (step === 2 && !canProceedFromStep2) ||
                    (step === 3 && !canProceedFromStep3)
                  }
                  className="w-auto"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canProceedFromStep4}
                  className="w-auto"
                >
                  {submitting
                    ? isEditMode
                      ? "Saving..."
                      : "Submitting..."
                    : isEditMode
                    ? "Save Changes"
                    : "Submit Review"}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function WriteReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="w-full max-w-3xl">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      }
    >
      <WriteReviewContent />
    </Suspense>
  );
}
