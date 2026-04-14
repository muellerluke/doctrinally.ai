"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Globe, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/billing/plan-card";
import { churchInfoSchema } from "@/lib/validations/onboarding";
import { createChurch, resumeCheckout } from "@/lib/actions/onboarding";
import posthog from "posthog-js";
import { slugify } from "@/lib/utils";
import type { PlanType } from "@/lib/plans";

type InitialChurch = { name: string; slug: string } | null;

export function OnboardingClient({
  initialChurch,
}: {
  initialChurch: InitialChurch;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const hasExistingChurch = !!initialChurch;
  const [step, setStep] = useState<1 | 2>(hasExistingChurch ? 2 : 1);
  const [name, setName] = useState(initialChurch?.name ?? "");
  const [slug, setSlug] = useState(initialChurch?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("standard");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canceled) {
      toast.error("Checkout was canceled. Select a plan to try again.");
    }
  }, [canceled]);

  useEffect(() => {
    if (!slugEdited && name && !hasExistingChurch) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited, hasExistingChurch]);

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/--+/g, "-")
    );
  }

  function handleNextStep() {
    setErrors({});
    const parsed = churchInfoSchema.safeParse({ name, slug });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setStep(2);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      let result;

      if (hasExistingChurch) {
        result = await resumeCheckout(selectedPlan);
      } else {
        result = await createChurch({ name, slug, plan: selectedPlan });
      }

      if (result.error) {
        if (result.error.toLowerCase().includes("url")) {
          setErrors({ slug: result.error });
          setStep(1);
        } else {
          toast.error(result.error);
        }
        return;
      }

      if (!hasExistingChurch) {
        posthog.capture("church_created", {
          church_name: name,
          church_slug: slug,
        });
      }
      posthog.capture("checkout_started", {
        plan: selectedPlan,
        church_name: name,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {step === 1 && (
        <Card className="mx-auto max-w-sm animate-fade-up stagger-1 shadow-xl shadow-primary/[0.04]">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">
              Set up your church
            </CardTitle>
            <CardDescription>
              Create your church to get started with Doctrinally.AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Church name</Label>
                <Input
                  id="name"
                  placeholder="Grace Community Church"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Church URL</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="shrink-0">
                    <span className="font-medium text-foreground">
                      {slug || "yourchurch"}
                    </span>
                    .doctrinally.ai
                  </span>
                </div>
                <Input
                  id="slug"
                  placeholder="grace-community"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug}</p>
                )}
              </div>
              <Button className="w-full" onClick={handleNextStep}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="mx-auto animate-fade-up w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl">Choose your plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Both plans include a 14-day free trial. Cancel anytime.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanCard
              plan="standard"
              selected={selectedPlan === "standard"}
              onSelect={setSelectedPlan}
            />
            <PlanCard
              plan="enterprise"
              selected={selectedPlan === "enterprise"}
              onSelect={setSelectedPlan}
            />
          </div>

          <p className="rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-center text-xs text-muted-foreground">
            You won&apos;t be charged today. Your card will be charged $
            {selectedPlan === "standard" ? "49" : "99"} in 14 days unless you
            cancel. Trial includes 10 document uploads and 100 messages.
            Message limits are enforced &mdash; you&apos;ll never be charged
            for overages unless you explicitly enable them in billing settings.
          </p>

          <div className="flex gap-3">
            {!hasExistingChurch && (
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start 14-day free trial
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
