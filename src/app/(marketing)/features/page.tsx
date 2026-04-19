import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  FileText,
  Video,
  Sparkles,
  ArrowRight,
  Rss,
  Folder,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { SermonPreview } from "@/components/marketing/sermon-preview";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { CTASection } from "@/components/marketing/cta-section";
import {
  bentoFeatures,
  beforeAfter,
  testimonials,
  sermonAiFeatures,
} from "@/content/marketing/data";

export const metadata: Metadata = {
  title: "Features — Doctrinally.AI",
  description:
    "Upload sermons, get cited answers, see analytics on what your church is asking. Everything your church needs to give its congregation an AI that speaks with your voice.",
  alternates: { canonical: "https://www.doctrinally.ai/features" },
};

export default function FeaturesPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="Features"
        title={
          <>
            Everything your church needs to reach its people{" "}
            <span className="italic text-primary">between Sundays.</span>
          </>
        }
        description="Upload your sermons, documents, and videos. Your AI learns your voice and answers your congregation's questions 24/7 — with citations back to the source."
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="cta-ring h-12 px-7 font-semibold"
            render={<Link href="/sign-up" />}
          >
            Start your 14-day free trial
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 px-5 text-foreground/80 hover:text-foreground"
            render={<Link href="/pricing" />}
          >
            See pricing
          </Button>
        </div>
      </PageHero>

      {/* ─── Bento Features Grid ─────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mt-0 grid max-w-6xl auto-rows-auto grid-cols-1 gap-5 sm:grid-cols-2 lg:auto-rows-[200px] lg:grid-cols-6">
            {bentoFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/[0.05] sm:p-7 ${
                    f.accent
                      ? "bg-gradient-to-br from-primary/[0.07] via-background to-gold/[0.05]"
                      : "bg-card"
                  } ${f.span}`}
                >
                  {f.accent && (
                    <>
                      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-dots opacity-30" />
                    </>
                  )}
                  <div className="relative z-10">
                    <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-lg leading-snug tracking-tight sm:text-xl">
                      {f.title}
                    </h3>
                    <p className="mt-2 max-w-md text-[0.9rem] leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                  {f.accent && (
                    <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Video className="h-3.5 w-3.5" />
                        YouTube sermons
                      </span>
                      <span className="hidden text-border sm:inline">·</span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        PDFs & docs
                      </span>
                      <span className="hidden text-border sm:inline">·</span>
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Rich text editor
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── YouTube Auto-Sync ─────────────────────────────────────
          Placed before Sermon AI because it's the first Enterprise
          differentiator most churches will evaluate when sizing the
          onboarding effort. */}
      <section
        id="youtube-sync"
        className="relative overflow-hidden border-b py-20 sm:py-28"
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1">
                <Rss className="h-3.5 w-3.5 text-gold" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  Enterprise · new
                </span>
              </div>
              <h2 className="mt-5 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
                One URL. Your whole{" "}
                <span className="italic text-primary">channel.</span>
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Enterprise churches connect their YouTube channel at onboarding.
                We pull every existing sermon, short, live replay, and playlist
                into auto-generated folders &mdash; and we keep running every
                week so new uploads appear in your chat without you lifting a
                finger.
              </p>
              <ul className="mt-7 space-y-4">
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                    <Folder className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      Folders generated for you
                    </div>
                    <div className="text-[0.95rem] leading-relaxed text-muted-foreground">
                      Videos, Shorts, Live Streams, and one folder per playlist
                      you attach. Videos land in the right place automatically.
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                    <Clock className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      Weekly on your schedule
                    </div>
                    <div className="text-[0.95rem] leading-relaxed text-muted-foreground">
                      Pick the day and hour in your own timezone. Disable or
                      force-sync from Settings any time.
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                    <Check className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <div className="font-semibold">Never re-imports</div>
                    <div className="text-[0.95rem] leading-relaxed text-muted-foreground">
                      Manual uploads and prior syncs are respected &mdash; we
                      skip anything already in your library.
                    </div>
                  </div>
                </li>
              </ul>
              <Button
                className="mt-8 h-11 px-6 font-semibold"
                render={<Link href="/sign-up" />}
              >
                Try it free for 14 days
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl shadow-primary/[0.08]">
                <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gold/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
                  <div className="ml-2 flex-1 truncate rounded-md bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
                    doctrinally.ai/documents
                  </div>
                </div>
                <div className="space-y-3 p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Folder className="h-3.5 w-3.5" />
                    YouTube
                  </div>
                  {[
                    { name: "Videos", count: 184 },
                    { name: "Shorts", count: 27 },
                    { name: "Live Streams", count: 62 },
                    { name: "Playlists / Ephesians Series", count: 14 },
                  ].map((f, i) => (
                    <div
                      key={f.name}
                      className={`flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-sm animate-fade-up stagger-${i + 1}`}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-primary" />
                        <span className="font-medium">{f.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {f.count} videos
                      </span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    Last synced 6 hours ago · Next run Monday 3:00 AM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Sermon AI (Enterprise-only pastor feature) ───────────
          Placed AFTER the member-chat bento so the reader first
          grasps the core product, then sees Sermon AI as a distinct
          second AI for pastors. Gold accent + Enterprise badge set
          it apart without competing with the bento above. */}
      <section
        id="sermon-ai"
        className="relative overflow-hidden border-b bg-gradient-to-b from-background via-card/30 to-background py-20 sm:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[60%] w-[80%] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
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
                For pastors · Enterprise
              </span>
            </div>
            <h2 className="mt-5 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
              Meet{" "}
              <span className="italic text-primary">Sermon AI</span>
              <span className="text-muted-foreground/40"> — </span>
              your second AI.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              The member chat is only half the story. Enterprise churches also
              get an assistant that drafts sermons with them, trained on the
              same teaching that answers their congregation.
            </p>
          </div>

          <div className="mt-12 grid items-center gap-10 sm:mt-16 lg:grid-cols-5 lg:gap-14">
            <div className="lg:col-span-3">
              <SermonPreview />
            </div>

            <ul className="space-y-6 lg:col-span-2">
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
              <li className="pt-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 border-gold/40 hover:border-gold/80"
                  render={<Link href="/how-it-works#for-teaching-teams" />}
                >
                  See the pastor flow <ArrowRight className="h-4 w-4" />
                </Button>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Before / After ──────────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
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

      {/* ─── Testimonials ────────────────────────────────────────── */}
      <section className="border-b bg-card/30 py-20 sm:py-28">
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

      <CTASection secondaryHref="/pricing" secondaryLabel="See pricing" />
    </div>
  );
}
