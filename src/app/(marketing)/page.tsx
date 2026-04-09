import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  Upload,
  BarChart3,
  ArrowRight,
  Search,
  Zap,
  Shield,
  BookOpen,
  Users,
  Lock,
  Globe,
  Check,
  Quote,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroChatPreview } from "@/components/marketing/hero-chat-preview";
import { ContactForm } from "@/components/marketing/contact-form";
import { StatsCounter } from "@/components/marketing/stats-counter";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export const metadata: Metadata = {
  title:
    "AI Chat for Churches — Your Sermons, Always Available | Doctrinally.AI",
  description:
    "Turn your church's sermons, devotions, and documents into an AI assistant. Members ask questions and get cited answers from Scripture and your teachings. Free trial — no credit card required.",
  alternates: { canonical: "https://www.doctrinally.ai" },
};

/* ── data ──────────────────────────────────────────────── */

const painPoints = [
  {
    stat: "15+",
    label: "hours per week",
    description:
      "You invest in sermon preparation. That teaching has lasting value — but only if people can access it later.",
  },
  {
    stat: "~80%",
    label: "forgotten in 48 hours",
    description:
      "Research shows most sermon content is forgotten within two days — not because it wasn't impactful, but because memory fades.",
  },
  {
    stat: "0",
    label: "ways to search it",
    description:
      "Your best teachings sit buried in YouTube playlists, PDF archives, and old sermon notes that nobody can find.",
  },
];

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload your content",
    description:
      "Sermons, devotions, YouTube videos, PDFs, Word docs — or create new content in our built-in editor. We handle the rest.",
  },
  {
    number: "02",
    icon: Zap,
    title: "AI indexes everything",
    description:
      "Our system transcribes audio, extracts text, chunks content, and indexes it alongside the full Bible — automatically.",
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Your congregation asks questions",
    description:
      "Share a link or QR code. Members get instant, cited answers grounded in your teaching and Scripture.",
  },
];

const benefits = [
  {
    icon: BookOpen,
    title: "Never lose a teaching again",
    description:
      "Every sermon, devotion, and document you upload becomes permanently searchable. Years of teaching, always available.",
  },
  {
    icon: Search,
    title: "Always cited, always grounded",
    description:
      "Every answer includes citations back to your specific sermon, document, or Bible passage. No hallucinated theology.",
  },
  {
    icon: BarChart3,
    title: "Know what your flock needs",
    description:
      "See what your congregation asks about most. Identify topics where more teaching would make a difference.",
  },
  {
    icon: Users,
    title: "No login required for members",
    description:
      "Just share a link or put a QR code in your bulletin. Members start chatting immediately — no account needed.",
  },
  {
    icon: Lock,
    title: "Private and secure",
    description:
      "Each church's content is fully isolated. Your data is encrypted and never shared with other churches.",
  },
  {
    icon: Globe,
    title: "Your brand, your domain",
    description:
      "Use your own domain and branding on the Enterprise plan, or start with a clean subdomain on Standard.",
  },
];

const testimonials = [
  {
    quote:
      "We uploaded our entire YouTube sermon playlist. By the next morning, our members could search 3 years of teaching. The first question someone asked? 'What has Pastor James said about grief?' — and the answer was perfect.",
    name: "Sarah Mitchell",
    role: "Church Administrator",
    church: "Grace Community Church",
  },
  {
    quote:
      "We put a QR code in our bulletin every Sunday. Last month, over 200 members used it to revisit sermon topics during the week. Our small group leaders say discussions have never been richer.",
    name: "David Chen",
    role: "Lead Pastor",
    church: "New Life Fellowship",
  },
  {
    quote:
      "Setup took less than an hour. We went from 'this sounds interesting' to 'our congregation is using it' in a single afternoon. The AI even handles Spanish-language questions from our bilingual members.",
    name: "Maria Gonzalez",
    role: "Worship Director",
    church: "Iglesia de la Esperanza",
  },
];

const standardFeatures = [
  "Subdomain on doctrinally.ai",
  "Up to 50 document uploads / month",
  "1,000 messages / month",
  "Doctrinally.AI branding",
  "Analytics dashboard",
  "Email support",
];

const enterpriseFeatures = [
  "Custom domain (ai.yourchurch.com)",
  "Up to 100 document uploads / month",
  "2,000 messages / month",
  "Your own logo and branding",
  "Priority support",
  "Everything in Standard",
];

