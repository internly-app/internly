"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-sm border-b"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          Internly
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#reviews"
            className="text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
          >
            Reviews
          </Link>
          <Link
            href="#companies"
            className="text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
          >
            Companies
          </Link>
          <Link
            href="#about"
            className="text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
          >
            About
          </Link>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            asChild
            className="hidden sm:inline-flex text-sm font-medium"
          >
            <Link href="/signin">Sign In</Link>
          </Button>
          <Button
            asChild
            className="text-sm font-medium rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            <Link href="/signin?redirect=review">Write Review</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
