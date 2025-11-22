"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { useCreateReview } from "@/hooks/useReviews";
import { TechnologyAutocomplete } from "@/components/TechnologyAutocomplete";
import { CompanyAutocomplete } from "@/components/CompanyAutocomplete";

export default function WriteReviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createReview, loading: submitting, error } = useCreateReview();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin?redirect=review");
    }
  }, [user, authLoading, router]);

  // Form state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Company & Role (Step 1)
    company_id: "",
    role_id: "",
    companyName: "",
    roleName: "",

    // Basic Info (Step 2)
    location: "",
    term: "",
    work_style: "onsite" as "onsite" | "hybrid" | "remote",
    duration_months: "" as string | number,
    work_hours: "" as string,
    team_name: "",

    // Experience (Step 3)
    summary: "",
    best: "",
    hardest: "",
    advice: "",
    technologies: "",

    // Compensation (Step 4)
    wage_hourly: "",
    wage_currency: "CAD",
    housing_provided: false,
    housing_stipend: "",
    perks: "",

    // Interview (Step 5)
    interview_round_count: "",
    interview_rounds_description: "",
    interview_tips: "",
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
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setFieldErrors({});
    setSubmissionError(null);

    // Validate required fields
    const errors: { company_id?: string; roleName?: string } = {};
    if (!formData.company_id) {
      errors.company_id = "Please select a company";
    }
    if (!formData.roleName || !formData.roleName.trim()) {
      errors.roleName = "Please enter a role name";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      // Create or get role
      const roleResponse = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.roleName.trim(),
          company_id: formData.company_id,
          slug: formData.roleName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        }),
      });

      if (!roleResponse.ok) {
        const error = await roleResponse.json();
        throw new Error(error.error || "Failed to create role");
      }

      const role = await roleResponse.json();

      const reviewData = {
        company_id: formData.company_id,
        role_id: role.id,
        location: formData.location,
        term: formData.term,
        work_style: formData.work_style,
        duration_months: formData.duration_months ? (typeof formData.duration_months === "string" ? parseInt(formData.duration_months) : formData.duration_months) : undefined,
        work_hours: formData.work_hours && formData.work_hours !== "" ? (formData.work_hours as "full-time" | "part-time") : undefined,
        team_name: formData.team_name || undefined,
        technologies: formData.technologies || undefined,
        summary: formData.summary,
        best: formData.best,
        hardest: formData.hardest,
        advice: formData.advice,
        wage_hourly: formData.wage_hourly ? parseFloat(formData.wage_hourly) : undefined,
        wage_currency: formData.wage_currency || "CAD",
        housing_provided: formData.housing_provided,
        housing_stipend: formData.housing_stipend ? parseFloat(formData.housing_stipend) : undefined,
        perks: formData.perks || undefined,
        interview_round_count: formData.interview_round_count ? parseInt(formData.interview_round_count) : 0,
        interview_rounds_description: formData.interview_rounds_description,
        interview_tips: formData.interview_tips,
      };

      await createReview(reviewData);
      router.push("/");
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

  const canProceedFromStep1 = formData.company_id && formData.roleName && formData.roleName.trim();
  const canProceedFromStep2 = formData.location && formData.term;
  const canProceedFromStep3 = formData.summary && formData.best && formData.hardest;
  const canProceedFromStep5 = formData.interview_rounds_description && formData.interview_tips;

  if (authLoading) {
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
    <div className="min-h-screen bg-background py-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
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
            Back to home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Write a Review</h1>
          <p className="text-muted-foreground">
            Share your internship experience to help fellow students
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex items-center ${
                  s <= step ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    s <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </div>
                {s < 5 && (
                  <div
                    className={`w-12 lg:w-24 h-1 mx-2 transition-all duration-200 ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Company</span>
            <span>Details</span>
            <span>Experience</span>
            <span>Compensation</span>
            <span>Interview</span>
          </div>
        </div>

        {/* Form Steps */}
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Company & Role"}
              {step === 2 && "Internship Details"}
              {step === 3 && "Your Experience"}
              {step === 4 && "Compensation (Optional)"}
              {step === 5 && "Interview Process"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Select the company and role you interned at"}
              {step === 2 && "Tell us about the basics of your internship"}
              {step === 3 && "Share your experience and insights"}
              {step === 4 && "Help others understand the compensation"}
              {step === 5 && "Describe the interview process"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Company & Role */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-medium">
                    Company *
                  </label>
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
                        setFieldErrors((prev) => ({ ...prev, company_id: undefined }));
                      }
                    }}
                    placeholder="Type to search companies..."
                    error={fieldErrors.company_id}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Role *
                  </label>
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
                        setFieldErrors((prev) => ({ ...prev, role_id: undefined, roleName: undefined }));
                      }
                    }}
                    disabled={!formData.company_id}
                    className={
                      fieldErrors.roleName || fieldErrors.role_id
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {(fieldErrors.roleName || fieldErrors.role_id) && (
                    <p className="mt-1 text-sm text-destructive">{fieldErrors.roleName || fieldErrors.role_id}</p>
                  )}
                  {!formData.company_id && !fieldErrors.roleName && !fieldErrors.role_id && (
                    <p className="text-xs text-muted-foreground">
                      Please select a company first
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Basic Info */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="location" className="text-sm font-medium">
                    Location *
                  </label>
                  <Input
                    id="location"
                    placeholder="e.g., San Francisco, CA"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="term" className="text-sm font-medium">
                    Term *
                  </label>
                  <Input
                    id="term"
                    placeholder="e.g., Summer 2024"
                    value={formData.term}
                    onChange={(e) =>
                      setFormData({ ...formData, term: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Work Style *</label>
                  <div className="flex gap-4">
                    {(["onsite", "hybrid", "remote"] as const).map((style) => (
                      <label key={style} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="work_style"
                          value={style}
                          checked={formData.work_style === style}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              work_style: e.target.value as "onsite" | "hybrid" | "remote",
                            })
                          }
                          className="w-4 h-4 text-primary border-input focus:ring-ring"
                        />
                        <span className="text-sm capitalize">{style}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="duration_months" className="text-sm font-medium">
                    Duration (Months)
                  </label>
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
                        duration_months: e.target.value ? parseInt(e.target.value) : "",
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    How long was your internship?
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="work_hours" className="text-sm font-medium">
                    Work Hours
                  </label>
                  <select
                    id="work_hours"
                    value={formData.work_hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        work_hours: e.target.value as "" | "full-time" | "part-time",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select...</option>
                    <option value="full-time">Full-time (40+ hrs/week)</option>
                    <option value="part-time">Part-time (&lt;40 hrs/week)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="team_name" className="text-sm font-medium">
                    Team Name
                  </label>
                  <Input
                    id="team_name"
                    placeholder="Platform Engineering, Product Design..."
                    value={formData.team_name}
                    onChange={(e) =>
                      setFormData({ ...formData, team_name: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {/* Step 3: Experience */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="summary" className="text-sm font-medium">
                    Summary *
                  </label>
                  <textarea
                    id="summary"
                    placeholder="Describe your overall experience..."
                    value={formData.summary}
                    onChange={(e) =>
                      setFormData({ ...formData, summary: e.target.value })
                    }
                    rows={4}
                    maxLength={2000}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.summary.length}/2000
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="best" className="text-sm font-medium">
                    Best Part *
                  </label>
                  <textarea
                    id="best"
                    placeholder="What did you enjoy most?"
                    value={formData.best}
                    onChange={(e) =>
                      setFormData({ ...formData, best: e.target.value })
                    }
                    rows={3}
                    maxLength={1000}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.best.length}/1000
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="hardest" className="text-sm font-medium">
                    Hardest Part *
                  </label>
                  <textarea
                    id="hardest"
                    placeholder="What was most challenging?"
                    value={formData.hardest}
                    onChange={(e) =>
                      setFormData({ ...formData, hardest: e.target.value })
                    }
                    rows={3}
                    maxLength={1000}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.hardest.length}/1000
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="advice" className="text-sm font-medium">
                    Advice for Future Interns
                  </label>
                  <textarea
                    id="advice"
                    placeholder="Any tips for future interns?"
                    value={formData.advice}
                    onChange={(e) =>
                      setFormData({ ...formData, advice: e.target.value })
                    }
                    rows={3}
                    maxLength={1000}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.advice.length}/1000
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="technologies" className="text-sm font-medium">
                    Technologies & Skills Used
                  </label>
                  <TechnologyAutocomplete
                    value={formData.technologies}
                    onChange={(value) =>
                      setFormData({ ...formData, technologies: value })
                    }
                    placeholder="Type to search technologies..."
                  />
                </div>
              </>
            )}

            {/* Step 4: Compensation */}
            {step === 4 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="wage_currency" className="text-sm font-medium">
                    Currency
                  </label>
                  <select
                    id="wage_currency"
                    value={formData.wage_currency}
                    onChange={(e) =>
                      setFormData({ ...formData, wage_currency: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="wage_hourly" className="text-sm font-medium">
                    Hourly Wage
                  </label>
                  <Input
                    id="wage_hourly"
                    type="number"
                    placeholder="20, 30, 40..."
                    value={formData.wage_hourly}
                    onChange={(e) =>
                      setFormData({ ...formData, wage_hourly: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.housing_provided}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          housing_provided: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                    />
                    <span className="text-sm font-medium">Housing Provided</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label htmlFor="housing_stipend" className="text-sm font-medium">
                    Monthly Housing Stipend
                  </label>
                  <Input
                    id="housing_stipend"
                    type="number"
                    placeholder="1500, 2500, 3500..."
                    value={formData.housing_stipend}
                    onChange={(e) =>
                      setFormData({ ...formData, housing_stipend: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="perks" className="text-sm font-medium">
                    Other Perks
                  </label>
                  <textarea
                    id="perks"
                    placeholder="e.g., Free lunch, gym membership, relocation bonus..."
                    value={formData.perks}
                    onChange={(e) =>
                      setFormData({ ...formData, perks: e.target.value })
                    }
                    rows={3}
                    maxLength={500}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.perks.length}/500
                  </p>
                </div>
              </>
            )}

            {/* Step 5: Interview */}
            {step === 5 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="interview_round_count" className="text-sm font-medium">
                    Number of Interview Rounds *
                  </label>
                  <Input
                    id="interview_round_count"
                    type="number"
                    placeholder="3"
                    value={formData.interview_round_count}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interview_round_count: e.target.value,
                      })
                    }
                    min="0"
                    max="20"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="interview_rounds_description"
                    className="text-sm font-medium"
                  >
                    Interview Rounds Description *
                  </label>
                  <textarea
                    id="interview_rounds_description"
                    placeholder="Describe each round (e.g., Round 1: HR screening, Round 2: Technical coding challenge...)"
                    value={formData.interview_rounds_description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interview_rounds_description: e.target.value,
                      })
                    }
                    rows={4}
                    maxLength={1000}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.interview_rounds_description.length}/1000
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="interview_tips" className="text-sm font-medium">
                    Interview Tips *
                  </label>
                  <textarea
                    id="interview_tips"
                    placeholder="Any advice for candidates interviewing for this role?"
                    value={formData.interview_tips}
                    onChange={(e) =>
                      setFormData({ ...formData, interview_tips: e.target.value })
                    }
                    rows={4}
                    maxLength={1000}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.interview_tips.length}/1000
                  </p>
                </div>
              </>
            )}

            {/* Error Messages */}
            {(error || submissionError) && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-semibold mb-1">
                  {submissionError ? "Error submitting review" : "Error"}
                </p>
                <p className="text-sm text-destructive">{error || submissionError}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>

              {step < 5 ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !canProceedFromStep1) ||
                    (step === 2 && !canProceedFromStep2) ||
                    (step === 3 && !canProceedFromStep3)
                  }
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canProceedFromStep5}
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
