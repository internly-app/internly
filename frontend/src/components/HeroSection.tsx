"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ROTATING_WORDS = [
  "Real experiences",
  "Honest reviews",
  "Student insights",
  "Career guidance",
];

export default function HeroSection() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setIsVisible(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex items-center justify-center px-6 overflow-hidden bg-background transition-colors duration-300 pt-24 pb-12">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center py-12">
        {/* Animated Headline */}
        <h1 className="text-display mb-6 text-foreground">
          <span
            className="inline-block transition-all duration-300"
            style={{
              opacity: isVisible ? 1 : 0,
              filter: isVisible ? "blur(0px)" : "blur(8px)",
              transform: isVisible ? "translateY(0)" : "translateY(-10px)",
            }}
          >
            {ROTATING_WORDS[currentWordIndex]}
          </span>
          <br />
          from real interns
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-muted-foreground font-normal">
          Discover what it&apos;s really like to intern at top companies. Read
          authentic reviews from students who&apos;ve been there.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto rounded-full px-8 text-base bg-[#7748F6] text-white hover:bg-[#6636E5] transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            <Link href="#reviews">Explore Reviews</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto rounded-full px-8 text-base border-border hover:border-[#7748F6] hover:text-[#7748F6] transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Link href="/signin?redirect=review">Share Your Experience</Link>
          </Button>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-12 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-sm text-muted-foreground">Scroll to explore</span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </section>
  );
}
