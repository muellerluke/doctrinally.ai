import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { faqs } from "@/content/marketing/data";

export const metadata: Metadata = {
  title: "FAQ — Doctrinally.AI",
  description:
    "Frequently asked questions about Doctrinally.AI — setup, pricing, content types, privacy, and how it compares to ChatGPT.",
  alternates: { canonical: "https://www.doctrinally.ai/faq" },
};

export default function FAQPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Questions, <span className="italic text-primary">answered.</span>
          </>
        }
        description="Everything you need to know about Doctrinally.AI. Still unsure? Email us anytime — we answer every message personally."
      />

      {/* ─── FAQ List ─────────────────────────────────────────────── */}
      <section className="border-b py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <FAQAccordion faqs={faqs} />
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

      {/* ─── Contact CTA ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl tracking-tight sm:text-3xl">
            Still have questions?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            We answer every email personally. Reach out and we&apos;ll help you
            figure out if Doctrinally.AI is the right fit for your church.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-7"
              render={
                <a href="mailto:hello@doctrinally.ai" />
              }
            >
              Email us
            </Button>
            <Button
              size="lg"
              className="cta-ring h-12 px-7 font-semibold"
              render={<Link href="/sign-up" />}
            >
              Start your 14-day free trial
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