const faqs = [
  {
    question: "Do members need to create an account to use the chat?",
    answer:
      "No. Members can start chatting immediately without logging in — just share a link or QR code. If they choose to create an account, their conversation history is saved so they can return to previous questions.",
  },
  {
    question: "What types of content can I upload?",
    answer:
      "YouTube videos (automatically transcribed), video files, PDF documents, Word documents, and rich text documents created in our built-in editor. Everything is processed and indexed automatically.",
  },
  {
    question: "How does the AI know what to cite?",
    answer:
      "Every piece of content you upload is chunked and indexed using both keyword and semantic search. When a member asks a question, the AI retrieves the most relevant passages and cites them directly — including timestamps for videos and page references for documents.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes, with the Enterprise plan. Standard plan churches use a subdomain like mychurch.doctrinally.ai. Enterprise churches can use their own domain like ai.mychurch.com with their own branding.",
  },
  {
    question: "What happens if I exceed my monthly limits?",
    answer:
      "You can continue using the platform without interruption. Overages are billed at $0.25 per additional document upload and $0.25 per additional message — no surprise charges.",
  },
  {
    question: "Is my church's data secure?",
    answer:
      "Absolutely. Each church's data is fully isolated — members of one church cannot access another church's content. All data is encrypted in transit and at rest, and we never use your content to train AI models.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most churches are live within 10 minutes. Upload your content, and our AI begins indexing immediately. YouTube playlists can be imported in bulk, so even large sermon libraries are ready quickly.",
  },
  {
    question: "Can I try it before committing?",
    answer:
      "Yes. Every plan starts with a free 14-day trial — no credit card required. You can upload content, test the AI chat, and see how your congregation responds before paying anything.",
  },
];

