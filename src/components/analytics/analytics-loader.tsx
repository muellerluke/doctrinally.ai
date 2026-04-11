"use client";

import dynamic from "next/dynamic";

// `dynamic(..., { ssr: false })` is only legal inside a Client Component, so
// this tiny wrapper exists solely so the Server Component root layout has
// something it can import without triggering that rule.
//
// The effect is that every script in AnalyticsScripts is fetched and
// executed purely on the client, after React hydration — which fixes the
// class of gtag-isn't-firing bugs in the Next.js App Router.
const AnalyticsScripts = dynamic(
  () => import("./analytics-scripts").then((m) => m.AnalyticsScripts),
  { ssr: false }
);

export function AnalyticsLoader() {
  return <AnalyticsScripts />;
}
