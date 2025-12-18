"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();

  // Ensure we're mounted before rendering portal (SSR safety)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

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
      animate={
        animate
          ? { y: 0, opacity: 1 }
          : undefined
      }
      transition={
        animate
          ? {
              duration: 1.6,
              ease: [0.4, 0, 0.2, 1],
              delay: 0,
            }
          : undefined
      }
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isScrolled
          ? "bg-background/95 backdrop-blur-sm"
          : "bg-transparent"
      } ${
        isMobileMenuOpen
          ? "md:translate-y-0 md:opacity-100 -translate-y-full opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <div className="max-w-[100rem] mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 w-full">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Logo - Left Side */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity duration-200 flex-shrink-0 cursor-pointer"
            aria-label="Internly - Go to homepage"
          >
            Internly
          </Link>

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-foreground hover:bg-muted transition-colors duration-200 flex-shrink-0 relative w-10 h-10 flex items-center justify-center cursor-pointer"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            <motion.div
              initial={false}
              animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute"
            >
              {isMobileMenuOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </motion.div>
          </button>

          {/* Desktop Navigation Links - Center (Absolute positioning for true center) */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            <Link
              href="/about"
              className="text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white cursor-pointer"
            >
              About Us
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/reviews"
              className="text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white cursor-pointer"
            >
              Reviews
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/companies"
              className="text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white cursor-pointer"
            >
              Companies
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* Right Side - Write Review, Profile (Desktop Only) */}
          <div className="hidden md:flex items-center gap-3 ml-auto flex-shrink-0 min-w-0">
            {/* Show skeleton while auth is loading to prevent flash */}
            {authLoading ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
                <div className="h-9 w-24 rounded-full bg-muted animate-pulse" />
              </div>
            ) : user ? (
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
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors duration-200 cursor-pointer !outline-none border border-transparent hover:border-zinc-700 data-[state=open]:border-zinc-700 flex-shrink-0"
                      aria-label={`User menu for ${userName.full}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0" aria-hidden="true">
                        {userName.initials}
                      </div>
                      <span className="text-sm font-medium text-foreground">
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
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-56 border border-zinc-700">
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
                  className="text-sm font-medium"
                >
                  <Link href="/signin">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Side Navigation Menu - Rendered via portal to avoid clipping */}
      {isMounted && createPortal(
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-[100] md:hidden"
                onClick={closeMobileMenu}
              />
              
              {/* Side Menu - Opens from Right */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                className="fixed top-0 right-0 bottom-0 w-64 bg-background border-l border-zinc-800 z-[101] md:hidden overflow-y-auto"
              >
              <div className="flex flex-col h-full">
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <span className="text-xl font-semibold text-foreground">Internly</span>
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 rounded-md text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-4 space-y-1">
                  <Link
                    href="/about"
                    onClick={closeMobileMenu}
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white hover:bg-muted cursor-pointer"
                  >
                    <span className="relative">About Us</span>
                    <span className="absolute bottom-2 left-4 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                  </Link>
                  <Link
                    href="/reviews"
                    onClick={closeMobileMenu}
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white hover:bg-muted cursor-pointer"
                  >
                    <span className="relative">Reviews</span>
                    <span className="absolute bottom-2 left-4 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                  </Link>
                  <Link
                    href="/companies"
                    onClick={closeMobileMenu}
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground relative group transition-colors duration-200 hover:text-white hover:bg-muted cursor-pointer"
                  >
                    <span className="relative">Companies</span>
                    <span className="absolute bottom-2 left-4 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-[calc(100%-2rem)]"></span>
                  </Link>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-zinc-800 space-y-3">
                  {authLoading ? (
                    <div className="space-y-2">
                      <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                      <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
                    </div>
                  ) : user ? (
                    <>
                      <Button
                        asChild
                        className="w-full gap-2 group"
                        onClick={closeMobileMenu}
                      >
                        <Link href="/write-review">
                          Write a Review
                          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      </Button>
                      <Link
                        href="/profile"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:text-white hover:bg-muted transition-colors duration-200 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">
                          {userName.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{userName.full}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          closeMobileMenu();
                        }}
                        className="w-full px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
                      >
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
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Button
                        asChild
                        className="w-full gap-2 group"
                        onClick={closeMobileMenu}
                      >
                        <Link href="/signin?redirect=/write-review">
                          Write Review
                          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="w-full"
                        onClick={closeMobileMenu}
                      >
                        <Link href="/signin">Sign In</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </motion.nav>
  );
}
