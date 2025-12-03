"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
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
      const response = await fetch(`/api/companies/${company.id}/save`, {
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

  const workStyleBadge = {
    onsite: "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    hybrid: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
    remote: "bg-green-500/20 text-green-300 border border-green-500/40",
  } as const;

  // Get dominant work style
  const getDominantWorkStyle = () => {
    const { onsite, hybrid, remote } = company.work_style_breakdown;
    const total = onsite + hybrid + remote;
    if (total === 0) return null;
    
    if (onsite >= hybrid && onsite >= remote) return "onsite";
    if (hybrid >= onsite && hybrid >= remote) return "hybrid";
    return "remote";
  };

  const dominantWorkStyle = getDominantWorkStyle();

  // Format currency
  const formatPay = (amount: number | null, currency: string) => {
    if (!amount) return null;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <Link href={`/companies/${company.slug}`}>
      <Card className="transition-all duration-200 hover:shadow-md hover:border-zinc-600 cursor-pointer h-full">
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
            {dominantWorkStyle && (
              <Badge
                variant="outline"
                className={`text-xs ${workStyleBadge[dominantWorkStyle]}`}
              >
                {dominantWorkStyle}
              </Badge>
            )}
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

          {/* Common Roles */}
          {company.common_roles.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Briefcase className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1.5">
                {company.common_roles.slice(0, 3).map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
                {company.common_roles.length > 3 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{company.common_roles.length - 3}
                  </Badge>
                )}
              </div>
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

          {/* Technologies */}
          {company.common_technologies.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Code className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1.5">
                {company.common_technologies.slice(0, 5).map((tech) => (
                  <Badge key={tech} variant="outline" className="text-xs">
                    {tech}
                  </Badge>
                ))}
                {company.common_technologies.length > 5 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{company.common_technologies.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 pb-3 px-6">
          <p className="text-xs text-muted-foreground">
            Click to view all reviews →
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}

