"use client";

import { useState, useEffect, useRef } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 1000, suffix: "+", label: "Student Reviews" },
  { value: 500, suffix: "+", label: "Companies Reviewed" },
  { value: 100, suffix: "%", label: "Verified Students" },
  { value: 50, suffix: "+", label: "Universities" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 px-6 bg-foreground transition-colors duration-300"
    >
      <div className="max-w-[100rem] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat, index) => (
            <div
              key={index}
              className="text-center transition-all duration-700"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(30px)",
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <div className="text-5xl md:text-6xl font-semibold mb-2 text-background">
                {isVisible ? (
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                ) : (
                  "0"
                )}
              </div>
              <div className="text-sm md:text-base text-background/70">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
