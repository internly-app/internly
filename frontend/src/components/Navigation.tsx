"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Left Side */}
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-foreground hover:opacity-80 transition-all duration-200 active:scale-95"
          >
            Internly
          </Link>

          {/* Desktop Navigation Links - Center (Absolute positioning for true center) */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            <Link
              href="#reviews"
              className="text-sm font-medium text-foreground hover:text-[#7748F6] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Reviews
            </Link>
            <Link
              href="#companies"
              className="text-sm font-medium text-foreground hover:text-[#7748F6] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Companies
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium text-foreground hover:text-[#7748F6] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              About
            </Link>
          </div>

          {/* Right Side - Theme Toggle, Write Review, Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Theme Toggle */}
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full hover:bg-muted transition-all duration-200 active:scale-90"
                  >
                    {theme === "light" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2" />
                        <path d="M12 20v2" />
                        <path d="m4.93 4.93 1.41 1.41" />
                        <path d="m17.66 17.66 1.41 1.41" />
                        <path d="M2 12h2" />
                        <path d="M20 12h2" />
                        <path d="m6.34 17.66-1.41 1.41" />
                        <path d="m19.07 4.93-1.41 1.41" />
                      </svg>
                    )}
                  </Button>
                )}

                {/* Write Review Button */}
                <Button
                  asChild
                  className="text-sm font-medium rounded-full bg-[#7748F6] text-white hover:bg-[#6636E5] transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                >
                  <Link href="/write-review">Write Review</Link>
                </Button>

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-[#7748F6] flex items-center justify-center text-white text-xs font-semibold">
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
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{userName.full}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
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
                {/* Theme Toggle for non-authenticated users */}
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full hover:bg-muted transition-all duration-200 active:scale-90"
                  >
                    {theme === "light" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2" />
                        <path d="M12 20v2" />
                        <path d="m4.93 4.93 1.41 1.41" />
                        <path d="m17.66 17.66 1.41 1.41" />
                        <path d="M2 12h2" />
                        <path d="M20 12h2" />
                        <path d="m6.34 17.66-1.41 1.41" />
                        <path d="m19.07 4.93-1.41 1.41" />
                      </svg>
                    )}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  asChild
                  className="hidden sm:inline-flex text-sm font-medium hover:bg-muted transition-all duration-200 active:scale-95"
                >
                  <Link href="/signin">Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="text-sm font-medium rounded-full bg-[#7748F6] text-white hover:bg-[#6636E5] transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                >
                  <Link href="/signin?redirect=review">Write Review</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
