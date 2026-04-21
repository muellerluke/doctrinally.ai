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
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/billing/plan-card";
import {
  churchInfoSchema,
  websiteDomainSchema,
} from "@/lib/validations/onboarding";
import {
  checkSlugAvailable,
  createChurch,
  quickScanChannelCaptions,
  resumeCheckout,
} from "@/lib/actions/onboarding";
import { slugify } from "@/lib/utils";
import { PLANS, type PlanType } from "@/lib/plans";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  OnboardingChurchAside,
  OnboardingPlanAside,
  OnboardingYouTubeAside,
} from "@/components/auth/auth-asides";

type InitialChurch = { name: string; slug: string } | null;
type Step = 1 | 2 | 3 | 4;

// YouTube auto-sync runs on a fixed default cadence — Monday 3am in the
// admin's browser timezone. The day/hour pickers were removed from onboarding
// because they created setup friction; admins who want to change the cadence
// can do it from the Settings → YouTube Sync panel after checkout.
const DEFAULT_SYNC_DAY_OF_WEEK = 1;
const DEFAULT_SYNC_HOUR_LOCAL = 3;

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
  // Step order: 1 = Name church, 2 = Website, 3 = YouTube, 4 = Pick a plan
  // (final). Returning users (checkout bounced) skip straight to the plan
  // step since their church row is already created.
  const [step, setStep] = useState<Step>(hasExistingChurch ? 4 : 1);
  const [name, setName] = useState(initialChurch?.name ?? "");
  const [slug, setSlug] = useState(initialChurch?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [websiteDomain, setWebsiteDomain] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("enterprise");

  // YouTube channel URL. Schedule inputs were removed — sync runs weekly on
  // Monday 3am local time and can be customized later in Settings.
  const [channelUrl, setChannelUrl] = useState("");
  // Lazy init so the browser timezone is picked up on first render without
  // bouncing through an effect.
  const [ytTimezone] = useState(() => detectTimezone());

  // Caption preflight: sample the latest 3 videos from the channel so the
  // admin learns up-front if captions are missing. Full scan runs in the
  // background after Stripe checkout.
  type CaptionScanState =
    | { state: "idle" }
    | { state: "scanning" }
    | {
        state: "scanned";
        channelTitle: string;
        sampleSize: number;
        withCaptions: number;
        withoutCaptions: number;
      }
    | { state: "error"; message: string };
  const [captionScan, setCaptionScan] = useState<CaptionScanState>({
    state: "idle",
  });
  const [captionScanForUrl, setCaptionScanForUrl] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Debounced slug availability. `idle` covers both "no slug yet" and the
  // returning-user case where the slug is already their own church.
  type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");

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

  useEffect(() => {
    // Returning users already own this slug; skip the check.
    if (hasExistingChurch) {
      setSlugStatus("idle");
      return;
    }
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const currentSlug = slug;
    const t = setTimeout(async () => {
      const res = await checkSlugAvailable(currentSlug);
      // Ignore if slug changed while we were waiting for the network.
      if (currentSlug !== slug) return;
      if (res.available) {
        setSlugStatus("available");
        setErrors((prev) => {
          if (!prev.slug) return prev;
          const { slug: _drop, ...rest } = prev;
          return rest;
        });
      } else {
        setSlugStatus(res.reason === "invalid" ? "invalid" : "taken");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug, hasExistingChurch]);

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
    if (slugStatus === "taken") {
      setErrors({ slug: "This URL is already taken. Please choose a different one." });
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

  async function handleNextFromYouTube() {
    setErrors({});
    const trimmed = channelUrl.trim();
    // No channel provided — treat as "skip" and move on.
    if (!trimmed) {
      setStep(4);
      return;
    }
    // Already scanned this exact URL — advance without re-scanning so a
    // back-then-next traversal doesn't burn another InnerTube probe.
    if (captionScan.state === "scanned" && captionScanForUrl === trimmed) {
      setStep(4);
      return;
    }
    setCaptionScan({ state: "scanning" });
    try {
      const result = await quickScanChannelCaptions(trimmed);
      if (!result.success) {
        setCaptionScan({ state: "error", message: result.error });
        // Inconclusive scan shouldn't block the admin — let them continue
        // and the background scan after checkout will fill in the truth.
        setCaptionScanForUrl(trimmed);
        return;
      }
      setCaptionScan({
        state: "scanned",
        channelTitle: result.channelTitle,
        sampleSize: result.sampleSize,
        withCaptions: result.withCaptions,
        withoutCaptions: result.withoutCaptions,
      });
      setCaptionScanForUrl(trimmed);
    } catch {
      setCaptionScan({
        state: "error",
        message:
          "Couldn't reach YouTube just now. You can continue and we'll scan again after checkout.",
      });
      setCaptionScanForUrl(trimmed);
    }
  }

  function skipYouTube() {
    setErrors({});
    setChannelUrl("");
    setCaptionScan({ state: "idle" });
    setCaptionScanForUrl("");
    setStep(4);
  }

  async function submitCheckout() {
    setLoading(true);
    // YouTube auto-sync is Enterprise-only. If the admin filled in a channel
    // URL while picking Standard we quietly drop it — the input is a soft
    // Enterprise teaser, not a hard gate on the step.
    const includeYouTube =
      selectedPlan === "enterprise" && !!channelUrl.trim();
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
          ...(includeYouTube
            ? {
                youtubeChannelUrl: channelUrl.trim(),
                youtubeSchedule: {
                  dayOfWeek: DEFAULT_SYNC_DAY_OF_WEEK,
                  hourLocal: DEFAULT_SYNC_HOUR_LOCAL,
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
            youtubeConnected: includeYouTube,
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

  // New-user flow shares its step list with /sign-up so the progress bar
  // feels continuous across both routes ("Step 2 of 5" on the church-name
  // screen, etc.). Returning users (checkout bounced) only need to pick a
  // plan — everything else was already saved on their first attempt.
  const steps = hasExistingChurch
    ? [{ label: "Pick a plan", description: "14 days free" }]
    : [
        { label: "Create your account", description: "Done" },
        { label: "Name your church", description: "Pick a URL" },
        { label: "Connect your website", description: "Optional" },
        { label: "YouTube channel", description: "Optional" },
        { label: "Pick a plan", description: "14 days free" },
      ];

  // New users: step 1 → index 1 ("Name your church"), since index 0 is the
  // already-completed sign-up. Returning users: plan is the only visible
  // step so step 4 → index 0.
  const currentStepIndex = hasExistingChurch ? 0 : step;

  const aside =
    step === 1 ? (
      <OnboardingChurchAside name={name} slug={slug} appDomain={appDomain} />
    ) : step === 2 ? (
      <OnboardingChurchAside name={name} slug={slug} appDomain={appDomain} />
    ) : step === 3 ? (
      <OnboardingYouTubeAside />
    ) : (
      <OnboardingPlanAside plan={selectedPlan} />
    );

  return (
    <AuthShell aside={aside} steps={steps} currentStep={currentStepIndex}>
      {step === 1 && (
        <div className="animate-fade-up stagger-1 space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Step 2 · Name your church
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
              <div className="relative">
                <Input
                  id="slug"
                  placeholder="grace-community"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="h-11 pr-10"
                  aria-invalid={slugStatus === "taken" || !!errors.slug}
                />
                {slugStatus === "checking" && (
                  <Loader2
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                )}
                {slugStatus === "available" && (
                  <Check
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500"
                    aria-hidden
                  />
                )}
              </div>
              {errors.slug ? (
                <p className="text-sm text-destructive">{errors.slug}</p>
              ) : slugStatus === "taken" ? (
                <p className="text-sm text-destructive">
                  That URL is already taken. Try another.
                </p>
              ) : slugStatus === "available" ? (
                <p className="text-sm text-emerald-600">
                  {slug}.{appDomain} is available.
                </p>
              ) : null}
            </div>
            <Button
              className="h-11 w-full font-semibold"
              onClick={handleNextFromStep1}
              disabled={slugStatus === "checking" || slugStatus === "taken"}
            >
              {slugStatus === "checking" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
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
              Step 3 · Connect your website
            </div>
            <h2 className="mt-1 font-heading text-3xl leading-tight">
              Bring your site along for the ride.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ll pull your logo, brand colors, and key pages so your
              assistant feels like part of your church from day one.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="websiteDomain">Church website</Label>
              <Input
                id="websiteDomain"
                placeholder="mychurch.com"
                value={websiteDomain}
                onChange={(e) => setWebsiteDomain(e.target.value)}
                className="h-11"
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

            <div className="rounded-md border border-primary/15 bg-primary/[0.04] p-3 text-xs leading-relaxed text-muted-foreground">
              We&apos;ll crawl up to 50 pages on Standard or 100 on Enterprise
              each month so the AI can answer questions from your existing
              site content. You control which pages get included from settings.
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={skipWebsite}
                disabled={loading}
                className="h-11"
              >
                Skip for now
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="h-11"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="h-11 font-semibold"
                  onClick={handleNextFromWebsite}
                  disabled={loading}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-up stagger-1 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
              <Sparkles className="h-3 w-3" />
              Step 4 · Enterprise auto-sync
            </div>
            <h2 className="mt-2 font-heading text-3xl leading-tight">
              Bring your whole channel with you.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste your YouTube channel and we&rsquo;ll pull every sermon,
              short, and live replay into the right folders. It keeps running
              every week. Included with Enterprise — skip if you&rsquo;re
              picking Standard on the next step.
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
                  onChange={(e) => {
                    setChannelUrl(e.target.value);
                    // Invalidate any prior scan when the URL changes so
                    // the admin doesn't see stale "48% captioned" results.
                    if (captionScan.state !== "idle") {
                      setCaptionScan({ state: "idle" });
                    }
                  }}
                  disabled={loading || captionScan.state === "scanning"}
                  className="h-11 pl-9"
                />
              </div>
              {errors.channelUrl && (
                <p className="text-sm text-destructive">{errors.channelUrl}</p>
              )}
            </div>

            {captionScan.state === "scanned" &&
              captionScan.withoutCaptions === 0 &&
              captionScan.sampleSize > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="text-emerald-900 dark:text-emerald-100">
                    <span className="font-medium">
                      {captionScan.channelTitle}
                    </span>{" "}
                    — all {captionScan.sampleSize} recent videos have captions.
                    You&rsquo;re good to go.
                  </div>
                </div>
              )}

            {captionScan.state === "scanned" &&
              captionScan.withoutCaptions > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="space-y-1 text-amber-900 dark:text-amber-100">
                    <div>
                      <span className="font-medium">
                        {captionScan.withoutCaptions} of{" "}
                        {captionScan.sampleSize}
                      </span>{" "}
                      recent videos on{" "}
                      <span className="font-medium">
                        {captionScan.channelTitle}
                      </span>{" "}
                      don&rsquo;t have captions.
                    </div>
                    <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
                      We can only ingest videos with captions — turn them on in
                      YouTube Studio so they&rsquo;re included. We&rsquo;ll
                      scan the full channel after checkout and email you the
                      complete report.{" "}
                      <a
                        href="https://support.google.com/youtube/answer/2734796"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 underline underline-offset-2"
                      >
                        How to turn on captions
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

            {captionScan.state === "error" && (
              <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/40 p-3 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{captionScan.message}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Syncs weekly on Monday at 3am in your local timezone —
              customizable in Settings later. We never re-import videos you
              already have. Auto-created folders:{" "}
              <span className="font-medium text-foreground">Videos</span>,{" "}
              <span className="font-medium text-foreground">Shorts</span>,{" "}
              <span className="font-medium text-foreground">Live Streams</span>
              , and one per playlist.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={skipYouTube}
              disabled={loading}
              className="h-11"
            >
              Skip for now
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
                onClick={handleNextFromYouTube}
                disabled={loading || captionScan.state === "scanning"}
              >
                {captionScan.state === "scanning" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking your channel…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-fade-up stagger-1 space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Step {hasExistingChurch ? 1 : 5} · Choose your plan
            </div>
            <h2 className="mt-1 font-heading text-3xl leading-tight">
              Start with a 14-day free trial.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Card required today. No charge until day 14. Cancel any time.
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
            {PLANS[selectedPlan].questionLimit.toLocaleString()}{" "}messages.
            Message limits are enforced &mdash; you&apos;ll never be charged
            for overages unless you explicitly enable them in billing settings.
          </p>

          <div className="flex gap-3">
            {!hasExistingChurch && (
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                disabled={loading}
                className="h-11"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              className="h-11 flex-1 font-semibold"
              onClick={submitCheckout}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start 14-day free trial
            </Button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
