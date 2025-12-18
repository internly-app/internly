"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Medal } from "lucide-react";
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

  // Memoize card data to prevent unnecessary re-renders
  const cardData = useMemo(() => {
    if (reviews.length === 0) return { left: null, center: null, right: null };
    
    if (reviews.length >= 3) {
      return {
        left: reviews[0],   // 2nd most liked
        center: reviews[1], // Most liked
        right: reviews[2],  // 3rd most liked
      };
    }
    
    if (reviews.length === 2) {
      return {
        left: reviews[0],   // 2nd most liked
        center: reviews[1], // Most liked
        right: null,
      };
    }
    
    return {
      left: null,
      center: reviews[0], // Only review
      right: null,
    };
  }, [reviews]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuroraBackground className="min-h-screen">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-16 md:pb-24">
        {/* Hero Title - Fade from top */}
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-center mb-6 md:mb-8"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          <div className="h-[1.2em] overflow-visible">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentWordIndex}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-foreground inline-block leading-normal"
              >
                {ROTATING_WORDS[currentWordIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="block">from real interns</span>
        </motion.h1>

        {/* Subtitle - Normal fade */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="text-base sm:text-lg md:text-xl text-center text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-12"
        >
          Discover what it&apos;s really like to intern at top companies. Read authentic reviews from students who&apos;ve been there.
        </motion.p>

        {/* CTA Buttons - Normal fade */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16 md:mb-20 lg:mb-24"
        >
          <Button asChild size="lg" variant="outline" className="gap-2 group">
            <Link href="/reviews">
              Explore Reviews
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="lg" className="gap-2 group">
            <Link href="/write-review">
              Share Your Experience
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>

        {/* Review Cards Section - Fade from bottom */}
        {reviews.length > 0 && (
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
              className="flex flex-col sm:flex-row justify-center items-center sm:items-end gap-4 sm:gap-5 lg:gap-8"
            >
              {/* Left Card - 2nd Place (Silver) */}
              {cardData.left && (
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="z-10 relative w-full sm:w-auto"
                  style={{
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                >
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 8px rgba(156, 163, 175, 0.15), 0 0 16px rgba(156, 163, 175, 0.08)",
                        "0 0 12px rgba(156, 163, 175, 0.2), 0 0 24px rgba(156, 163, 175, 0.12)",
                        "0 0 8px rgba(156, 163, 175, 0.15), 0 0 16px rgba(156, 163, 175, 0.08)",
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1],
                    }}
                    className="opacity-90 rounded-xl overflow-hidden w-full max-w-[320px] sm:max-w-[340px] lg:max-w-[380px] border-2 border-gray-400/40 relative"
                    style={{
                      transform: "scale(0.98) rotate(-2deg) translateZ(0)",
                      filter: "blur(0.2px)",
                      backfaceVisibility: "hidden",
                      height: "220px",
                      willChange: "transform, box-shadow",
                    }}
                  >
                    {/* Silver Shine Effect - GPU optimized */}
                    <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden z-10" style={{ willChange: "transform" }}>
                      <div 
                        className="absolute w-full h-full bg-gradient-to-r from-transparent via-white/26 to-transparent"
                        style={{
                          width: "300%",
                          height: "300%",
                          animation: "shine 5s ease-in-out 1.7s infinite",
                          transformOrigin: "center",
                          willChange: "transform",
                        }}
                      />
                    </div>
                    <div className="w-full h-full pointer-events-none relative z-0 overflow-hidden">
                      <ReviewCard review={cardData.left} compact={true} />
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Center Card - 1st Place (Gold) */}
              {cardData.center && (
                <motion.div
                  animate={{
                    y: [-20, -35, -20],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                  className="z-20 relative -mt-0 sm:-mt-10 lg:-mt-16 w-full sm:w-auto"
                  style={{
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    perspective: 1000,
                    transform: "translateZ(0)",
                  }}
                >
                  {/* Gold Badge - Modern Design */}
                  <div className="absolute top-0 right-0 z-30 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 rounded-lg w-10 h-10 flex items-center justify-center shadow-xl border border-yellow-300/50 translate-x-1/2 -translate-y-1/2">
                    <Trophy className="size-5 fill-current" />
                  </div>
                  
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 10px rgba(234, 179, 8, 0.2), 0 0 20px rgba(234, 179, 8, 0.1)",
                        "0 0 16px rgba(234, 179, 8, 0.3), 0 0 32px rgba(234, 179, 8, 0.15)",
                        "0 0 10px rgba(234, 179, 8, 0.2), 0 0 20px rgba(234, 179, 8, 0.1)",
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1],
                    }}
                    className="rounded-xl overflow-hidden w-full max-w-[340px] sm:max-w-[380px] md:max-w-[420px] lg:max-w-[440px] border-2 border-yellow-400/50 relative"
                    style={{
                      transform: "scale(1.05) translateZ(0)",
                      backfaceVisibility: "hidden",
                      WebkitFontSmoothing: "antialiased",
                      height: "240px",
                      willChange: "transform, box-shadow",
                    }}
                  >
                    {/* Gold Shine Effect - GPU optimized */}
                    <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden z-10" style={{ willChange: "transform" }}>
                      <div 
                        className="absolute w-full h-full bg-gradient-to-r from-transparent via-yellow-300/28 to-transparent"
                        style={{
                          width: "300%",
                          height: "300%",
                          animation: "shine 5s ease-in-out 0s infinite",
                          transformOrigin: "center",
                          willChange: "transform",
                        }}
                      />
                    </div>
                    <div className="w-full h-full pointer-events-none relative z-0 overflow-hidden">
                      <ReviewCard review={cardData.center} compact={true} />
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Right Card - 3rd Place (Bronze) */}
              {cardData.right && (
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="z-10 relative w-full sm:w-auto"
                  style={{
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                  }}
                >
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 8px rgba(217, 119, 6, 0.15), 0 0 16px rgba(217, 119, 6, 0.08)",
                        "0 0 12px rgba(217, 119, 6, 0.2), 0 0 24px rgba(217, 119, 6, 0.12)",
                        "0 0 8px rgba(217, 119, 6, 0.15), 0 0 16px rgba(217, 119, 6, 0.08)",
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1],
                    }}
                    className="opacity-90 rounded-xl overflow-hidden w-full max-w-[320px] sm:max-w-[340px] lg:max-w-[380px] border-2 border-amber-600/40 relative"
                    style={{
                      transform: "scale(0.98) rotate(2deg) translateZ(0)",
                      filter: "blur(0.2px)",
                      backfaceVisibility: "hidden",
                      height: "220px",
                      willChange: "transform, box-shadow",
                    }}
                  >
                    {/* Bronze Shine Effect - GPU optimized */}
                    <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden z-10" style={{ willChange: "transform" }}>
                      <div 
                        className="absolute w-full h-full bg-gradient-to-r from-transparent via-amber-400/26 to-transparent"
                        style={{
                          width: "300%",
                          height: "300%",
                          animation: "shine 5s ease-in-out 3.4s infinite",
                          transformOrigin: "center",
                          willChange: "transform",
                        }}
                      />
                    </div>
                    <div className="w-full h-full pointer-events-none relative z-0 overflow-hidden">
                      <ReviewCard review={cardData.right} compact={true} />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>

            {/* Visual hint that cards continue below */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 1, delay: 1.2 }}
              className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"
            />
          </div>
        )}
      </div>
    </AuroraBackground>
  );
}