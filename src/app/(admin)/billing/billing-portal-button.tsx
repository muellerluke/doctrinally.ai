"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";
import { createBillingPortalSession } from "@/lib/actions/billing";

interface BillingPortalButtonProps {
  label?: string;
}

export function BillingPortalButton({
  label = "Manage billing",
}: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await createBillingPortalSession();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.url) {
        posthog.capture("billing_portal_opened");
        window.location.href = result.url;
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
