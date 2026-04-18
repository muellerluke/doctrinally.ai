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

  return (
    <Button
      size="lg"
      variant="outline"
      className="h-12 px-5 text-[0.95rem]"
      data-cal-namespace={CAL_NAMESPACE}
      data-cal-link={CAL_LINK}
      data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
    >
      <MessageSquare className="h-4 w-4" />
      Book a demo
    </Button>
  );
}
