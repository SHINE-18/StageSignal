"use client";

import { useEffect } from "react";

/**
 * PWA Service Worker Registration
 * Runs exclusively in production and registers public/sw.js.
 */
export function PWARegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => {
            console.error("ServiceWorker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}

