"use client";

import { useEffect } from "react";

export function RedirectToModal() {
  useEffect(() => {
    // Set flag in localStorage so home page knows to open modal
    localStorage.setItem("openReviewModal", "true");
  }, []);

  return null;
}
