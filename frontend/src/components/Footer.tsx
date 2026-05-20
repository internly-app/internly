"use client";

import Link from "next/link";
import { Linkedin, Instagram, Laptop } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-10 px-4 sm:px-6 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* Top: logo + page nav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-75 transition-opacity w-fit"
            aria-label="Internly homepage"
          >
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M20,4 H80 Q96,4 96,20 V56 Q96,72 80,72 H60 L50,96 L40,72 H20 Q4,72 4,56 V20 Q4,4 20,4 Z" fill="white"/>
              <path d="M50,17 L55,33 L71,38 L55,43 L50,59 L45,43 L29,38 L45,33 Z" fill="black"/>
            </svg>
            <span className="text-base font-normal" style={{ fontFamily: "var(--font-instrument-serif)" }}>
              Internly
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer navigation">
            {[
              { label: "About", href: "/about" },
              { label: "Reviews", href: "/reviews" },
              { label: "Companies", href: "/companies" },
              { label: "Resume ATS", href: "/ats" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom: socials + copyright */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-6 border-t border-border">

          {/* Social icons */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Tejas */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tejas</span>
              {[
                { href: "https://tejasthind.com", label: "Tejas' Website", icon: <Laptop className="size-4" /> },
                { href: "https://linkedin.com/in/tejas-thind", label: "Tejas LinkedIn", icon: <Linkedin className="size-4" /> },
                { href: "https://instagram.com/tejastnd", label: "Tejas Instagram", icon: <Instagram className="size-4" /> },
                {
                  href: "https://twitter.com/tejasthind4", label: "Tejas X",
                  icon: (
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ),
                },
              ].map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-zinc-500 hover:bg-zinc-800 transition-all duration-200"
                  aria-label={label}
                >
                  {icon}
                </Link>
              ))}
            </div>

            <div className="w-px h-5 bg-border" />

            {/* Srinikesh */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Srinikesh</span>
              {[
                { href: "https://linkedin.com/in/srinikesh-singarapu", label: "Srinikesh LinkedIn", icon: <Linkedin className="size-4" /> },
                {
                  href: "https://twitter.com/SingarapuSrini", label: "Srinikesh X",
                  icon: (
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ),
                },
              ].map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-zinc-500 hover:bg-zinc-800 transition-all duration-200"
                  aria-label={label}
                >
                  {icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Copyright + contact */}
          <div className="flex flex-col sm:items-end gap-1 text-sm text-muted-foreground">
            <span>© 2025 Tejas Thind &amp; Srinikesh Singarapu</span>
            <span>
              Bug or request?{" "}
              <a
                href="mailto:tejas.st0544@gmail.com"
                className="text-foreground hover:opacity-75 transition-opacity underline underline-offset-2 cursor-pointer"
              >
                Contact us
              </a>
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
}
