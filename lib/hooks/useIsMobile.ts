"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the current viewport is mobile (< 768px)
 * Returns false on server-side for SSR compatibility
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === "undefined") {
      return;
    }

    // Function to check if current width is mobile
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    checkIsMobile();

    // Listen for resize events
    window.addEventListener("resize", checkIsMobile);

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  return isMobile;
}


