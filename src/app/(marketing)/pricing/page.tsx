import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/marketing/page-hero";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { CTASection } from "@/components/marketing/cta-section";
import { standardFeatures, enterpriseFeatures, faqs } from "@/content/marketing/data";

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
                Your AI on your own domain, with your church&apos;s branding and 2x the capacity.
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
                    <span className={i === 0 ? "" : "text-foreground/90"}>{f}</span>
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
              for an AI trained on your church &mdash; and it answers the
              questions{" "}
              <span className="italic">your pastors would be answering anyway.</span>
            </p>
          </div>

          <p className="mx-auto mt-6 max-w-lg text-center text-[12px] text-muted-foreground">
            Message limits are enforced by default &mdash; you&apos;ll never be
            charged for overages unless you opt in. If enabled, extra messages
            are just $0.25 each with a cap you control.
          </p>
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
