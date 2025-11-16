"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useRef, useEffect } from "react";

export function UserProfileDisplay() {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  // Get user display name
  // For Google OAuth: use user_metadata.full_name or user_metadata.name
  // For email/password: use email username part
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const email = user.email || "";

  // Get initials for avatar
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-white">{displayName}</p>
          <p className="text-xs text-gray-400 truncate max-w-[150px]">
            {email}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-20">
          <div className="p-4 border-b border-gray-800">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
          <div className="p-2">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                signOut();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
