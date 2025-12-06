"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/AuthProvider";

interface NavigationProps {
  animate?: boolean; // Only animate on landing page
}

export default function Navigation({ animate = false }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Get user's display name
  const getUserDisplayName = () => {
    if (!user) return { full: "User", initials: "U" };

    // Try to get name from user metadata
    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;
    const fullName = user.user_metadata?.full_name;

    let displayName = "";
    let initials = "";

    if (firstName && lastName) {
      displayName = `${firstName} ${lastName}`;
      initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (fullName) {
      displayName = fullName;
      const parts = fullName.split(" ");
      initials = parts.length > 1
        ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
        : fullName.substring(0, 2).toUpperCase();
    } else if (firstName) {
      displayName = firstName;
      initials = firstName.substring(0, 2).toUpperCase();
    } else if (user.email) {
      // Fallback to email - format it nicely
      const emailName = user.email.split('@')[0];
      const parts = emailName.split('.');
      if (parts.length > 1) {
        // "srinikesh.singarapu" -> "Srinikesh Singarapu"
        displayName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        initials = `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      } else {
        displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        initials = emailName.substring(0, 2).toUpperCase();
      }
    } else {
      displayName = "User";
      initials = "U";
    }

    return { full: displayName, initials };
  };

  const userName = getUserDisplayName();

  return (
    <motion.nav
      initial={animate ? { y: -100, opacity: 0 } : false}
      animate={animate ? { y: 0, opacity: 1 } : undefined}
      transition={animate ? {
        duration: 1.6,
        ease: [0.4, 0, 0.2, 1],
        delay: 0,
      } : undefined}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[100rem] mx-auto px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Left Side */}
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity duration-200 mr-8"
            aria-label="Internly - Go to homepage"
          >
            Internly
          </Link>

          {/* Desktop Navigation Links - Center (Absolute positioning for true center) */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            <Link
              href="/about"
              className="text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white"
            >
              About Us
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/reviews"
              className="text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white"
            >
              Reviews
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/companies"
              className="text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white"
            >
              Companies
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* Right Side - Write Review, Profile */}
          <div className="flex items-center gap-3 ml-auto">
            {user ? (
              <>
                {/* Write Review Button */}
                <Button
                  asChild
                  className="gap-2 group"
                >
                  <Link href="/write-review">
                    Write a Review
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors duration-200 cursor-pointer !outline-none border border-transparent hover:border-zinc-500 data-[state=open]:border-zinc-500"
                      aria-label={`User menu for ${userName.full}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold" aria-hidden="true">
                        {userName.initials}
                      </div>
                      <span className="text-sm font-medium text-foreground hidden sm:block">
                        {userName.full}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="hidden sm:block"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-56 border border-white/20">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userName.full}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer text-foreground focus:text-foreground focus:bg-white/10">
                      <Link href="/profile" className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        My Page
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  asChild
                  className="gap-2 group"
                >
                  <Link href="/signin?redirect=/write-review">
                    Write Review
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="hidden sm:inline-flex text-sm font-medium"
                >
                  <Link href="/signin">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
