"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import ReviewCard from "@/components/ReviewCard";
import type { ReviewWithDetails } from "@/lib/types/database";

const ROTATING_WORDS = [
  "Real experiences",
  "Honest reviews",
  "Student insights",
  "Career guidance",
];

interface HeroSectionProps {
  reviews: ReviewWithDetails[];
}

export default function HeroSection({ reviews }: HeroSectionProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const cardData = useMemo(() => {
    if (reviews.length === 0) return { left: null, center: null, right: null };
    if (reviews.length >= 3) return { left: reviews[0], center: reviews[1], right: reviews[2] };
    if (reviews.length === 2) return { left: reviews[0], center: reviews[1], right: null };
    return { left: null, center: reviews[0], right: null };
  }, [reviews]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuroraBackground className="min-h-[100dvh]">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-16 md:pb-24">
        {/* Two-column layout on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16">

          {/* LEFT COLUMN — Content */}
          <div className="flex flex-col items-start lg:flex-1 lg:max-w-[52%]">

            {/* Feature pill */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="mb-6"
            >
              <Link
                href="/ats"
                className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-colors duration-300 group cursor-pointer"
              >
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] uppercase font-bold tracking-wider">
                  Recruiter Approved
                </span>
                <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground">
                  Check your resume ATS score
                </span>
                <ArrowRight className="size-3 text-muted-foreground group-hover:text-foreground transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Hero heading */}
            <motion.h1
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-normal mb-5 md:mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {/* Rotating word — slot-machine direction: exits up, enters from below */}
              <div className="h-[1.4em] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -32 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="text-foreground block leading-tight"
                  >
                    {ROTATING_WORDS[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="block leading-tight">from real interns</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
              className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8 md:mb-10 leading-relaxed"
            >
              Discover what it&apos;s really like to intern at top companies. Read
              authentic reviews from students who&apos;ve been there.
            </motion.p>

            {/* CTAs — primary action first */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
            >
              <Button asChild size="lg" className="gap-2 group">
                <Link href="/write-review">
                  Share Your Experience
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 group">
                <Link href="/reviews">
                  Explore Reviews
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* RIGHT COLUMN — Floating review cards (desktop only) */}
          {reviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
              className="hidden lg:flex lg:flex-1 lg:relative lg:items-center lg:justify-end mt-12 lg:mt-0"
            >
              <div className="relative w-full max-w-[640px] h-[450px]">

                {/* Bronze — furthest back, bottom-left, smallest */}
                {cardData.right && (
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                    className="absolute left-0 top-[210px] w-[340px]"
                    style={{ transform: "rotate(2.5deg)", zIndex: 0, willChange: "transform" }}
                  >
                    <div className="absolute top-0 right-0 z-30 bg-gradient-to-br from-amber-600 via-orange-700 to-amber-800 text-amber-100 rounded-lg w-9 h-9 flex items-center justify-center shadow-xl border border-amber-500/40 translate-x-1/3 -translate-y-1/3">
                      <Trophy className="size-4 fill-current" />
                    </div>
                    <div className="relative">
                      <motion.div
                        animate={{ opacity: [0.25, 0.45, 0.25] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700"
                      />
                      <div className="relative rounded-xl overflow-hidden bg-card opacity-75" style={{ height: "210px" }}>
                        <div className="w-full h-full pointer-events-none overflow-hidden">
                          <ReviewCard review={cardData.right} compact={true} forceTruncate={true} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Silver — middle, left-offset so its logo+name peek out from behind gold */}
                {cardData.left && (
                  <motion.div
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                    className="absolute left-[45px] top-[90px] w-[370px]"
                    style={{ transform: "rotate(-1.5deg)", zIndex: 1, willChange: "transform" }}
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ opacity: [0.35, 0.6, 0.35] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-zinc-400 via-zinc-300 to-zinc-400"
                      />
                      <div className="relative rounded-xl overflow-hidden bg-card opacity-90" style={{ height: "225px" }}>
                        <div className="w-full h-full pointer-events-none overflow-hidden">
                          <ReviewCard review={cardData.left} compact={true} forceTruncate={true} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Gold — front, top-right, largest, fully readable */}
                {cardData.center && (
                  <motion.div
                    animate={{ y: [0, -9, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="absolute right-0 top-0 w-[390px]"
                    style={{ zIndex: 2, willChange: "transform" }}
                  >
                    <div className="absolute top-0 right-0 z-30 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 rounded-lg w-9 h-9 flex items-center justify-center shadow-xl border border-yellow-300/50 translate-x-1/3 -translate-y-1/3">
                      <Trophy className="size-4 fill-current" />
                    </div>
                    <div className="relative">
                      <motion.div
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"
                      />
                      <div className="relative rounded-xl overflow-hidden bg-card" style={{ height: "245px" }}>
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden z-10">
                          <div
                            className="absolute w-full h-full bg-gradient-to-r from-transparent via-yellow-300/20 to-transparent"
                            style={{
                              width: "300%", height: "300%",
                              animation: "shine 5s ease-in-out 0s infinite",
                              transform: "translateX(-200%) translateY(-200%) rotate(45deg)",
                              opacity: 0, willChange: "transform",
                            }}
                          />
                        </div>
                        <div className="w-full h-full pointer-events-none overflow-hidden">
                          <ReviewCard review={cardData.center} compact={true} forceTruncate={true} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>
            </motion.div>
          )}
        </div>

        {/* Mobile: single card below content */}
        {reviews.length > 0 && cardData.center && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            className="lg:hidden mt-12 w-full max-w-[380px] mx-auto"
          >
            <div className="relative">
              <motion.div
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"
              />
              <div className="absolute top-0 right-0 z-30 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 rounded-lg w-8 h-8 flex items-center justify-center shadow-xl border border-yellow-300/50 translate-x-1/3 -translate-y-1/3">
                <Trophy className="size-3.5 fill-current" />
              </div>
              <div className="relative rounded-xl overflow-hidden bg-card" style={{ height: "220px" }}>
                <div className="w-full h-full pointer-events-none overflow-hidden">
                  <ReviewCard review={cardData.center} compact={true} forceTruncate={true} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AuroraBackground>
  );
}
