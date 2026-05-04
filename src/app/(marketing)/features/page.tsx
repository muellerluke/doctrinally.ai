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
  MousePointerClick,
  UserPlus,
  Moon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { CTASection } from "@/components/marketing/cta-section";
import {
  bentoFeatures,
  beforeAfter,
  testimonials,
  embeddedChatFeatures,
} from "@/content/marketing/data";

export const metadata: Metadata = {
  title: "Features — Doctrinally.AI",
  description:
    "Capture website visitors with Website Chat and give members a private AI chat hub — all grounded in your church's own teaching.",
  alternates: { canonical: "https://www.doctrinally.ai/features" },
};

export default function FeaturesPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="Features"
        title={
          <>
            Capture every visitor.{" "}
            <span className="italic text-primary">Disciple every member.</span>
          </>
        }
        description="Website Chat is your flagship — included on every plan. Member AI gives your congregation their own chat hub. Both share the same library of your sermons, documents, and videos."
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

      {/* ─── Website Chat (Flagship · Every plan) ─────────────────
          Top section so the reader meets the headline product before
          they scroll into the upload-and-index bento. Mirrors the
          structure of the YouTube auto-sync section below. */}
      <section
        id="website-chat"
        className="relative overflow-hidden border-b py-20 sm:py-28"
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
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1">
                <MousePointerClick className="h-3.5 w-3.5 text-gold" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  Flagship &middot; Every plan
                </span>
              </div>
              <h2 className="mt-5 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
                Capture visitors{" "}
                <span className="italic text-primary">while you sleep.</span>
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Drop one <code className="rounded bg-muted/60 px-1 py-0.5 text-[0.85em] font-mono">&lt;script&gt;</code>{" "}
                tag on your church website. Website Chat engages visitors at
                the right moment, answers in your voice with cited sources,
                and drops their name and email into your Prospects dashboard
                with the full conversation attached.
              </p>
              <ul className="mt-7 space-y-4">
                {embeddedChatFeatures.map((feature) => (
                  <li key={feature.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
                      <feature.icon className="h-4 w-4 text-gold" />
                    </div>
                    <div>
                      <div className="font-semibold">{feature.title}</div>
                      <div className="text-[0.95rem] leading-relaxed text-muted-foreground">
                        {feature.description}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 h-11 px-6 font-semibold"
                render={<Link href="/features/embedded-chat" />}
              >
                See Website Chat in action
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
                    yourchurch.com/about
                  </div>
                </div>
                <div className="space-y-3 p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Moon className="h-3.5 w-3.5 text-gold" />
                    Tuesday, 11:42 PM
                  </div>
                  <div className="rounded-lg border border-gold/30 bg-gold/[0.06] p-3 text-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                      Your church AI
                    </div>
                    <div className="mt-1 text-foreground/90">
                      Hey &mdash; happy to answer any questions about what we
                      teach. What&rsquo;s on your mind?
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Visitor
                    </div>
                    <div className="mt-1 text-foreground/90">
                      Do you do infant baptism here?
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 text-sm">
                    <UserPlus className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-[0.85rem] text-foreground/90">
                      <span className="font-semibold">New prospect:</span>{" "}
                      Sarah W. &middot; sarah@email.com
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-[12px] text-muted-foreground">
                Lands in your Prospects dashboard with the full transcript.
              </p>
            </div>
          </div>
        </div>
      </section>

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
          Headline Enterprise differentiator most churches will evaluate
          when sizing the onboarding effort. */}
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
