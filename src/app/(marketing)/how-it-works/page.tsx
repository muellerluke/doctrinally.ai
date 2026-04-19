import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { CTASection } from "@/components/marketing/cta-section";
import {
  howItWorksSteps,
  sermonAiSteps,
  testimonials,
} from "@/content/marketing/data";

export const metadata: Metadata = {
  title: "How It Works — Doctrinally.AI",
  description:
    "Launch your church's AI in under 5 minutes. Upload your sermons, share a QR code, and your congregation can ask questions 24/7 with cited answers.",
  alternates: { canonical: "https://www.doctrinally.ai/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="How it works"
        title={
          <>
            Your church&apos;s own AI, live in{" "}
            <span className="italic text-primary">under 5 minutes.</span>
          </>
        }
        description="Three simple steps. No technical skills required. If you can paste a YouTube link and drag a PDF, you can launch your church's AI."
      >
        <Button
          size="lg"
          className="cta-ring h-12 px-7 font-semibold"
          render={<Link href="/sign-up" />}
        >
          Start your 14-day free trial
          <ArrowRight className="h-4 w-4" />
        </Button>
      </PageHero>

      {/* ─── Steps ────────────────────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {howItWorksSteps.map((s, i) => (
              <div
                key={s.step}
                className="group relative rounded-2xl border bg-background p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/[0.06] sm:p-8"
              >
                <div className="absolute right-6 top-6 font-heading text-5xl italic text-muted-foreground/15">
                  {s.step}
                </div>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-heading text-xl">{s.title}</h3>
                <p className="text-[0.93rem] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
                {i < 2 && (
                  <div className="absolute right-[-14px] top-1/2 hidden h-px w-7 -translate-y-1/2 bg-border md:block" />
                )}
              </div>
            ))}
          </div>

          {/* Expanded detail per step */}
          <div className="mx-auto mt-20 max-w-4xl space-y-16">
            <div>
              <div className="flex items-center gap-4">
                <span className="font-heading text-4xl italic text-primary/30">01</span>
                <h3 className="font-heading text-2xl tracking-tight">
                  Upload everything your church has taught
                </h3>
              </div>
              <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
                Paste a YouTube sermon URL and we automatically pull the
                transcript, timestamps, and metadata. Drop in a PDF or Word doc
                and we extract every page. Or use our built-in rich text editor
                to create new devotions and study guides from scratch. Each
                document is chunked, indexed, and ready for your AI to use in
                minutes &mdash; not hours.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-4">
                <span className="font-heading text-4xl italic text-primary/30">02</span>
                <h3 className="font-heading text-2xl tracking-tight">
                  Your AI learns your pastor&apos;s voice
                </h3>
              </div>
              <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
                Every answer your AI gives comes from the content you uploaded
                &mdash; your sermons, your documents, your teaching. It
                doesn&apos;t guess. It doesn&apos;t pull from the open internet.
                When it cites a source, that citation links to the exact sermon,
                timestamp, or document page it came from. When it doesn&apos;t
                have an answer, it says so honestly.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-4">
                <span className="font-heading text-4xl italic text-primary/30">03</span>
                <h3 className="font-heading text-2xl tracking-tight">
                  Share with a QR code &mdash; no login required
                </h3>
              </div>
              <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
                Your church gets a unique URL and QR code. Print it on
                Sunday&apos;s bulletin, put it on your website, or text it to
                your small group. Members scan and start asking &mdash; no
                account, no password, no friction. Your analytics dashboard
                shows you what they&apos;re asking about, where your content has
                gaps, and which sermons keep getting revisited.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── For teaching teams · Sermon AI loop ───────────────────
          The 3 steps above describe the member-facing loop (upload →
          learn → share). Enterprise churches have a second loop for
          pastors: draft with AI → publish → chat cites it. We show
          that explicitly rather than burying it in prose. */}
      <section
        id="for-teaching-teams"
        className="relative overflow-hidden border-b bg-gradient-to-b from-background via-card/40 to-background py-20 sm:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[50%] w-[70%] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
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
                For teaching teams · Enterprise
              </span>
            </div>
            <h2 className="mt-5 font-heading text-[1.75rem] tracking-tight sm:text-4xl">
              A second loop, for the{" "}
              <span className="italic text-primary">pulpit.</span>
            </h2>
            <p className="mt-5 text-[1rem] leading-relaxed text-muted-foreground">
              Everything above is the congregation&apos;s loop. Enterprise
              churches get a second one: pastors drafting sermons with an
              assistant rooted in their own teaching, then publishing them
              back into the same library the chat draws from.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
            {sermonAiSteps.map((s, i) => (
              <div
                key={s.step}
                className="group relative rounded-2xl border border-gold/30 bg-card/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/[0.12] sm:p-8"
              >
                <div className="absolute right-6 top-6 font-heading text-5xl italic text-gold/15">
                  {s.step}
                </div>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold shadow-sm">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-heading text-xl">{s.title}</h3>
                <p className="text-[0.93rem] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
                {i < sermonAiSteps.length - 1 && (
                  <div className="absolute right-[-14px] top-1/2 hidden h-px w-7 -translate-y-1/2 bg-gold/30 md:block" />
                )}
              </div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] text-muted-foreground">
            The same content library powers both loops — so what pastors write
            on Saturday answers members on Sunday.
          </p>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────── */}
      <section className="border-b bg-card/30 py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              Real results from real churches
            </p>
            <h2 className="mt-4 font-heading text-[1.75rem] tracking-tight sm:text-4xl">
              See what pastors are saying.
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:mt-16 md:grid-cols-2">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      <CTASection secondaryHref="/features" secondaryLabel="See features" />
    </div>
  );
}
