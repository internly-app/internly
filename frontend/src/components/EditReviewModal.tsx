"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X } from "lucide-react";
import type { ReviewWithDetails, WorkStyle } from "@/lib/types/database";

interface EditReviewModalProps {
  review: ReviewWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedReview: ReviewWithDetails) => void;
}

export default function EditReviewModal({
  review,
  isOpen,
  onClose,
  onSave,
}: EditReviewModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    location: review.location,
    term: review.term,
    work_style: review.work_style as WorkStyle,
    duration_months: review.duration_months || "",
    team_name: review.team_name || "",
    technologies: review.technologies || "",
    best: review.best,
    hardest: review.hardest,
    interview_round_count: review.interview_round_count,
    interview_rounds_description: review.interview_rounds_description,
    interview_tips: review.interview_tips,
    wage_hourly: review.wage_hourly || "",
    wage_currency: review.wage_currency || "CAD",
    housing_provided: review.housing_provided || false,
    housing_stipend: review.housing_stipend || "",
    perks: review.perks || "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: formData.location,
          term: formData.term,
          work_style: formData.work_style,
          duration_months: formData.duration_months ? Number(formData.duration_months) : undefined,
          team_name: formData.team_name || undefined,
          technologies: formData.technologies || undefined,
          best: formData.best,
          hardest: formData.hardest,
          interview_round_count: formData.interview_round_count,
          interview_rounds_description: formData.interview_rounds_description,
          interview_tips: formData.interview_tips,
          wage_hourly: formData.wage_hourly ? Number(formData.wage_hourly) : undefined,
          wage_currency: formData.wage_currency,
          housing_provided: formData.housing_provided,
          housing_stipend: formData.housing_stipend ? Number(formData.housing_stipend) : undefined,
          perks: formData.perks || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update review");
      }

      const updatedReview = await response.json();
      onSave(updatedReview);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold">Edit Review</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term">Term</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  placeholder="e.g., Summer 2025"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (months)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team Name</Label>
                <Input
                  id="team"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                />
              </div>
            </div>

            {/* Work Style */}
            <div className="space-y-2">
              <Label>Work Style</Label>
              <RadioGroup
                value={formData.work_style}
                onValueChange={(value) => setFormData({ ...formData, work_style: value as WorkStyle })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="onsite" id="onsite" />
                  <Label htmlFor="onsite" className="cursor-pointer">Onsite</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hybrid" id="hybrid" />
                  <Label htmlFor="hybrid" className="cursor-pointer">Hybrid</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remote" id="remote" />
                  <Label htmlFor="remote" className="cursor-pointer">Remote</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Technologies */}
            <div className="space-y-2">
              <Label htmlFor="technologies">Technologies</Label>
              <Input
                id="technologies"
                value={formData.technologies}
                onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                placeholder="React, TypeScript, Python..."
              />
            </div>

            {/* Experience */}
            <div className="space-y-2">
              <Label htmlFor="best">Best Part</Label>
              <Textarea
                id="best"
                value={formData.best}
                onChange={(e) => setFormData({ ...formData, best: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hardest">Hardest Part</Label>
              <Textarea
                id="hardest"
                value={formData.hardest}
                onChange={(e) => setFormData({ ...formData, hardest: e.target.value })}
                rows={3}
                required
              />
            </div>

            {/* Interview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rounds">Interview Rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  min="0"
                  max="20"
                  value={formData.interview_round_count}
                  onChange={(e) => setFormData({ ...formData, interview_round_count: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interview_desc">Interview Description</Label>
              <Textarea
                id="interview_desc"
                value={formData.interview_rounds_description}
                onChange={(e) => setFormData({ ...formData, interview_rounds_description: e.target.value })}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interview_tips">Interview Tips</Label>
              <Textarea
                id="interview_tips"
                value={formData.interview_tips}
                onChange={(e) => setFormData({ ...formData, interview_tips: e.target.value })}
                rows={2}
                required
              />
            </div>

            {/* Compensation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wage">Hourly Wage</Label>
                <Input
                  id="wage"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.wage_hourly}
                  onChange={(e) => setFormData({ ...formData, wage_hourly: e.target.value })}
                  placeholder="e.g., 35.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={formData.wage_currency}
                  onChange={(e) => setFormData({ ...formData, wage_currency: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-zinc-700 bg-transparent px-3 py-1 text-sm transition-colors hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perks">Perks</Label>
              <Textarea
                id="perks"
                value={formData.perks}
                onChange={(e) => setFormData({ ...formData, perks: e.target.value })}
                rows={2}
                placeholder="Free lunch, gym membership..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-700 bg-card">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

