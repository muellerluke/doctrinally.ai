import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  TrendingUp,
  Rss,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/marketing/page-hero";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { CTASection } from "@/components/marketing/cta-section";
import {
  standardFeatures,
  enterpriseFeatures,
  sermonAiFeatures,
  faqs,
} from "@/content/marketing/data";

export const metadata: Metadata = {
  title: "Pricing — Doctrinally.AI",
  description:
    "Simple, transparent pricing for your church's own AI assistant. Standard plan at $49/month, Enterprise at $99/month. 14-day free trial on every plan.",
  alternates: { canonical: "https://www.doctrinally.ai/pricing" },
};

const pricingFaqs = faqs.filter((f) =>
  ["What happens if I go over my monthly limits?", "Can I cancel anytime?", "Can I use my own domain?"].includes(
    f.question
  )
);

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="Transparent pricing"
        title={
          <>
            Your own AI for less than{" "}
            <span className="italic text-primary">one Sunday lunch.</span>
          </>
        }
        description="No setup fees. No contracts. 14-day free trial on every plan. Message limits are enforced by default — you'll never be surprised."
      />

      {/* ─── Pricing Cards ────────────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
            {/* Standard */}
            <div className="relative flex flex-col rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                For growing churches
              </div>
              <h3 className="font-heading text-2xl tracking-tight">Standard</h3>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-heading text-5xl tracking-tight">$49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                That&apos;s <span className="font-semibold text-foreground">$1.63/day</span> for your church&apos;s own AI assistant.
              </p>

              <ul className="mt-7 space-y-3.5">
                {standardFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.92rem]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 h-11 w-full font-semibold"
                variant="outline"
                render={<Link href="/sign-up" />}
              >
                Start free trial
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                14 days free · Cancel anytime
              </p>
            </div>

            {/* Enterprise */}
            <div className="relative flex flex-col overflow-visible rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-primary/[0.04] via-background to-gold/[0.06] p-6 shadow-2xl shadow-primary/[0.08] sm:p-8">
              <div className="absolute -top-3 left-6 sm:left-8">
                <Badge className="rounded-full border border-gold/50 bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-foreground shadow-md">
                  Most popular · Save 40%
                </Badge>
              </div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
                For established churches
              </div>
              <h3 className="font-heading text-2xl tracking-tight">Enterprise</h3>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-heading text-5xl tracking-tight">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Your AI on your own domain, with your church&apos;s branding and more capacity.
              </p>

              <ul className="mt-7 space-y-3.5">
                {enterpriseFeatures.map((f, i) => {
                  const isHeader = i === 0;
                  const isSermonAi = f.startsWith("Sermon AI");
                  const isAutoSync = f.startsWith("Auto-sync");
                  if (isAutoSync) {
                    // Headline Enterprise differentiator — render as a
                    // mini-card that echoes the Sermon AI treatment below.
                    return (
                      <li
                        key={f}
                        className="relative flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/[0.06] p-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-background text-gold">
                          <Rss className="h-4 w-4" />
                        </div>
                        <div className="text-[0.9rem] leading-snug">
                          <div className="font-semibold text-foreground">
                            YouTube auto-sync{" "}
                            <span className="ml-1 rounded-md border border-gold/40 bg-gold/10 px-1.5 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide text-gold">
                              New
                            </span>
                          </div>
                          <div className="text-[0.82rem] text-muted-foreground">
                            Paste your channel once. We pull every sermon,
                            short, and live replay — and keep it fresh every
                            week.
                          </div>
                        </div>
                      </li>
                    );
                  }
                  if (isSermonAi) {
                    // Flagship Enterprise feature — render as a mini-card
                    // that visually lifts off the plain bullet list.
                    return (
                      <li
                        key={f}
                        className="relative flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/[0.06] p-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-background text-gold">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="text-[0.9rem] leading-snug">
                          <div className="font-semibold text-foreground">
                            Sermon AI{" "}
                            <span className="ml-1 rounded-md border border-gold/40 bg-gold/10 px-1.5 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide text-gold">
                              Exclusive
                            </span>
                          </div>
                          <div className="text-[0.82rem] text-muted-foreground">
                            Draft sermons with an assistant trained on your
                            church&apos;s own teaching.
                          </div>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={f}
                      className={`flex items-start gap-2.5 text-[0.92rem] ${
                        isHeader ? "font-semibold text-foreground" : ""
                      }`}
                    >
                      {isHeader ? (
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      ) : (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      )}
                      <span className={isHeader ? "" : "text-foreground/90"}>
                        {f}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <Button
                className="cta-ring mt-8 h-11 w-full font-semibold"
                render={<Link href="/sign-up" />}
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                14 days free · Cancel anytime
              </p>
            </div>
          </div>

          {/* Value anchor bar */}
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border bg-background/60 px-6 py-4 text-center backdrop-blur">
            <p className="text-[13px] text-muted-foreground">
              <TrendingUp className="mr-1 inline h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">$49/month</span>{" "}
              for an AI trained on your church &mdash; and it answers the
              questions{" "}
              <span className="italic">your pastors would be answering anyway.</span>
            </p>
          </div>

          <p className="mx-auto mt-6 max-w-lg text-center text-[12px] text-muted-foreground">
            Document uploads are always unlimited. Message limits are enforced
            by default &mdash; you&apos;ll never be charged for overages unless
            you opt in. If enabled, extra messages are $0.10 each on Standard
            or $0.05 each on Enterprise, with a cap you control.
          </p>
        </div>
      </section>

      {/* ─── YouTube Auto-Sync explainer ───────────────────────────
          Headline Enterprise differentiator. Churches with 200+ existing
          sermons skip a week of manual uploads with this one input. */}
      <section className="relative overflow-hidden border-b py-14 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl items-center gap-10 rounded-3xl border border-gold/30 bg-gradient-to-br from-destructive/[0.04] via-background to-gold/[0.08] p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1">
                <Rss className="h-3.5 w-3.5 text-gold" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  Enterprise &middot; new
                </span>
              </div>
              <h2 className="mt-4 font-heading text-[1.75rem] leading-tight tracking-tight sm:text-[2.25rem]">
                Your whole YouTube channel,{" "}
                <span className="italic text-primary">indexed overnight.</span>
              </h2>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">
                Paste your channel once. We pull every sermon, short, live
                replay, and playlist into auto-generated folders. Every week,
                at a time you choose, we check for new uploads and import them
                — never re-importing what you already have.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  "Folders for Videos, Shorts, Live Streams, and each playlist",
                  "Weekly schedule in your own timezone — pick your day and hour",
                  "Transcription and citations work the same as manual uploads",
                  "Admin sees last-run stats, can force-sync anytime, or pause",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-7 h-11 px-6 font-semibold"
                render={<Link href="/sign-up" />}
              >
                Start with auto-sync
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <div className="rounded-2xl border bg-background/80 p-5 shadow-xl shadow-primary/[0.06]">
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Rss className="h-3.5 w-3.5 text-destructive" />
                  youtube.com/@yourchurch
                </div>
                <div className="ml-3 h-4 w-px bg-border" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Videos",
                    "Shorts",
                    "Live Streams",
                    "Playlists",
                  ].map((f, i) => (
                    <div
                      key={f}
                      className={`flex items-center gap-2 rounded-lg border bg-background/60 p-3 text-sm animate-fade-up stagger-${i + 1}`}
                    >
                      <div className="h-3 w-3 rounded-sm bg-primary/70" />
                      <span className="font-medium">{f}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Every Monday at 3:00 AM &middot; America/New_York
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why Enterprise · Sermon AI explainer ──────────────────
          Surfaces what "Sermon AI" actually means for pastors looking
          at the Enterprise bullet above. Three-up grid with gold
          accents, matching the identity used on /features and /how-it-works. */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-card/30 to-background py-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[70%] w-[70%] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--gold) 0%, transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                What Enterprise unlocks
              </span>
            </div>
            <h2 className="mt-5 font-heading text-[1.6rem] tracking-tight sm:text-[2.2rem]">
              Sermon AI, in three moments.
            </h2>
            <p className="mt-4 text-[0.98rem] leading-relaxed text-muted-foreground">
              An assistant trained on your own teaching, living beside a rich
              editor. Chat it through the text, write alongside it, publish
              when ready — and the chat your members already use cites it the
              same day.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {sermonAiFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gold/30 bg-card/60 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gold/[0.1]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg leading-snug">{f.title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/features#sermon-ai"
              className="text-sm font-medium text-primary hover:underline"
            >
              See Sermon AI in action &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Guarantee ───────────────────────────────────────────── */}
      <section className="border-b py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-background to-primary/[0.04] p-7 text-center sm:gap-8 sm:p-10 md:flex-row md:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-background shadow-inner">
              <ShieldCheck className="h-10 w-10 text-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-2xl tracking-tight sm:text-3xl">
                Try your church&apos;s AI free for 14 days.
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
                Launch it, load it with your teaching, let your congregation ask
                it anything. If it&apos;s not a fit, cancel in one click &mdash;
                and you keep every document you uploaded. No hostage situations.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              <Button
                size="lg"
                className="cta-ring h-12 px-7 font-semibold"
                render={<Link href="/sign-up" />}
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Set up in under 5 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing FAQ ─────────────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-[1.75rem] tracking-tight sm:text-4xl">
              Common pricing questions
            </h2>
          </div>
          <div className="mx-auto mt-12 max-w-3xl">
            <FAQAccordion faqs={pricingFaqs} />
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="text-sm font-medium text-primary hover:underline"
            >
              See all FAQs &rarr;
            </Link>
          </div>
        </div>
      </section>

      <CTASection secondaryHref="/features" secondaryLabel="See features" />
    </div>
  );
}
