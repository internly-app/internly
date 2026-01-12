"use client";

import Link from "next/link";
import { Linkedin, Instagram, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-6 px-4 sm:px-6 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          {/* Social icons with tooltip showing whose account it is */}
          <div className="flex gap-3">
            <div className="relative group">
              <Link
                href="https://tejasthind.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer"
                aria-label="Website"
              >
                <Globe className="size-4" />
              </Link>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-card px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Tejas
              </span>
            </div>
            <div className="relative group">
              <Link
                href="https://linkedin.com/in/tejas-thind" // Tejas LinkedIn
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-4" />
              </Link>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-card px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Tejas
              </span>
            </div>
            <div className="relative group">
              <Link
                href="https://instagram.com/tejastnd" // Tejas Instagram
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </Link>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-card px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Tejas
              </span>
            </div>
            <div className="relative group">
              <Link
                href="https://twitter.com/tejasthind4" // Tejas X
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer"
                aria-label="X (Twitter)"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-card px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Tejas
              </span>
            </div>
            <div className="w-px h-6 bg-border/50 self-center mx-1" />
            <div className="relative group">
              <Link
                href="https://linkedin.com/in/srinikesh-singarapu" // Srinikesh LinkedIn
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-4" />
              </Link>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-card px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Srinikesh
              </span>
            </div>
            <div className="relative group">
              <Link
                href="https://twitter.com/SingarapuSrini" // Srinikesh X
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 cursor-pointer"
                aria-label="X (Twitter)"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-card px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Srinikesh
              </span>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground font-medium text-center">
            © 2025 Built by Tejas Thind and Srinikesh Singarapu. All rights
            reserved.
          </div>

          {/* Contact */}
          <div className="text-sm text-muted-foreground text-center">
            Want to see a company added or noticed a bug?{" "}
            <a
              href="mailto:tejas.st0544@gmail.com"
              className="text-foreground hover:text-primary transition-colors underline underline-offset-2 cursor-pointer"
            >
              Contact us
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
