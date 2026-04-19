"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Globe, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
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
import {
  churchInfoSchema,
  websiteDomainSchema,
} from "@/lib/validations/onboarding";
import { createChurch, resumeCheckout } from "@/lib/actions/onboarding";
import { slugify } from "@/lib/utils";
import { PLANS, type PlanType } from "@/lib/plans";

type InitialChurch = { name: string; slug: string } | null;

type Step = 1 | 2 | 3;

export function OnboardingClient({
  initialChurch,
}: {
  initialChurch: InitialChurch;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const hasExistingChurch = !!initialChurch;
  // Returning users (church already exists) jump straight to plan select;
  // they configured the website on their first attempt and editing it now
  // would mean re-running branding extraction at an awkward time.
  const [step, setStep] = useState<Step>(hasExistingChurch ? 3 : 1);
  const [name, setName] = useState(initialChurch?.name ?? "");
  const [slug, setSlug] = useState(initialChurch?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [websiteDomain, setWebsiteDomain] = useState("");
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

  function handleNextFromInfo() {
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

  function handleNextFromWebsite() {
    setErrors({});
    if (websiteDomain.trim().length > 0) {
      const parsed = websiteDomainSchema.safeParse(websiteDomain);
      if (!parsed.success) {
        setErrors({ websiteDomain: parsed.error.issues[0].message });
        return;
      }
    }
    setStep(3);
  }

  function skipWebsite() {
    setErrors({});
    setWebsiteDomain("");
    setStep(3);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      let result;

      if (hasExistingChurch) {
        result = await resumeCheckout(selectedPlan);
      } else {
        result = await createChurch({
          name,
          slug,
          plan: selectedPlan,
          websiteDomain: websiteDomain.trim() || null,
        });
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
        window.plausible?.("Onboarding Complete", { props: { plan: selectedPlan } });
      }

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
              <Button className="w-full" onClick={handleNextFromInfo}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="mx-auto max-w-sm animate-fade-up shadow-xl shadow-primary/[0.04]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="font-heading text-2xl">
              Connect your website
            </CardTitle>
            <CardDescription>
              We&apos;ll pull your logo, brand colors, and key pages so your
              assistant feels like part of your church from day one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="websiteDomain">Church website</Label>
                <Input
                  id="websiteDomain"
                  placeholder="mychurch.com"
                  value={websiteDomain}
                  onChange={(e) => setWebsiteDomain(e.target.value)}
                  autoFocus
                />
                {errors.websiteDomain ? (
                  <p className="text-sm text-destructive">
                    {errors.websiteDomain}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You can change this anytime in settings.
                  </p>
                )}
              </div>

              <div className="rounded-md border border-primary/15 bg-primary/[0.04] p-3 text-xs text-muted-foreground">
                We&apos;ll crawl up to 50 pages on Standard or 100 on Enterprise
                each month so the AI can answer questions from your existing
                site content. You control which pages get included from
                settings.
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={skipWebsite}
                  className="flex-1"
                >
                  Skip for now
                </Button>
                <Button onClick={handleNextFromWebsite} className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
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
            {PLANS[selectedPlan].price} in 14 days unless you cancel. Trial
            includes the full {PLANS[selectedPlan].name} plan:{" "}
            {PLANS[selectedPlan].questionLimit.toLocaleString()}{" "}messages.
            Message limits are enforced &mdash; you&apos;ll never be charged
            for overages unless you explicitly enable them in billing settings.
          </p>

          <div className="flex gap-3">
            {!hasExistingChurch && (
              <Button
                variant="outline"
                onClick={() => setStep(2)}
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
