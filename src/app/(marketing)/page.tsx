import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroChatPreview } from "@/components/marketing/hero-chat-preview";
import {
  ArrowRight,
  Check,
  MessageSquare,
  Upload,
  BarChart3,
  FileText,
  Video,
  Sparkles,
  ShieldCheck,
  Clock,
  Quote,
  BookOpen,
  Zap,
  Globe,
  Users,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The AI Assistant for Your Church's Sermons — Doctrinally.AI",
  description:
    "Turn every sermon, devotion, and document into instant, cited answers for your congregation. Set up in under 5 minutes. 14-day free trial.",
  alternates: { canonical: "https://www.doctrinally.ai" },
};

// ─── Data ──────────────────────────────────────────────────────────────────

const heroStats = [
  { value: "< 5 min", label: "Average setup" },
  { value: "24/7", label: "Answers for your members" },
  { value: "0", label: "Training required" },
];

const bentoFeatures = [
  {
    icon: Upload,
    title: "Add sermons, devotions, and documents in seconds",
    description:
      "Paste a YouTube link, upload a video or PDF, or write new devotions in our built-in editor. Your library is ready for questions right away.",
    span: "lg:col-span-4 lg:row-span-2",
    accent: true,
  },
  {
    icon: BookOpen,
    title: "Grounded in your pastor's teaching",
    description:
      "Answers come from YOUR church's own sermons and writings first — not a generic model guessing at theology.",
    span: "lg:col-span-2 lg:row-span-1",
  },
  {
    icon: Video,
    title: "Citations that play",
    description:
      "Sermons embed inline. Videos jump to the exact moment. PDFs link straight to the page.",
    span: "lg:col-span-2 lg:row-span-1",
  },
  {
    icon: BarChart3,
    title: "See what your people are asking",
    description:
      "A clean dashboard shows trending topics, unanswered questions, and content gaps — so you know what to preach next.",
    span: "lg:col-span-3 lg:row-span-1",
  },
  {
    icon: Globe,
    title: "Share with a QR code",
    description:
      "Drop a QR code on Sunday's bulletin. Members scan and ask — no login required.",
    span: "lg:col-span-3 lg:row-span-1",
  },
];

const beforeAfter = {
  before: [
    "Sermons disappear into a YouTube channel nobody searches",
    "Members text the pastor the same question five times a week",
    "New visitors can't find what you teach on baptism, marriage, or suffering",
    "Years of faithful teaching sit on a hard drive no one opens",
  ],
  after: [
    "Every sermon becomes instantly searchable by topic or verse",
    "Members get 24/7 answers cited to your pastor's exact teaching",
    "Visitors explore what your church believes before they ever visit",
    "Your archive becomes your most valuable discipleship tool",
  ],
};

const testimonials = [
  {
    quote:
      "Our congregation loves being able to ask questions and hear answers drawn directly from what we've actually taught from the pulpit. It's like giving every member a private appointment with the teaching team — any time, day or night.",
    name: "Zach Neumann",
    role: "Vicar",
    church: "Messiah Lutheran Church, Johns Creek",
    initial: "Z",
  },
  {
    quote:
      "Doctrinally.AI has quickly become part of how we disciple our people. Members are exploring sermons they missed, and visitors are getting a real sense of what we believe before they ever walk in the door. It's been a genuine gift to our church.",
    name: "Kostia Skorenkyi",
    role: "Pastor",
    church: "North Cross Church",
    initial: "K",
  },
];

const standardFeatures = [
  "Your own doctrinally.ai subdomain",
  "Up to 50 document uploads / month",
  "1,000 member questions / month",
  "Analytics dashboard",
  "Unlimited members",
  "Email support",
];

const enterpriseFeatures = [
  "Everything in Standard, plus:",
  "Use your own custom domain",
  "Your church's logo and branding",
  "100 document uploads / month",
  "2,000 member questions / month",
  "Priority support & onboarding",
];

