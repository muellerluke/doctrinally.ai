import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroChatPreview } from "@/components/marketing/hero-chat-preview";
import { SermonPreview } from "@/components/marketing/sermon-preview";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { CTASection } from "@/components/marketing/cta-section";
import { BookDemoButton } from "@/components/marketing/book-demo-button";
import {
  ArrowRight,
  Check,
  Upload,
  BarChart3,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  heroStats,
  beforeAfter,
  testimonials,
  sermonAiFeatures,
  sermonAiTestimonial,
} from "@/content/marketing/data";

export const metadata: Metadata = {
  title: "Your Church's Own AI Assistant — Doctrinally.AI",
  description:
    "Give your church its own custom AI assistant — trained on your pastor's sermons, devotions, and teaching. Launch in under 5 minutes. 14-day free trial.",
  alternates: { canonical: "https://www.doctrinally.ai" },
};

// ─── Page ──────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Announcement bar */}
      <div className="border-b bg-primary/[0.04] text-foreground/85">
        <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-2 text-center text-[11px] sm:text-[13px]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-gold" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          <span className="font-medium">New:</span>
          <span className="min-w-0 truncate text-muted-foreground sm:hidden">
            Launch your church&apos;s AI in under 5 minutes
          </span>
          <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">
            Launch your church&apos;s own custom AI assistant in under 5 minutes
          </span>
          <Link
            href="/sign-up"
            className="ml-1 hidden items-center gap-1 font-semibold text-primary hover:underline sm:inline-flex"
          >
            Try it free
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ─── HERO ───────────────────────────────────────────────── */}
      <section className="parchment-texture relative overflow-hidden border-b">
        {/* Backdrop layers */}
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-60" />
        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-primary/[0.06] via-background/0 to-background" />
        <div className="ember-glow" aria-hidden />

        <div className="container relative mx-auto grid gap-12 px-4 pb-16 pt-14 sm:gap-16 sm:pb-24 sm:pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pb-32 lg:pt-36">
          {/* Left column */}
          <div className="flex max-w-2xl flex-col justify-center">
            <div className="animate-fade-up stagger-1">
              <Badge
                variant="outline"
                className="h-auto max-w-full rounded-full border-primary/20 bg-background/80 py-1.5 pl-1.5 pr-3 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/80 shadow-sm backdrop-blur sm:text-[11px]"
              >
                <span className="mr-2 flex h-5 shrink-0 items-center rounded-full bg-gold/15 px-2 text-[10px] text-gold">
                  <Sparkles className="mr-1 h-3 w-3" /> New
                </span>
                <span className="sm:hidden">Your church&apos;s own AI</span>
                <span className="hidden sm:inline">
                  A private AI trained on your church&apos;s teaching
                </span>
              </Badge>
            </div>

            <h1 className="animate-fade-up stagger-2 mt-6 font-heading text-[2rem] leading-[1.05] tracking-[-0.02em] sm:text-6xl sm:leading-[1.02] lg:text-[4.6rem]">
              <span className="text-gradient-ink">Your church.</span>
              <br />
              <span className="text-gradient-ink">Your doctrine.</span>
              <br />
              <span className="italic text-primary">Its own AI.</span>
            </h1>

            <p className="animate-fade-up stagger-3 mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-8 sm:text-lg">
              Doctrinally.AI gives your church its own custom AI assistant
              &mdash; trained on{" "}
              <span className="font-semibold text-foreground">
                every sermon, devotion, and document your pastors have taught
              </span>
              . Members ask anything, and the answers come back in your voice,
              cited to the source.
            </p>

            {/* CTA row */}
            <div className="animate-fade-up stagger-4 mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="cta-ring h-12 px-7 text-[0.95rem] font-semibold"
                render={<Link href="/sign-up" />}
              >
                Start your 14-day free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <BookDemoButton />
            </div>

            {/* Trust row */}
            <ul className="animate-fade-in stagger-5 mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-gold" />
                14 days free
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-gold" />
                Cancel anytime
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-gold" />
                Live in under 5 minutes
              </li>
            </ul>

            {/* Hero stat strip */}
            <div className="animate-fade-up stagger-6 mt-12 grid w-full max-w-lg grid-cols-3 gap-0 divide-x divide-border/70 rounded-2xl border bg-card/40 px-0 py-4 shadow-sm backdrop-blur sm:mt-14 sm:px-1 sm:py-5">
              {heroStats.map((s) => (
                <div
                  key={s.label}
                  className="min-w-0 px-2 text-center sm:px-4"
                >
                  <div className="font-heading text-lg tracking-tight text-foreground sm:text-3xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column – live chat preview */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-gold/10 blur-2xl" />
            <HeroChatPreview />
          </div>
        </div>
      </section>

      {/* ─── SERMON AI (pastor-side story) ──────────────────────
          Lives between the member-chat hero and the problem framing
          so the reader meets both audiences right after the headline.
          Gold-accented + desktop workspace mock differentiates it
          visually from the brown phone-shaped chat preview above. */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-card/40 via-background to-background py-20 sm:py-28">
        {/* Soft gold ember to signal "different feature, Enterprise tier" */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[60%] w-[80%] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--gold) 0%, transparent 70%)",
          }}
        />

        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Copy column */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  For pastors · Sermon AI
                </span>
              </div>

              <h2 className="mt-5 font-heading text-[1.85rem] leading-tight tracking-tight sm:text-[2.6rem]">
                An assistant that writes sermons in{" "}
                <span className="italic text-primary">your</span> voice.
              </h2>

              <p className="mt-5 text-lg text-muted-foreground">
                Enterprise churches unlock a second AI — one that drafts
                sermons alongside your pastor, grounded in the same teaching
                that answers your members. Chat it through the text. Write
                alongside it. Publish, and the member chat cites it the moment
                someone asks.
              </p>

              <ul className="mt-8 grid gap-5 sm:gap-6">
                {sermonAiFeatures.map((feature) => (
                  <li key={feature.title} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                      <feature.icon className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {feature.title}
                      </div>
                      <div className="mt-0.5 text-[0.95rem] leading-relaxed text-muted-foreground">
                        {feature.description}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 border-gold/40 hover:border-gold/80"
                  render={<Link href="/features#sermon-ai" />}
                >
                  See how it works <ArrowRight className="h-4 w-4" />
                </Button>
                <span className="text-[12px] text-muted-foreground">
                  Included on the Enterprise plan.
                </span>
              </div>
            </div>

            {/* Preview column */}
            <div className="relative">
              <SermonPreview />
            </div>
          </div>

          {/* Pastor testimonial tucked under the workspace — closes the loop */}
          <figure className="mx-auto mt-16 max-w-2xl rounded-2xl border border-gold/30 bg-card/60 px-6 py-6 backdrop-blur-sm sm:mt-20 sm:px-8 sm:py-7">
            <blockquote className="text-[1.02rem] italic leading-relaxed text-foreground/90">
              &ldquo;{sermonAiTestimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 font-heading text-gold-foreground"
              >
                {sermonAiTestimonial.initial}
              </span>
              <div>
                <div className="font-semibold text-foreground">
                  {sermonAiTestimonial.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {sermonAiTestimonial.role} · {sermonAiTestimonial.church}
                </div>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ─── BEFORE / AFTER ───────────────────────────────────── */}
      <section className="relative border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              The problem
            </p>
            <h2 className="mt-4 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
              Your church needs{" "}
              <span className="italic text-primary">its own AI.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Because the alternative is letting a generic chatbot &mdash;
              trained on the open internet &mdash; disciple your congregation
              for you.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:mt-16 sm:gap-8 md:grid-cols-2">
            {/* Before card */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 sm:p-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Without a church AI
              </div>
              <ul className="space-y-4">
                {beforeAfter.before.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-2 block h-1 w-5 shrink-0 rounded bg-muted-foreground/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After card */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-background to-gold/[0.05] p-6 shadow-xl shadow-primary/[0.04] sm:p-8">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                With your church&apos;s AI
              </div>
              <ul className="space-y-4">
                {beforeAfter.after.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-foreground"
                  >
                    <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EXPLORE CARDS ───────────────────────────────────────── */}
      <section className="border-b bg-card/30 py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              Learn more
            </p>
            <h2 className="mt-4 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
              See what Doctrinally.AI{" "}
              <span className="italic text-primary">can do.</span>
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:mt-16 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "How It Works",
                description:
                  "Three steps. Under five minutes. No tech skills required.",
                href: "/how-it-works",
              },
              {
                icon: Upload,
                title: "Features",
                description:
                  "Upload sermons, get cited answers, track what your church is asking.",
                href: "/features",
              },
              {
                icon: BarChart3,
                title: "Pricing",
                description:
                  "From $49/month with a 14-day free trial. No setup fees, no contracts.",
                href: "/pricing",
              },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col rounded-2xl border bg-background p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/[0.06]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              Real results from real churches
            </p>
            <h2 className="mt-4 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
              The AI their church{" "}
              <span className="italic text-primary">actually needed.</span>
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:mt-16 md:grid-cols-2">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <CTASection secondaryHref="/pricing" secondaryLabel="See pricing" />
    </div>
  );
}
