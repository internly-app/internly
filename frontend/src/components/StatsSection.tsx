"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { motion } from "framer-motion";

interface StatsSectionProps {
  totalReviews: number;
  totalCompanies: number;
  mostReviewedCount: number;
}

export function StatsSection({ totalReviews, totalCompanies, mostReviewedCount }: StatsSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [currentAnimatingIndex, setCurrentAnimatingIndex] = useState(-1);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
      // Start animating the first stat immediately
      setCurrentAnimatingIndex(0);
    }
  }, [isInView, hasAnimated]);

  const stats = [
    { value: totalReviews, label: "Reviews", delay: 0 },
    { value: totalCompanies, label: "Companies", delay: 0.1 },
    { value: 100, label: "Student Written", suffix: "%", delay: 0.2 },
  ];

  return (
    <section className="py-16 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.5,
                delay: stat.delay,
                ease: "easeOut",
              }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold mb-2 text-primary">
                {hasAnimated && currentAnimatingIndex >= index ? (
                  <CountUpAnimation 
                    target={stat.value} 
                    suffix={stat.suffix}
                    onComplete={() => {
                      // Start next animation when current completes
                      if (index < stats.length - 1) {
                        setTimeout(() => {
                          setCurrentAnimatingIndex(index + 1);
                        }, 100);
                      }
                    }}
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
  onComplete 
}: { 
  target: number; 
  suffix?: string;
  onComplete?: () => void;
}) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      if (onComplete && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
      return;
    }

    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();
    startTimeRef.current = startTime;
    hasCompletedRef.current = false;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(target * easedProgress);

      setCount(currentCount);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
        startTimeRef.current = null;
        if (onComplete && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      startTimeRef.current = null;
    };
  }, [target, onComplete]);

  return (
    <>
      {count.toLocaleString()}
      {suffix}
    </>
  );
}
