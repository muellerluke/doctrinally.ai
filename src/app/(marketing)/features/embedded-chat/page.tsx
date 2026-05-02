import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  MousePointerClick,
  Moon,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Code2,
  ScrollText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/marketing/page-hero";
import { CTASection } from "@/components/marketing/cta-section";
import {
  embeddedChatFeatures,
  embeddedChatTestimonial,
} from "@/content/marketing/data";

export const metadata: Metadata = {
  title: "Website Chat — capture website visitors · Doctrinally.AI",
  description:
    "Drop a single script on your church website. Website Chat engages visitors at the right moment, answers their questions, and captures their name and email — so you never miss a lead. Included on every plan.",
  alternates: {
    canonical: "https://www.doctrinally.ai/features/embedded-chat",
  },
};

export default function EmbeddedChatPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="Flagship · Website Chat"
        title={
          <>
            Get prospects{" "}
            <span className="italic text-primary">while you sleep.</span>
          </>
        }
        description="Your website doesn't sleep — now your AI doesn't either. Website Chat engages visitors with thoughtful, tailored conversation in your church's voice, then drops their name and email into your Prospects dashboard."
      >
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="cta-ring h-12 px-7 text-[0.95rem] font-semibold"
            render={<Link href="/sign-up" />}
          >
            Start your 14-day free trial
            <ArrowRight className="h-4 w-4" />
          </Button>
          <span className="text-[12px] text-muted-foreground">
            Included on every plan
          </span>
        </div>
      </PageHero>

      {/* ─── The problem ──────────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              The problem
            </p>
            <h2 className="mt-4 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
              Your website gets visitors.{" "}
              <span className="italic text-primary">
                Do any of them ever reach out?
              </span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Most churches see 80%+ of website traffic bounce without a
              single interaction. Visitors have questions — about your
              beliefs, your services, what to expect on Sunday — and they
              quietly close the tab when they can&rsquo;t find the answer.
              That&rsquo;s a prospect lost forever.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Features grid ────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-card/30 to-background py-20 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[60%] w-[70%] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
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
                What&rsquo;s different
              </span>
            </div>
            <h2 className="mt-5 font-heading text-[1.6rem] tracking-tight sm:text-[2.4rem]">
              Not a chat bubble.{" "}
              <span className="italic text-primary">A lead-capture engine.</span>
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
            {embeddedChatFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gold/30 bg-card/60 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gold/[0.1]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl leading-snug">
                  {f.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How the outreach works ───────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              How it works
            </p>
            <h2 className="mt-4 font-heading text-[1.75rem] tracking-tight sm:text-4xl">
              Three moments, one session.
            </h2>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: ScrollText,
                title: "Visitor lands on your site",
                body: "Most website visitors browse silently and leave without ever reaching out. Website Chat sits in the background, ready to help — without ever feeling intrusive.",
              },
              {
                step: "02",
                icon: MousePointerClick,
                title: "AI starts the conversation",
                body: "A thoughtful, tailored opener — not a generic \"Can I help?\" — kicks off a real conversation in your church's voice, grounded in what your church actually teaches.",
              },
              {
                step: "03",
                icon: UserPlus,
                title: "Conversation becomes a prospect",
                body: "When the moment is right, the AI asks for a name and email — gently, with a reason. The lead lands in your Prospects dashboard with the full conversation transcript attached.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {s.step}
                </div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl leading-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Install snippet ──────────────────────────────────── */}
      <section className="border-b bg-card/30 py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1">
                <Code2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                  One line, any site
                </span>
              </div>
              <h2 className="mt-5 font-heading text-[1.75rem] leading-tight tracking-tight sm:text-[2.4rem]">
                Paste one{" "}
                <span className="italic text-primary">&lt;script&gt;</span>{" "}
                tag.
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Works on Squarespace, Webflow, Wordpress, Wix, Shopify, or
                anywhere you can add code to your page. No iframe, no
                layout surprises — the widget lives in a Shadow DOM root,
                so your site&rsquo;s styles stay untouched.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Origin-locked to your configured domains",
                  "Signed session tokens — not cookies",
                  "Captcha-protected prospect capture",
                  "Rate-limited at the edge and in the database",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <pre className="overflow-x-auto rounded-2xl border bg-background/80 p-6 text-[13px] leading-relaxed shadow-xl shadow-primary/[0.06]">
                <code className="font-mono text-foreground">
                  {`<script
  src="https://doctrinally.ai/embed.js"
  data-church-key="dai_pk_..."
  async
></script>`}
                </code>
              </pre>
              <div className="mt-4 rounded-xl border border-dashed bg-background/60 p-4 text-xs text-muted-foreground">
                <Moon className="mr-1.5 inline h-3.5 w-3.5 text-gold" />
                <span>
                  Fully hosted. Nothing to deploy, no model keys to rotate,
                  no embeddings to maintain. The same content that answers
                  member questions answers visitor questions.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonial ──────────────────────────────────────── */}
      <section className="border-b py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <figure className="mx-auto max-w-2xl rounded-2xl border border-gold/30 bg-card/60 px-6 py-6 backdrop-blur-sm sm:px-8 sm:py-8">
            <blockquote className="text-[1.05rem] italic leading-relaxed text-foreground/90">
              &ldquo;{embeddedChatTestimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 font-heading text-foreground"
              >
                {embeddedChatTestimonial.initial}
              </span>
              <div>
                <div className="font-semibold text-foreground">
                  {embeddedChatTestimonial.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {embeddedChatTestimonial.role} ·{" "}
                  {embeddedChatTestimonial.church}
                </div>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ─── Included on every plan ─────────────────────────── */}
      <section className="border-b py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/[0.06] via-background to-primary/[0.04] p-7 text-center sm:p-10">
            <Badge
              variant="secondary"
              className="border border-gold/40 bg-gold/10 text-[10px] font-semibold uppercase tracking-wider text-gold"
            >
              Flagship &middot; Every plan
            </Badge>
            <h3 className="font-heading text-2xl tracking-tight sm:text-3xl">
              Website Chat is included on{" "}
              <span className="italic text-primary">every plan</span>.
            </h3>
            <p className="max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
              Every church &mdash; Standard or Enterprise &mdash; gets the
              widget, the Prospects dashboard, and the AI-personalized opener
              toggle. Enterprise adds Sermon AI, custom domain support, and
              YouTube auto-sync.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="cta-ring h-11 px-6 font-semibold"
                render={<Link href="/sign-up" />}
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6 font-semibold"
                render={<Link href="/pricing" />}
              >
                See pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CTASection secondaryHref="/features" secondaryLabel="See all features" />
    </div>
  );
}
