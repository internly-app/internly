"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CompanyWithStats } from "@/lib/types/database";
import { useAuth } from "@/components/AuthProvider";
import { CompanyLogo } from "@/components/CompanyLogo";
import { 
  Bookmark, 
  MapPin, 
  Briefcase, 
  Clock, 
  Users,
  DollarSign,
  MessageSquare,
  Code
} from "lucide-react";

interface CompanyCardProps {
  company: CompanyWithStats;
  onSaveToggle?: (companyId: string, saved: boolean) => void;
}

export default function CompanyCard({ company, onSaveToggle }: CompanyCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(company.user_has_saved || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      window.location.href = "/signin";
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    const previousState = isSaved;

    // Optimistic update
    setIsSaved(!isSaved);

    try {
      const response = await fetch(`/api/companies/save/${company.id}`, {
        method: isSaved ? "DELETE" : "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle save");
      }

      const data = await response.json();
      setIsSaved(data.saved);
      onSaveToggle?.(company.id, data.saved);
    } catch (error) {
      console.error("Failed to save company:", error);
      setIsSaved(previousState);
    } finally {
      setIsSaving(false);
    }
  };

  // Format currency
  const formatPay = (amount: number | null) => {
    if (!amount) return null;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <Link href={`/companies/${company.slug}`}>
      <Card className="transition-all duration-200 hover:shadow-md hover:border-zinc-500 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Company Logo */}
              <CompanyLogo
                companyName={company.name}
                logoUrl={company.logo_url}
                size={48}
              />

              {/* Company Name & Industry */}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold mb-1 truncate">
                  {company.name}
                </CardTitle>
                {company.industry && (
                  <p className="text-sm text-muted-foreground truncate">
                    {company.industry}
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToggle}
              disabled={isSaving}
              className="h-8 w-8 p-0 hover:bg-muted transition-colors"
              aria-label={isSaved ? "Unsave company" : "Save company"}
            >
              <Bookmark 
                className={`size-5 transition-all ${isSaved ? "fill-current text-primary" : ""}`} 
              />
            </Button>
          </div>

          {/* Review Count Badge */}
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              <MessageSquare className="size-3 mr-1" />
              {company.review_count} {company.review_count === 1 ? "review" : "reviews"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 space-y-3">
          {/* Pay Information */}
          {(company.avg_pay_cad || company.avg_pay_usd) && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="size-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Avg Pay:</span>
              <span className="text-foreground font-medium">
                {company.avg_pay_cad && `${formatPay(company.avg_pay_cad, "CAD")} CAD`}
                {company.avg_pay_cad && company.avg_pay_usd && " / "}
                {company.avg_pay_usd && `${formatPay(company.avg_pay_usd, "USD")} USD`}
                <span className="text-muted-foreground font-normal">/hr</span>
              </span>
            </div>
          )}

          {/* Interview Rounds */}
          {company.avg_interview_rounds && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Interview:</span>
              <span className="text-foreground">
                ~{Math.round(company.avg_interview_rounds)} rounds
                {company.common_interview_format && (
                  <span className="text-muted-foreground"> · {company.common_interview_format}</span>
                )}
              </span>
            </div>
          )}

          {/* Duration */}
          {company.avg_duration_months && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Typical term:</span>
              <span className="text-foreground">
                ~{Math.round(company.avg_duration_months)} months
              </span>
            </div>
          )}

          {/* Common Roles - show as text for cleaner look */}
          {company.common_roles.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Briefcase className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-foreground line-clamp-1">
                {company.common_roles.slice(0, 2).join(", ")}
                {company.common_roles.length > 2 && ` +${company.common_roles.length - 2}`}
              </span>
            </div>
          )}

          {/* Common Locations */}
          {company.common_locations.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-foreground">
                {company.common_locations.slice(0, 3).join(", ")}
                {company.common_locations.length > 3 && ` +${company.common_locations.length - 3}`}
              </span>
            </div>
          )}

          {/* Technologies - show as text, not badges for cleaner look */}
          {company.common_technologies.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Code className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-foreground line-clamp-1">
                {company.common_technologies.slice(0, 4).join(", ")}
                {company.common_technologies.length > 4 && ` +${company.common_technologies.length - 4}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

