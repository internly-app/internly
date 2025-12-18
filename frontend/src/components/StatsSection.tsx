"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";

interface StatsSectionProps {
  totalReviews: number;
  totalCompanies: number;
  totalLikes: number;
}

export function StatsSection({ totalReviews, totalCompanies, totalLikes }: StatsSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { value: totalReviews, label: "Reviews", delay: 0 },
    { value: totalCompanies, label: "Companies", delay: 0.1 },
    { value: totalLikes, label: "Total Likes", delay: 0.2 },
    { value: 100, label: "Student Written", suffix: "%", delay: 0.3 },
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.5,
                delay: stat.delay,
                ease: "easeOut",
              }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">
                {isInView ? (
                  <CountUpAnimation 
                    target={stat.value} 
                    suffix={stat.suffix}
                    startDelay={stat.delay}
                  />
                ) : (
                  "0"
                )}
              </div>
              <div className="text-sm md:text-base text-muted-foreground">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUpAnimation({ 
  target, 
  suffix, 
  startDelay = 0
}: { 
  target: number; 
  suffix?: string;
  startDelay?: number;
}) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (target === 0) {
      setCount(0);
      return;
    }

    // If reduced motion, show final value immediately
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    // Wait for startDelay before beginning animation
    const delayTimeout = setTimeout(() => {
      hasStartedRef.current = true;
      const duration = 1500; // Industry standard: 1.5 seconds
      const startTime = performance.now();
      startTimeRef.current = startTime;

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return;

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Industry standard: ease-out easing (starts fast, ends slow)
        // Using ease-out quadratic for smooth, natural feel
        const easedProgress = 1 - Math.pow(1 - progress, 2);
        const currentCount = Math.floor(target * easedProgress);

        setCount(currentCount);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCount(target);
          startTimeRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }, startDelay * 1000);

    return () => {
      clearTimeout(delayTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      startTimeRef.current = null;
      hasStartedRef.current = false;
    };
  }, [target, startDelay]);

  return (
    <>
      {count.toLocaleString()}
      {suffix}
    </>
  );
}
