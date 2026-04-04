"use client";

import { useEffect } from "react";

export function VisitorTracker({ churchId }: { churchId: string }) {
  useEffect(() => {
    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ churchId }),
    }).catch(() => {
      // Silent — visitor tracking is best-effort
    });
  }, [churchId]);

  return null;
}
