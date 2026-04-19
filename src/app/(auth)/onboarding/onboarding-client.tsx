"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Globe,
  ArrowLeft,
  ArrowRight,
  Rss,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanCard } from "@/components/billing/plan-card";
import { churchInfoSchema } from "@/lib/validations/onboarding";
import { createChurch, resumeCheckout } from "@/lib/actions/onboarding";
import { slugify } from "@/lib/utils";
import { PLANS, type PlanType } from "@/lib/plans";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  OnboardingChurchAside,
  OnboardingPlanAside,
  OnboardingYouTubeAside,
} from "@/components/auth/auth-asides";

type InitialChurch = { name: string; slug: string } | null;

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: format12h(h),
}));

function format12h(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${suffix}`;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function OnboardingClient({
  initialChurch,
  appDomain,
}: {
  initialChurch: InitialChurch;
  appDomain: string;
}) {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const hasExistingChurch = !!initialChurch;
  const [step, setStep] = useState<1 | 2 | 3>(hasExistingChurch ? 2 : 1);
  const [name, setName] = useState(initialChurch?.name ?? "");
  const [slug, setSlug] = useState(initialChurch?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("enterprise");

  // Step 3 (YouTube) state — Enterprise only. Skippable.
  const [channelUrl, setChannelUrl] = useState("");
  const [ytDayOfWeek, setYtDayOfWeek] = useState("1");
  const [ytHour, setYtHour] = useState("3");
  // Lazy init so the browser timezone is picked up on first render without
  // bouncing through an effect (React "set-state-in-effect" discouraged).
  const [ytTimezone, setYtTimezone] = useState(() => detectTimezone());

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

  function handleNextFromStep1() {
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

  function handleNextFromStep2() {
    // Enterprise → YouTube step. Standard → submit straight to checkout.
    if (selectedPlan === "enterprise") {
      setStep(3);
    } else {
      submitCheckout({ withYouTube: false });
    }
  }

  async function submitCheckout({ withYouTube }: { withYouTube: boolean }) {
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
          ...(withYouTube && channelUrl.trim()
            ? {
                youtubeChannelUrl: channelUrl.trim(),
                youtubeSchedule: {
                  dayOfWeek: Number(ytDayOfWeek),
                  hourLocal: Number(ytHour),
                  timezone: ytTimezone,
                },
              }
            : {}),
        });
      }

      if (result.error) {
        if (result.error.toLowerCase().includes("url") && result.error.toLowerCase().includes("taken")) {
          setErrors({ slug: result.error });
          setStep(1);
        } else if (result.error.toLowerCase().includes("youtube")) {
          setErrors({ channelUrl: result.error });
          setStep(3);
        } else {
          toast.error(result.error);
        }
        return;
      }

      if (!hasExistingChurch) {
        window.plausible?.("Onboarding Complete", {
          props: {
            plan: selectedPlan,
            youtubeConnected: withYouTube && !!channelUrl.trim(),
          },
        });
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

  const steps = hasExistingChurch
    ? [
        { label: "Pick a plan", description: "14 days free" },
        { label: "YouTube channel", description: "Optional" },
      ]
    : [
        { label: "Name your church", description: "Pick a URL" },
        { label: "Pick a plan", description: "14 days free" },
        { label: "YouTube channel", description: "Optional" },
      ];

  const currentStepIndex = hasExistingChurch ? step - 2 : step - 1;

  const aside =
    step === 1 ? (
      <OnboardingChurchAside name={name} slug={slug} appDomain={appDomain} />
    ) : step === 2 ? (
      <OnboardingPlanAside plan={selectedPlan} />
    ) : (
      <OnboardingYouTubeAside />
    );

  return (
    <AuthShell aside={aside} steps={steps} currentStep={currentStepIndex}>
      {step === 1 && (
        <div className="animate-fade-up stagger-1 space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Step 1 · Name your church
            </div>
            <h2 className="mt-1 font-heading text-3xl leading-tight">
              What should we call your church?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This becomes your members&rsquo; home. You can change it later.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Church name</Label>
              <Input
                id="name"
                placeholder="Grace Community Church"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Church URL</Label>
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  <span className="font-medium text-foreground">
                    {slug || "yourchurch"}
                  </span>
                  .{appDomain}
                </span>
              </div>
              <Input
                id="slug"
                placeholder="grace-community"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="h-11"
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug}</p>
              )}
            </div>
            <Button className="h-11 w-full font-semibold" onClick={handleNextFromStep1}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-up stagger-1 space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Step {hasExistingChurch ? 1 : 2} · Choose your plan
            </div>
            <h2 className="mt-1 font-heading text-3xl leading-tight">
              Start with a 14-day free trial.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No card charged today. Cancel any time.
            </p>
          </div>

          <div className="grid gap-3">
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

          <p className="rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-relaxed text-muted-foreground">
            You won&apos;t be charged today. Your card will be charged $
            {PLANS[selectedPlan].price} in 14 days unless you cancel. Trial
            includes the full {PLANS[selectedPlan].name} plan:{" "}
            {PLANS[selectedPlan].questionLimit.toLocaleString()} messages.
            Message limits are enforced &mdash; you&apos;ll never be charged
            for overages unless you explicitly enable them in billing settings.
          </p>

          <div className="flex gap-3">
            {!hasExistingChurch && (
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
                className="h-11"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              className="h-11 flex-1 font-semibold"
              onClick={handleNextFromStep2}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedPlan === "enterprise"
                ? "Continue"
                : "Start 14-day free trial"}
              {selectedPlan === "enterprise" && (
                <ArrowRight className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-up stagger-1 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
              <Sparkles className="h-3 w-3" />
              Enterprise · new
            </div>
            <h2 className="mt-2 font-heading text-3xl leading-tight">
              Bring your whole channel with you.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste your YouTube channel and we&rsquo;ll pull every sermon,
              short, and live replay into the right folders. It keeps running
              every week. Optional — you can set this up later.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-url">YouTube channel URL or @handle</Label>
              <div className="relative">
                <Rss className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive/70" />
                <Input
                  id="channel-url"
                  placeholder="https://www.youtube.com/@yourchurch"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  disabled={loading}
                  className="h-11 pl-9"
                />
              </div>
              {errors.channelUrl && (
                <p className="text-sm text-destructive">{errors.channelUrl}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Sync day</Label>
                <Select
                  value={ytDayOfWeek}
                  onValueChange={(v) => v && setYtDayOfWeek(v)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sync hour</Label>
                <Select
                  value={ytHour}
                  onValueChange={(v) => v && setYtHour(v)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Input
                  value={ytTimezone}
                  onChange={(e) => setYtTimezone(e.target.value)}
                  disabled={loading}
                  placeholder="America/New_York"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              We never re-import videos you already have. Auto-created folders:{" "}
              <span className="font-medium text-foreground">Videos</span>,{" "}
              <span className="font-medium text-foreground">Shorts</span>,{" "}
              <span className="font-medium text-foreground">Live Streams</span>
              , and one per playlist.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => submitCheckout({ withYouTube: false })}
              disabled={loading}
              className="h-11"
            >
              Set up later
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={loading}
                className="h-11"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="h-11 font-semibold"
                onClick={() => submitCheckout({ withYouTube: true })}
                disabled={loading || !channelUrl.trim()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect & continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
