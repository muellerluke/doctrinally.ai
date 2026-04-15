import Link from "next/link";
import { ArrowRight, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CTASectionProps {
  headline?: React.ReactNode;
  description?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CTASection({
  headline,
  description,
  secondaryHref = "/pricing",
  secondaryLabel = "See pricing",
}: CTASectionProps) {
  return (
    <section className="parchment-texture relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.06] to-background" />
      <div className="ember-glow" aria-hidden />
      <div className="container relative mx-auto flex flex-col items-center gap-8 px-4 py-24 text-center sm:py-32">
        <Badge
          variant="outline"
          className="max-w-full rounded-full border-primary/20 bg-background/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur sm:text-[11px]"
        >
          <Users className="mr-2 h-3 w-3 shrink-0 text-gold" />
          <span className="sm:hidden">Your church&apos;s own AI</span>
          <span className="hidden sm:inline">
            A custom AI for pastors, teaching teams, and their congregations
          </span>
        </Badge>

        <h2 className="max-w-3xl font-heading text-[2.1rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          {headline || (
            <>
              <span className="text-gradient-ink">Give your church</span>
              <br />
              <span className="italic text-primary">
                an AI it can call its own.
              </span>
            </>
          )}
        </h2>

        {description && (
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        )}
        {!description && (
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Launch your church&apos;s custom AI in the next five minutes. Let
            your congregation ask anything &mdash; and hear your pastor&apos;s
            voice answer back.
          </p>
        )}

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
            render={<Link href={secondaryHref} />}
          >
            {secondaryLabel}
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-gold" /> 14 days free
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-gold" /> Live in under 5 minutes
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-gold" /> Cancel anytime
          </span>
        </div>
      </div>
    </section>
  );
}
