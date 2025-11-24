"use client";

import React from "react";
import { cn } from "@/lib/utils";

export const BackgroundGradient = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    containerClassName?: string;
    animate?: boolean;
  }
>(({ className, containerClassName, animate = true, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative group overflow-hidden rounded-xl",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0 z-0 bg-gradient-to-r from-[#522081] via-[#7c3aed] to-[#8b5cf6] opacity-0 group-hover:opacity-100 blur-xl transition duration-1000 group-hover:duration-200",
          animate && "animate-gradient-shift"
        )}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
});

BackgroundGradient.displayName = "BackgroundGradient";

