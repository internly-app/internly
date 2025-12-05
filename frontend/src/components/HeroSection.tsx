"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
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

const mockReviews: ReviewWithDetails[] = [
  {
    id: "1",
    company: {
      id: "microsoft",
      name: "Microsoft",
      logo_url: null,
      website: "https://google.com",
      industry: "Technology",
      size: "10000+",
      description: "Leading technology company",
      founded_year: 1998,
      headquarters: "Mountain View, CA"
    },
    role: {
      id: "pm-intern",
      title: "Product Manager Intern",
      category: "Software Engineering"
    },
    user: {
      id: "user1",
      full_name: "Sarah Chen",
      email: "sarah@example.com"
    },
    term: "Summer 2024",
    location: "Mountain View, CA",
    work_style: "hybrid" as const,
    work_hours: "full-time" as const,
    duration_months: 3,
    team_name: "Cloud Infrastructure",
    best: "The mentorship and learning opportunities were unparalleled. Access to cutting-edge technology and the ability to work on projects with global impact.",
    hardest: "The pace was intense and the codebase was massive. It took time to understand the complex systems and development workflows.",
    advice: "Come prepared to learn quickly and don't be afraid to ask questions. Take advantage of all the learning resources and networking opportunities.",
    interview_round_count: 3,
    interview_rounds_description: "Phone screen, two technical interviews, and team matching",
    interview_tips: "Practice data structures and algorithms. Be ready to think out loud and explain your approach clearly.",
    wage_hourly: 58,
    wage_currency: "USD",
    housing_provided: true,
    housing_stipend: 7000,
    perks: "Free meals, gym, transportation, wellness programs",
    technologies: "Go, Python, Kubernetes, GCP, React",
    like_count: 42,
    user_has_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    company: {
      id: "ramp",
      name: "Ramp",
      logo_url: null,
      website: "https://ramp.com",
      industry: "Fintech",
      size: "500-1000",
      description: "Corporate card and expense management platform",
      founded_year: 2019,
      headquarters: "New York, NY"
    },
    role: {
      id: "swe-intern",
      title: "Software Engineering Intern",
      category: "Software Engineering"
    },
    user: {
      id: "user2",
      full_name: "Alex K.",
      email: "alex@example.com"
    },
    term: "Fall 2024",
    location: "New York, NY",
    work_style: "onsite" as const,
    work_hours: "full-time" as const,
    duration_months: 4,
    team_name: "Growth",
    best: "The level of responsibility and autonomy given to interns. I led a major feature from conception to launch.",
    hardest: "The fast pace and high expectations. You need to be self-directed and comfortable with ambiguity.",
    advice: "Be proactive and take ownership. The team respects initiative and you'll learn exponentially more by diving in.",
    interview_round_count: 4,
    interview_rounds_description: "Recruiter screen, PM case study, cross-functional interview, final round with leadership",
    interview_tips: "Prepare product case studies and be ready to think strategically about growth and user experience.",
    wage_hourly: 50,
    wage_currency: "USD",
    housing_provided: false,
    housing_stipend: 2500,
    perks: "Lunch stipend, learning budget, team events",
    technologies: "Figma, Amplitude, SQL, Python",
    like_count: 38,
    user_has_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "3",
    company: {
      id: "rootly",
      name: "Rootly",
      logo_url: null,
      website: "https://rootly.com",
      industry: "AI/SaaS",
      size: "50-100",
      description: "AI-powered incident management platform",
      founded_year: 2020,
      headquarters: "San Francisco, CA"
    },
    role: {
      id: "pe-intern",
      title: "Product Engineering Intern",
      category: "Product Engineering"
    },
    user: {
      id: "user3",
      full_name: "Jordan L.",
      email: "jordan@example.com"
    },
    term: "Fall 2025",
    location: "San Francisco, CA",
    work_style: "remote" as const,
    work_hours: "full-time" as const,
    duration_months: 3,
    team_name: "AI Research",
    best: "Direct access to founders and ability to shape the product. Working with state-of-the-art AI models and research.",
    hardest: "Less structured than bigger companies. Need to be comfortable with uncertainty and changing priorities.",
    advice: "Be ready to wear multiple hats and learn quickly. Great opportunity if you want to experience startup life.",
    interview_round_count: 3,
    interview_rounds_description: "Technical screen, ML system design, culture fit with founders",
    interview_tips: "Show passion for AI and incident management. Be ready to discuss ML system design and practical applications.",
    wage_hourly: 45,
    wage_currency: "USD",
    housing_provided: false,
    perks: "Flexible hours, conference budget, equity",
    technologies: "Python, TensorFlow, AWS, Docker, PostgreSQL",
    like_count: 31,
    user_has_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function HeroSection() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuroraBackground className="min-h-screen">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 md:pt-48 pb-20">
        {/* Hero Title - Fade from top */}
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-center mb-6 md:mb-8"
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
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            className="flex justify-center items-end gap-4 lg:gap-0"
          >
            {/* Left Card - Google */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="hidden lg:block -mr-20 z-10"
              style={{
                willChange: "transform",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
            >
              <div 
                className="opacity-80 rounded-xl"
                style={{
                  transform: "scale(0.9) rotate(-4deg) translateZ(0)",
                  filter: "blur(0.5px)",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="w-[400px] h-[280px] pointer-events-none overflow-hidden rounded-xl">
                  <ReviewCard review={mockReviews[0]} compact={true} />
                </div>
              </div>
            </motion.div>

            {/* Center Card - Ramp (Larger and in front) */}
            <motion.div
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="z-20"
              style={{
                willChange: "transform",
                backfaceVisibility: "hidden",
                perspective: 1000,
                transform: "translateZ(0)",
              }}
            >
              <div 
                className="shadow-2xl rounded-xl"
                style={{
                  transform: "scale(1.05) translateZ(0)",
                  backfaceVisibility: "hidden",
                  WebkitFontSmoothing: "antialiased",
                }}
              >
                <div className="w-[400px] md:w-[420px] h-[280px] md:h-[300px] pointer-events-none overflow-hidden rounded-xl">
                  <ReviewCard review={mockReviews[1]} compact={true} />
                </div>
              </div>
            </motion.div>

            {/* Right Card - Rootly AI */}
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
              className="hidden lg:block -ml-20 z-10"
              style={{
                willChange: "transform",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
            >
              <div 
                className="opacity-80 rounded-xl"
                style={{
                  transform: "scale(0.9) rotate(4deg) translateZ(0)",
                  filter: "blur(0.5px)",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="w-[400px] h-[280px] pointer-events-none overflow-hidden rounded-xl">
                  <ReviewCard review={mockReviews[2]} compact={true} />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual hint that cards continue below */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none"
          />

        </div>
        
        {/* Scroll indicator - positioned at bottom of viewport */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
}