/* ── page ──────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── HERO ────────────────────────────────────────── */}
      <section className="parchment-texture relative overflow-hidden border-b">
        {/* background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-gold/[0.04]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_-20%,_var(--tw-gradient-stops))] from-gold/[0.10] via-transparent to-transparent" />
        {/* decorative gothic arches */}
        <div className="absolute right-0 top-0 hidden opacity-[0.03] lg:block">
          <svg
            width="460"
            height="680"
            viewBox="0 0 460 680"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M30 680V240C30 107 230 0 230 0S430 107 430 240V680"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M80 680V270C80 160 230 70 230 70S380 160 380 270V680"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M130 680V300C130 210 230 140 230 140S330 210 330 300V680"
              stroke="currentColor"
              strokeWidth="0.75"
            />
          </svg>
        </div>

        <div className="container relative mx-auto grid items-center gap-12 px-4 py-20 sm:py-28 lg:grid-cols-2 lg:gap-16 lg:py-36">
          {/* left – copy */}
          <div className="max-w-xl space-y-7">
            <div className="animate-fade-up stagger-1">
              <Badge
                variant="outline"
                className="border-gold/30 bg-gold/[0.08] px-4 py-1.5 text-sm font-normal text-gold"
              >
                <img
                  src="/logo-light-mode.png"
                  alt=""
                  className="mr-1.5 h-3.5 w-3.5 rounded-sm dark:hidden"
                />
                <img
                  src="/logo-dark-mode.png"
                  alt=""
                  className="mr-1.5 hidden h-3.5 w-3.5 rounded-sm dark:block"
                />
                Trusted by 50+ churches
              </Badge>
            </div>

            <h1 className="animate-fade-up stagger-2 font-heading text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Your congregation has questions
              <span className="block text-primary">between Sundays.</span>
            </h1>

            <p className="animate-fade-up stagger-3 text-lg leading-relaxed text-muted-foreground">
              Doctrinally.AI turns your sermons, devotions, and documents into an
              always-available AI assistant — so your members get instant, cited
              answers grounded in your teaching and Scripture.
            </p>

            <div className="animate-fade-up stagger-4 flex flex-col gap-3 pt-1 sm:flex-row">
              <Button size="lg" render={<Link href="/sign-up" />}>
                Start your free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="#how-it-works" />}
              >
                See how it works
              </Button>
            </div>

            <div className="animate-fade-in stagger-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-gold" />
                Free 14-day trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-gold" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-gold" />
                Live in 10 minutes
              </span>
            </div>
          </div>

          {/* right – chat preview */}
          <div className="animate-fade-up stagger-4 flex justify-center lg:justify-end">
            <HeroChatPreview />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────────────── */}
      <section className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-14">
          <StatsCounter />
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-24 sm:py-28">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              The problem
            </p>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
              The gap between Sundays
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              You invest deeply in every sermon. Your teachings are rich,
              grounded, and relevant.&nbsp;But after Sunday, here&apos;s what
              happens:
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
          {painPoints.map((point, i) => (
            <ScrollReveal key={point.stat} delay={i * 120}>
              <div className="rounded-2xl border bg-card p-8 text-center shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="font-heading text-5xl tracking-tight text-primary">
                  {point.stat}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-gold">
                  {point.label}
                </div>
                <p className="mt-4 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <p className="mx-auto mt-16 max-w-md text-center font-heading text-2xl leading-snug sm:text-3xl">
            What if none of that teaching was ever lost?
          </p>
        </ScrollReveal>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section id="how-it-works" className="border-y bg-card">
        <div className="container mx-auto px-4 py-24 sm:py-28">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
                How it works
              </p>
              <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
                Live in under 10 minutes
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Three steps. That&apos;s all it takes to make your entire
                teaching library searchable.
              </p>
            </div>
          </ScrollReveal>

          <div className="mx-auto mt-16 grid max-w-5xl gap-12 lg:grid-cols-3">
            {steps.map((step, i) => (
              <ScrollReveal key={step.number} delay={i * 150}>
                <div className="relative text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="mb-2 block font-heading text-sm text-gold">
                    Step {step.number}
                  </span>
                  <h3 className="mb-3 font-heading text-xl">{step.title}</h3>
                  <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* connector arrows (desktop) */}
          <div className="mx-auto mt-4 hidden max-w-5xl lg:block">
            <div className="flex justify-around px-24">
              <ArrowRight className="h-5 w-5 text-gold/40" />
              <ArrowRight className="h-5 w-5 text-gold/40" />
            </div>
          </div>

          <ScrollReveal delay={500}>
            <div className="mx-auto mt-12 flex justify-center">
              <Button size="lg" render={<Link href="/sign-up" />}>
                Start your free trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FEATURES / BENEFITS ─────────────────────────── */}
      <section id="features" className="container mx-auto px-4 py-24 sm:py-28">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              Why churches choose us
            </p>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
              Built for the way churches actually work
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Not another generic chatbot. Doctrinally.AI is purpose-built for
              churches — with features designed around how your congregation
              actually interacts with teaching.
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, i) => (
            <ScrollReveal key={benefit.title} delay={i * 80}>
              <div className="group h-full rounded-xl border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lg hover:shadow-gold/[0.06]">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-heading text-lg">{benefit.title}</h3>
                <p className="text-[0.9rem] leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────── */}
      <section className="parchment-texture relative border-y bg-gradient-to-b from-primary/[0.03] to-transparent">
        <div className="container relative mx-auto px-4 py-24 sm:py-28">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
                What churches are saying
              </p>
              <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
                Real churches. Real results.
              </h2>
            </div>
          </ScrollReveal>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 120}>
                <Card className="relative h-full shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex h-full flex-col pt-8">
                    <Quote className="mb-4 h-6 w-6 text-gold/50" />
                    <p className="mb-6 flex-1 text-[0.95rem] italic leading-relaxed text-muted-foreground">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="border-t pt-4">
                      <p className="font-heading text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role}, {t.church}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────── */}
      <section id="pricing" className="container mx-auto px-4 py-24 sm:py-28">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              Pricing
            </p>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
              Simple pricing. No surprises.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Start with a free 14-day trial on either plan. No credit card
              required.
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto mt-16 grid max-w-4xl gap-8 lg:grid-cols-2">
          {/* Standard */}
          <ScrollReveal delay={0}>
            <Card className="relative h-full shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-2xl">
                  Standard
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-4xl">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Less than $1.65/day
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {standardFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant="outline"
                  render={<Link href="/sign-up" />}
                >
                  Start free trial
                </Button>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Enterprise */}
          <ScrollReveal delay={150}>
            <Card className="relative h-full overflow-visible border-gold/30 shadow-lg shadow-gold/[0.06]">
              <div className="absolute -top-3 right-6">
                <Badge className="border-gold/30 bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">
                  Most popular
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-2xl">
                  Enterprise
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-4xl">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Less than $3.30/day
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {enterpriseFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  render={<Link href="/sign-up" />}
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={300}>
          <p className="mx-auto mt-8 max-w-md text-center text-sm text-muted-foreground">
            Need more? Overages are simple: $0.25/document and $0.25/message
            beyond your plan limits.
          </p>
        </ScrollReveal>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section id="faq" className="border-t bg-card">
        <div className="container mx-auto px-4 py-24 sm:py-28">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
                FAQ
              </p>
              <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
                Questions? We&apos;ve got answers.
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className="mx-auto mt-14 max-w-3xl">
              <FaqAccordion items={faqs} />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────── */}
      <section id="contact" className="container mx-auto px-4 py-24 sm:py-28">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              Contact
            </p>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
              Want to talk first?
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Have questions about how Doctrinally.AI would work for your church?
              We&apos;d love to hear from you.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <div className="mx-auto mt-12 max-w-lg">
            <ContactForm />
            <div className="mt-6 flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Austin, TX</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-t bg-foreground text-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_110%,_var(--tw-gradient-stops))] from-gold/20 via-transparent to-transparent" />
        <div className="container relative mx-auto flex flex-col items-center gap-6 px-4 py-24 text-center sm:py-28">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl">
            Ready to make every sermon count?
          </h2>
          <p className="max-w-xl text-lg opacity-70">
            Join 50+ churches already using Doctrinally.AI. Set up in minutes,
            not days.
          </p>
          <Button
            size="lg"
            className="bg-background text-foreground shadow-lg hover:bg-background/90"
            render={<Link href="/sign-up" />}
          >
            Start your free trial
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-sm opacity-50">
            Free 14-day trial &middot; No credit card required &middot; Cancel
            anytime
          </p>
        </div>
      </section>
    </div>
  );
}
