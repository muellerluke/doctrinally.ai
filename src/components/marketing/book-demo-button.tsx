"use client";

import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { getCalApi } from "@calcom/embed-react";
import { Button } from "@/components/ui/button";

// Cal.com embed — all demos are with Luke (luke@doctrinally.ai).
// Namespaced so multiple cal links can coexist on the same page without
// colliding; the namespace must match the `data-cal-namespace` attr below.
const CAL_NAMESPACE = "doctrinally.ai-booking";
const CAL_LINK = "luke-mueller-ohorfe/doctrinally.ai-booking";

// Query param we stamp onto the current doctrinally.ai URL when the user
// clicks the button. The Meta Pixel auto-fires a `PageView` on history
// changes, so this exposes a URL signature Meta Ads Manager can target
// with a custom conversion rule (e.g. "URL contains demo_click").
const TRACKING_PARAM = "demo_click";

export function BookDemoButton() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE });
      cal("ui", {
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  function handleClick() {
    if (typeof window === "undefined") return;
    // Silently append ?demo_click=1 to the current URL (preserving any
    // existing params) so Meta Pixel records a new PageView. Using
    // replaceState avoids polluting browser history — the user can still
    // hit back to leave the page exactly as they expect.
    const url = new URL(window.location.href);
    if (!url.searchParams.has(TRACKING_PARAM)) {
      url.searchParams.set(TRACKING_PARAM, "1");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="h-12 px-5 text-[0.95rem]"
      data-cal-namespace={CAL_NAMESPACE}
      data-cal-link={CAL_LINK}
      data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
      onClick={handleClick}
    >
      <MessageSquare className="h-4 w-4" />
      Book a demo
    </Button>
  );
}
