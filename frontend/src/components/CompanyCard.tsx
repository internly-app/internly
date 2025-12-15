"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  MessageSquare,
} from "lucide-react";

interface CompanyCardProps {
  company: CompanyWithStats;
  onSaveToggle?: (companyId: string, saved: boolean) => void;
}

export default function CompanyCard({ company, onSaveToggle }: CompanyCardProps) {
  const { user, loading: authLoading } = useAuth();
  const [isSaved, setIsSaved] = useState(company.user_has_saved || false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync saved state with auth changes - reset when user logs out
  useEffect(() => {
    // Don't update while auth is loading to prevent flash
    if (authLoading) return;

    // If user is logged out, reset to false
    // If user is logged in, use the company's saved state
    const newSavedState = user ? (company.user_has_saved || false) : false;
    setIsSaved(newSavedState);
  }, [user, company.user_has_saved, authLoading]);

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

    // Optimistic update - instant UI feedback
    const newState = !isSaved;
    setIsSaved(newState);

    try {
      // Fire-and-forget; only revert on error
      fetch(`/api/companies/save/${company.id}`, {
        method: newState ? "POST" : "DELETE",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to toggle save");
          }
          return response.json();
        })
        .then((data) => {
          setIsSaved(data.saved);
          onSaveToggle?.(company.id, data.saved);
        })
        .catch((error) => {
          console.error("Failed to save company:", error);
          setIsSaved(previousState);
        });
    } catch (error) {
      console.error("Failed to save company:", error);
      setIsSaved(previousState);
    } finally {
      setIsSaving(false);
    }
  };

  // Format pay range
  const formatPayRange = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return null;
    if (min === max || !max) return `$${min?.toFixed(0)} ${currency}/hr`;
    if (!min) return `$${max.toFixed(0)} ${currency}/hr`;
    return `$${min.toFixed(0)}-${max.toFixed(0)} ${currency}/hr`;
  };

  // Extract just the city name from "City, State/Country" format
  // "San Francisco, CA" -> "San Francisco"
  // "Remote" -> "Remote"
  // "London, UK" -> "London"
  const getCityName = (location: string) => {
    if (location === "Remote") return "Remote";
    const parts = location.split(",");
    return parts[0].trim();
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
              className={`group h-8 w-8 p-0 transition-colors ${
                isSaved 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-zinc-700/50"
              }`}
              aria-label={isSaved ? "Unsave company" : "Save company"}
            >
              <Bookmark
                className={`size-5 transition-all duration-200 ${isSaved ? "fill-current" : ""}`}
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

        <CardContent className="pt-0 pb-3 space-y-2.5">
          {/* Pay Information - Most important */}
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="size-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground font-medium">
              {(company.min_pay_cad || company.min_pay_usd) ? (
                <>
                  {(company.min_pay_usd || company.max_pay_usd) && (
                    <span>{formatPayRange(company.min_pay_usd, company.max_pay_usd, "USD")}</span>
                  )}
                  {(company.min_pay_usd || company.max_pay_usd) && (company.min_pay_cad || company.max_pay_cad) && (
                    <span className="text-muted-foreground font-normal"> · </span>
                  )}
                  {(company.min_pay_cad || company.max_pay_cad) && (
                    <span>{formatPayRange(company.min_pay_cad, company.max_pay_cad, "CAD")}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground font-normal">Pay not reported</span>
              )}
            </span>
          </div>

          {/* Location - Where can I work? (city names only for cleaner display) */}
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-foreground">
              {company.common_locations.length > 0 ? (
                <>
                  {company.common_locations.slice(0, 2).map(getCityName).join(", ")}
                  {company.common_locations.length > 2 && ` +${company.common_locations.length - 2}`}
                </>
              ) : (
                <span className="text-muted-foreground">Location not specified</span>
              )}
            </span>
          </div>

          {/* Top Role - Do they hire for my field? */}
          <div className="flex items-start gap-2 text-sm">
            <Briefcase className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-foreground line-clamp-1">
              {company.common_roles.length > 0 ? (
                <>
                  {company.common_roles.slice(0, 2).join(", ")}
                  {company.common_roles.length > 2 && ` +${company.common_roles.length - 2}`}
                </>
              ) : (
                <span className="text-muted-foreground">Roles not specified</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

