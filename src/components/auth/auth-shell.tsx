import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

export interface AuthStep {
  label: string;
  description: string;
}

interface AuthShellProps {
  children: ReactNode;
  aside: ReactNode;
  steps?: AuthStep[];
  currentStep?: number;
  trustBar?: ReactNode;
}

/**
 * Split-pane chrome shared by sign-in, sign-up, and onboarding. The left
 * column holds the form; the right column is a marketing slot that rotates
 * content per step so the funnel feels less like a brick wall.
 *
 * On small screens the right column collapses — mobile users see just the
 * form with a lightweight progress strip on top.
 */
export function AuthShell({
  children,
  aside,
  steps,
  currentStep,
  trustBar,
}: AuthShellProps) {
  return (
    <div className="parchment-texture relative min-h-screen bg-gradient-to-br from-primary/[0.05] via-background to-gold/[0.05]">
      {/* Atmosphere: soft ember glow + dotted texture behind content */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] bg-dots"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-[-10%] h-[55%] opacity-70">
        <div className="ember-glow !inset-0 !h-full" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[55%_45%]">
        {/* ── Left: brand + form ─────────────────────────────────────── */}
        <div className="flex flex-col px-4 py-8 sm:px-10 sm:py-12">
          <Link
            href="/"
            className="relative flex items-center gap-2.5 self-start"
          >
            <img
              src="/logo-light-mode.png"
              alt="Doctrinally.AI"
              className="h-9 w-9 dark:hidden"
            />
            <img
              src="/logo-dark-mode.png"
              alt="Doctrinally.AI"
              className="hidden h-9 w-9 dark:block"
            />
            <span className="font-heading text-xl tracking-tight">
              Doctrinally.AI
            </span>
          </Link>

          {steps && steps.length > 0 && typeof currentStep === "number" && (
            <StepIndicator steps={steps} currentStep={currentStep} />
          )}

          <div className="flex flex-1 items-center">
            <div className="w-full max-w-md">{children}</div>
          </div>

          {trustBar ?? <DefaultTrustBar />}
        </div>

        {/* ── Right: marketing / preview ────────────────────────────── */}
        <aside className="relative hidden overflow-hidden border-l border-border/60 bg-gradient-to-br from-primary/[0.04] via-background to-gold/[0.08] lg:flex lg:flex-col">
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
          <div className="relative flex flex-1 flex-col justify-center px-10 py-12 xl:px-14">
            {aside}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: AuthStep[];
  currentStep: number;
}) {
  return (
    <div className="mt-8 max-w-md">
      <div className="flex items-center gap-2">
        {steps.map((_, i) => {
          const active = i <= currentStep;
          return (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                active ? "bg-primary" : "bg-border/60"
              }`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-baseline justify-between text-[11px]">
        <span className="font-semibold uppercase tracking-wider text-primary">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-muted-foreground">
          {steps[currentStep]?.label}
        </span>
      </div>
    </div>
  );
}

function DefaultTrustBar() {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
        14-day free trial · no charge until day 14
      </span>
      <span aria-hidden>·</span>
      <span>Cancel anytime</span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        Trained on your teaching
      </span>
    </div>
  );
}
