"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// GA4 measurement ID. Keep in sync with the gtag config in src/app/layout.tsx.
const GA4_MEASUREMENT_ID = "G-4PJMBW2762";

function GtagPageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    const url = `${window.location.origin}${path}`;

    // Tell GA4 about the new virtual page load. This mirrors what the initial
    // gtag('config', ...) call does automatically on first HTML load — we just
    // have to do it manually for client-side route changes.
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: url,
      page_title: document.title,
      send_to: GA4_MEASUREMENT_ID,
    });

    // Meta Pixel also needs a nudge on SPA navigation.
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

  return null;
}

export function GtagPageView() {
  // useSearchParams() needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <GtagPageViewInner />
    </Suspense>
  );
}
