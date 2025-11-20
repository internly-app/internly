"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { useCreateReview } from "@/hooks/useReviews";

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

    // Experience (Step 3)
    summary: "",
    best: "",
    hardest: "",
    advice: "",

    // Compensation (Step 4)
    wage_hourly: "",
    housing_provided: false,
    housing_stipend: "",
    perks: "",

    // Interview (Step 5)
    interview_round_count: "",
    interview_rounds_description: "",
    interview_tips: "",
  });

  // Companies and roles (would be fetched from API in production)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; title: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const response = await fetch("/api/companies");
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.companies || []);
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch roles when company is selected
  useEffect(() => {
    if (!formData.company_id) {
      setRoles([]);
      return;
    }

    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await fetch(`/api/roles?company_id=${formData.company_id}`);
        if (response.ok) {
          const data = await response.json();
          setRoles(data.roles || []);
        }
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, [formData.company_id]);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      const reviewData = {
        company_id: formData.company_id,
        role_id: formData.role_id,
        location: formData.location,
        term: formData.term,
        work_style: formData.work_style,
        summary: formData.summary,
        best: formData.best,
        hardest: formData.hardest,
        advice: formData.advice,
        wage_hourly: formData.wage_hourly ? parseFloat(formData.wage_hourly) : undefined,
        wage_currency: "USD",
        housing_provided: formData.housing_provided,
        housing_stipend: formData.housing_stipend ? parseFloat(formData.housing_stipend) : undefined,
        perks: formData.perks,
        interview_round_count: parseInt(formData.interview_round_count) || 0,
        interview_rounds_description: formData.interview_rounds_description,
        interview_tips: formData.interview_tips,
      };

      await createReview(reviewData);
      router.push("/");
    } catch (err) {
      console.error("Failed to submit review:", err);
    }
  };

  const canProceedFromStep1 = formData.company_id && formData.role_id;
  const canProceedFromStep2 = formData.location && formData.term;
  const canProceedFromStep3 = formData.summary && formData.best && formData.hardest;
  const canProceedFromStep5 = formData.interview_rounds_description && formData.interview_tips;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-[#7748F6] border-t-transparent rounded-full animate-spin" />
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
                  s <= step ? "text-[#7748F6]" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    s <= step
                      ? "bg-[#7748F6] text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </div>
                {s < 5 && (
                  <div
                    className={`w-12 lg:w-24 h-1 mx-2 transition-all duration-200 ${
                      s < step ? "bg-[#7748F6]" : "bg-muted"
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
                  <select
                    id="company"
                    value={formData.company_id}
                    onChange={(e) => {
                      const selectedCompany = companies.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        company_id: e.target.value,
                        companyName: selectedCompany?.name || "",
                        role_id: "", // Reset role when company changes
                        roleName: "",
                      });
                    }}
                    disabled={loadingCompanies}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Role *
                  </label>
                  <select
                    id="role"
                    value={formData.role_id}
                    onChange={(e) => {
                      const selectedRole = roles.find(r => r.id === e.target.value);
                      setFormData({
                        ...formData,
                        role_id: e.target.value,
                        roleName: selectedRole?.title || "",
                      });
                    }}
                    disabled={!formData.company_id || loadingRoles}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                  {!formData.company_id && (
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
                              work_style: e.target.value as any,
                            })
                          }
                          className="w-4 h-4 text-[#7748F6] border-gray-300 focus:ring-[#7748F6]"
                        />
                        <span className="text-sm capitalize">{style}</span>
                      </label>
                    ))}
                  </div>
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
              </>
            )}

            {/* Step 4: Compensation */}
            {step === 4 && (
              <>
                <div className="space-y-2">
                  <label htmlFor="wage_hourly" className="text-sm font-medium">
                    Hourly Wage (USD)
                  </label>
                  <Input
                    id="wage_hourly"
                    type="number"
                    placeholder="e.g., 35"
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
                      className="w-4 h-4 text-[#7748F6] border-gray-300 rounded focus:ring-[#7748F6]"
                    />
                    <span className="text-sm font-medium">Housing Provided</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label htmlFor="housing_stipend" className="text-sm font-medium">
                    Housing Stipend (USD)
                  </label>
                  <Input
                    id="housing_stipend"
                    type="number"
                    placeholder="e.g., 2000"
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
                    placeholder="e.g., 3"
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

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
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
                  className="bg-[#7748F6] text-white hover:bg-[#6636E5]"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canProceedFromStep5}
                  className="bg-[#7748F6] text-white hover:bg-[#6636E5]"
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