const faqs = [
  {
    question: "Do I need technical skills to set this up?",
    answer:
      "No. If you can paste a YouTube link and drag a PDF, you can set up Doctrinally.AI. Most churches are fully live in under 5 minutes — our onboarding walks you through each step and we'll help over email if you get stuck.",
  },
  {
    question: "Do members need an account to use the chat?",
    answer:
      "Never. Members just scan the QR code or visit your link and start asking questions. Accounts are optional — they only enable saved chat history for members who want it.",
  },
  {
    question: "What types of content can I upload?",
    answer:
      "YouTube sermon videos (as links), video files, PDF documents, Word documents, and rich text documents created in our built-in editor. YouTube playlist uploads are coming soon — for now, just add videos one at a time.",
  },
  {
    question: "How does the AI stay 'on doctrine'?",
    answer:
      "Every answer is grounded in the content YOU upload — your sermons, your devotions, your teaching. The AI searches your content first and cites it directly. It's your pastor's voice, not a generic chatbot guessing at theology.",
  },
  {
    question: "What happens if I go over my monthly limits?",
    answer:
      "Nothing breaks. Overages are billed at $0.25 per additional upload and $0.25 per additional message — no surprise fees, no service interruptions. You can also upgrade to Enterprise any time.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There's no long-term contract. Cancel with one click from the billing page and you won't be charged again. You can also export your content at any time.",
  },
  {
    question: "Is my church's data private?",
    answer:
      "Yes. Every church's content is fully isolated — members of one church cannot access another church's data. All content is encrypted in transit and at rest.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes, on the Enterprise plan. Standard churches use a subdomain like yourchurch.doctrinally.ai; Enterprise churches can use ai.yourchurch.com with full custom branding.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Announcement bar */}
      <div className="border-b bg-primary/[0.04] text-foreground/85">
        <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-2 text-center text-xs sm:text-[13px]">
          <span className="relative flex h-2 w-2">
            <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-gold" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          <span className="font-medium">New:</span>
          <span className="text-muted-foreground">
            Go from signup to a live chat for your church in under 5 minutes
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

        <div className="container relative mx-auto grid gap-16 px-4 pb-24 pt-20 sm:pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pb-32 lg:pt-36">
          {/* Left column */}
          <div className="flex max-w-2xl flex-col justify-center">
            <div className="animate-fade-up stagger-1">
              <Badge
                variant="outline"
                className="h-auto rounded-full border-primary/20 bg-background/80 py-1.5 pl-1.5 pr-3 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/80 shadow-sm backdrop-blur"
              >
                <span className="mr-2 flex h-5 items-center rounded-full bg-gold/15 px-2 text-[10px] text-gold">
                  <Sparkles className="mr-1 h-3 w-3" /> New
                </span>
                Built for churches that teach the whole counsel of God
              </Badge>
            </div>

            <h1 className="animate-fade-up stagger-2 mt-7 font-heading text-[2.6rem] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[4.6rem]">
              <span className="text-gradient-ink">Every sermon.</span>
              <br />
              <span className="text-gradient-ink">Every verse.</span>
              <br />
              <span className="italic text-primary">Instantly answered.</span>
            </h1>

            <p className="animate-fade-up stagger-3 mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Doctrinally.AI turns your church&apos;s sermons, devotions, and
              documents into an AI assistant your congregation can ask anything
              &mdash; with citations back to{" "}
              <span className="font-semibold text-foreground">
                your pastor&apos;s own teaching
              </span>{" "}
              and the Bible.
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
              <Button
                size="lg"
                variant="ghost"
                className="h-12 px-5 text-[0.95rem] text-foreground/80 hover:text-foreground"
                render={<Link href="#how-it-works" />}
              >
                See how it works
              </Button>
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
            <div className="animate-fade-up stagger-6 mt-14 grid max-w-lg grid-cols-3 gap-0 divide-x divide-border/70 rounded-2xl border bg-card/40 px-1 py-5 shadow-sm backdrop-blur">
              {heroStats.map((s) => (
                <div key={s.label} className="px-4 text-center">
                  <div className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column – live chat preview */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-gold/10 blur-2xl" />
            <div className="animate-fade-up stagger-4 w-full max-w-lg">
              <HeroChatPreview />
            </div>
            {/* Floating badges */}
            <div className="pointer-events-none absolute -left-4 top-8 hidden rotate-[-4deg] rounded-xl border bg-background/90 px-3 py-2 text-[11px] shadow-lg backdrop-blur md:block">
              <div className="flex items-center gap-1.5 font-semibold">
                <Zap className="h-3 w-3 text-gold" /> Answers in seconds
              </div>
              <div className="text-[10px] text-muted-foreground">
                24/7, for every member
              </div>
            </div>
            <div className="pointer-events-none absolute -right-2 bottom-12 hidden rotate-[3deg] rounded-xl border bg-background/90 px-3 py-2 text-[11px] shadow-lg backdrop-blur md:block">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-3 w-3 text-primary" /> Cited to your sermons
              </div>
              <div className="text-[10px] text-muted-foreground">
                Grounded in your teaching
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BEFORE / AFTER ───────────────────────────────────── */}
      <section className="relative border-b py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              The problem
            </p>
            <h2 className="mt-4 font-heading text-4xl tracking-tight sm:text-5xl">
              Your best teaching{" "}
              <span className="italic text-primary">is invisible.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Years of faithful preaching — buried in a YouTube playlist nobody
              searches and a hard drive nobody opens.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-2">
            {/* Before card */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Before Doctrinally.AI
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
            <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-background to-gold/[0.05] p-8 shadow-xl shadow-primary/[0.04]">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                With Doctrinally.AI
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

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="border-b bg-card/30 py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              How it works
            </p>
            <h2 className="mt-4 font-heading text-4xl tracking-tight sm:text-5xl">
              From sermon archive to{" "}
              <span className="italic text-primary">searchable library</span>{" "}
              in under 5 minutes.
            </h2>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Add your sermons and documents",
                body: "Paste YouTube sermon links, drop in videos and PDFs, or write new devotions directly in our built-in editor.",
              },
              {
                step: "02",
                icon: Sparkles,
                title: "We do the heavy lifting",
                body: "Your content becomes searchable automatically — your pastor's teaching, ready for every question your congregation can ask.",
              },
              {
                step: "03",
                icon: MessageSquare,
                title: "Share a QR code",
                body: "Members scan, ask, and get cited answers 24/7 — no login required for them.",
              },
            ].map((s, i) => (
              <div
                key={s.step}
                className="group relative rounded-2xl border bg-background p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/[0.06]"
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

          <div className="mt-14 text-center">
            <Button size="lg" className="cta-ring h-12 px-7 font-semibold" render={<Link href="/sign-up" />}>
              Get set up in 5 minutes
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-3 text-[12px] text-muted-foreground">
              14 days free. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ─── BENTO FEATURES ───────────────────────────────────── */}
      <section id="features" className="border-b py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              Everything your church needs
            </p>
            <h2 className="mt-4 font-heading text-4xl tracking-tight sm:text-5xl">
              Built for preaching.{" "}
              <span className="italic text-primary">Not for chatbots.</span>
            </h2>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl auto-rows-[200px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {bentoFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/[0.05] ${
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
                  {/* Decorative corner for the big card */}
                  {f.accent && (
                    <div className="relative z-10 mt-6 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <Video className="h-3.5 w-3.5" />
                      <span>YouTube sermons</span>
                      <span className="text-border">·</span>
                      <FileText className="h-3.5 w-3.5" />
                      <span>PDFs & docs</span>
                      <span className="text-border">·</span>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Rich text editor</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS + METRICS ───────────────────────────── */}
      <section id="testimonials" className="border-b bg-card/30 py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              Real results from real churches
            </p>
            <h2 className="mt-4 font-heading text-4xl tracking-tight sm:text-5xl">
              Pastors call it the most useful tool{" "}
              <span className="italic text-primary">we&apos;ve added in a decade.</span>
            </h2>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="group flex flex-col rounded-2xl border bg-background p-8 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/[0.05]"
              >
                <Quote className="mb-4 h-7 w-7 text-gold/60" />
                <blockquote className="flex-1 text-base italic leading-relaxed text-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-4 border-t pt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-heading text-base text-primary">
                    {t.initial}
                  </div>
                  <div>
                    <div className="font-heading text-[0.95rem]">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.role}, {t.church}
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────── */}
      <section
        id="pricing"
        className="parchment-texture relative border-b py-28"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.025] to-background" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              Transparent pricing
            </p>
            <h2 className="mt-4 font-heading text-4xl tracking-tight sm:text-5xl">
              Less than the cost of{" "}
              <span className="italic text-primary">one Sunday lunch.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              No setup fees. No contracts. 14-day free trial on every plan.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-2">
            {/* Standard */}
            <div className="relative flex flex-col rounded-2xl border bg-background p-8 shadow-sm">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                For growing churches
              </div>
              <h3 className="font-heading text-2xl tracking-tight">Standard</h3>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-heading text-5xl tracking-tight">
                  $49
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                That&apos;s <span className="font-semibold text-foreground">$1.63/day</span> — less than your church&apos;s coffee budget.
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
            <div className="relative flex flex-col overflow-visible rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-primary/[0.04] via-background to-gold/[0.06] p-8 shadow-2xl shadow-primary/[0.08]">
              <div className="absolute -top-3 left-8">
                <Badge className="rounded-full border border-gold/50 bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-foreground shadow-md">
                  Most popular · Save 40%
                </Badge>
              </div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
                For established churches
              </div>
              <h3 className="font-heading text-2xl tracking-tight">
                Enterprise
              </h3>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-heading text-5xl tracking-tight">
                  $99
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Custom branding, 2× content, 2× messages, your own domain.
              </p>

              <ul className="mt-7 space-y-3.5">
                {enterpriseFeatures.map((f, i) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2.5 text-[0.92rem] ${
                      i === 0 ? "font-semibold text-foreground" : ""
                    }`}
                  >
                    {i === 0 ? (
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    ) : (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    )}
                    <span className={i === 0 ? "" : "text-foreground/90"}>
                      {f}
                    </span>
                  </li>
                ))}
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
              is less than one hour of a pastor&apos;s salary &mdash; and saves
              you that many hours{" "}
              <span className="italic">every week.</span>
            </p>
          </div>

          <p className="mx-auto mt-6 max-w-lg text-center text-[12px] text-muted-foreground">
            Over your limit? Just $0.25 per extra upload and $0.25 per extra
            message. No surprises.
          </p>
        </div>
      </section>

      {/* ─── GUARANTEE / RISK REVERSAL ────────────────────────── */}
      <section className="border-b py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-background to-primary/[0.04] p-10 text-center md:flex-row md:text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-background shadow-inner">
              <ShieldCheck className="h-10 w-10 text-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-2xl tracking-tight sm:text-3xl">
                Free for 14 days. Keep your content forever.
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
                Try every feature free for two weeks. If it&apos;s not a fit,
                cancel in one click &mdash; and you can export every document
                you uploaded. No hostage situations.
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

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="border-b py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              FAQ
            </p>
            <h2 className="mt-4 font-heading text-4xl tracking-tight sm:text-5xl">
              Questions, answered.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Still unsure? Email us anytime — we answer every message
              personally.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-3xl space-y-3">
            {faqs.map((faq, i) => (
              <details
                key={faq.question}
                className="group rounded-xl border bg-card/40 p-5 transition-colors open:bg-card/80 hover:bg-card/60"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[0.98rem] font-medium text-foreground">
                  <span>{faq.question}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="mt-4 pr-8 text-[0.92rem] leading-relaxed text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center justify-center gap-4">
            <Button
              size="lg"
              className="cta-ring h-12 px-7 font-semibold"
              render={<Link href="/sign-up" />}
            >
              Start your free trial
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-gold" /> 14 days free
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-gold" /> Cancel anytime
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-gold" /> Export your data
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="parchment-texture relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.06] to-background" />
        <div className="ember-glow" aria-hidden />
        <div className="container relative mx-auto flex flex-col items-center gap-8 px-4 py-32 text-center">
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"
          >
            <Users className="mr-2 h-3 w-3 text-gold" />
            Built for pastors, teaching teams, and their congregations
          </Badge>

          <h2 className="max-w-3xl font-heading text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-gradient-ink">Your archive is waiting.</span>
            <br />
            <span className="italic text-primary">
              Let your church ask it anything.
            </span>
          </h2>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Add your first sermon in the next five minutes. Watch your
            congregation discover years of teaching they never knew existed.
          </p>

          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="cta-ring h-14 px-9 text-base font-semibold"
              render={<Link href="/sign-up" />}
            >
              Start your 14-day free trial
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-14 px-6 text-[0.95rem] text-foreground/80 hover:text-foreground"
              render={<Link href="#pricing" />}
            >
              See pricing
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-gold" /> 14 days free
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-gold" /> Live in under 5
              minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-gold" /> Cancel anytime
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
