"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

// Placeholder company logos - will be replaced with actual company data
const COMPANIES = [
  "Google",
  "Meta",
  "Amazon",
  "Microsoft",
  "Apple",
  "Netflix",
  "Tesla",
  "Spotify",
  "Airbnb",
  "Uber",
  "LinkedIn",
  "Salesforce",
];

export default function CompanyCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollAmount = 0;
    const scrollStep = 1;
    const scrollInterval = 30;

    const autoScroll = setInterval(() => {
      scrollAmount += scrollStep;
      if (scrollContainer.scrollWidth > 0 && scrollAmount >= scrollContainer.scrollWidth / 2) {
        scrollAmount = 0;
      }
      scrollContainer.scrollLeft = scrollAmount;
    }, scrollInterval);

    return () => clearInterval(autoScroll);
  }, []);

  return (
    <section className="py-16 px-6 overflow-hidden bg-background border-y">
      <div className="max-w-[100rem] mx-auto mb-8">
        <h2 className="text-center text-sm font-medium tracking-wide uppercase text-muted-foreground">
          Companies reviewed by students
        </h2>
      </div>

      {/* Scrolling Container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        {/* Duplicate companies for infinite scroll effect */}
        {[...COMPANIES, ...COMPANIES, ...COMPANIES].map((company, index) => (
          <Badge
            key={index}
            variant="outline"
            className="flex-shrink-0 px-8 py-4 text-lg font-semibold whitespace-nowrap bg-muted border-border"
            style={{ minWidth: "200px" }}
          >
            {company}
          </Badge>
        ))}
      </div>
    </section>
  );
}
