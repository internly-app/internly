"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ArrowRight } from "lucide-react";

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
    <AuroraBackground className="pt-24 pb-12">
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
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
            className="w-full sm:w-auto gap-2 group"
          >
            <Link href="/reviews">
              Explore Reviews
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link href="/write-review">Share Your Experience</Link>
          </Button>
        </div>
      </div>
    </AuroraBackground>
  );
}
