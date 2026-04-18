"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Resolve a CSS custom property (e.g. `--card`) to its computed color
 * string so Recharts (which needs a concrete color, not a CSS variable)
 * can consume it.
 *
 * Reactive to theme changes — re-reads the property whenever next-themes
 * flips `resolvedTheme`, so charts refresh their palette instead of
 * staying frozen on whichever theme was active at mount time.
 */
export function useResolvedColor(cssVar: string, fallback: string): string {
  const { resolvedTheme } = useTheme();
  const [resolved, setResolved] = useState(fallback);

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim();
    if (!raw) return;
    // Browsers normalize getComputedStyle output — an `oklch()` declaration
    // may come back as `lab(...)`, `color(...)`, etc. If it already looks
    // like a full CSS color (contains a paren or leading #), use as-is.
    // Only wrap if we got back a bare "0.58 0.12 25"-style tuple.
    const color =
      raw.includes("(") || raw.startsWith("#") ? raw : `oklch(${raw})`;
    setResolved(color);
  }, [cssVar, resolvedTheme]);

  return resolved;
}
