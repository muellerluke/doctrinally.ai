"use client";

import { useEffect, useState } from "react";
import { Sparkles, PenLine, BookOpen, ArrowUp } from "lucide-react";

/**
 * Animated desktop-style mock of the Sermon AI workspace.
 *
 * Visual identity vs. the member <HeroChatPreview>:
 *   - Wider, landscape-oriented frame (desktop app feel, not phone)
 *   - Left pane: assistant chat; right pane: a sermon being drafted
 *   - Gold accent band + "Enterprise" badge tie to the Sermon AI brand
 *   - Subtle outline → fill animation reveals the sermon taking shape,
 *     mirroring the real workspace where the editor populates alongside
 *     the conversation.
 *
 * Pure CSS animations (no JS motion libs). Respects prefers-reduced-motion
 * via the global `@media (prefers-reduced-motion)` override already set in
 * `globals.css` — we only animate opacity/transform so the fallback is
 * that everything simply appears.
 */
export function SermonPreview() {
  // Staggered reveal state — mounts the three editor blocks one at a time.
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setStage(3);
      return;
    }
    const timers = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="group relative mx-auto w-full max-w-2xl">
      {/* Gold glow backdrop — distinguishes Sermon AI from the brown chat preview. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--gold) 0%, transparent 70%)",
        }}
      />

      {/* Window chrome */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-primary/[0.08] transition-transform duration-300 group-hover:-translate-y-0.5">
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-gold" />
            <span>Sermon · Psalm 23 · draft</span>
            <span className="text-muted-foreground/50">· auto-saved</span>
          </div>
          <span className="rounded-md border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
            Enterprise
          </span>
        </div>

        {/* Split pane */}
        <div className="grid grid-cols-5 text-xs">
          {/* Left: chat pane */}
          <div className="col-span-2 flex h-[320px] flex-col border-r bg-muted/20">
            <div className="flex items-center gap-1.5 border-b px-3 py-2 text-[10px] font-semibold text-muted-foreground">
              <Sparkles className="h-3 w-3 text-gold" />
              Assistant
            </div>
            <div className="flex-1 space-y-2.5 overflow-hidden px-3 py-3">
              {/* User turn */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg rounded-br-sm bg-primary px-2.5 py-1.5 text-[11px] leading-snug text-primary-foreground">
                  Draft a Psalm 23 sermon the way Pastor Mike usually frames
                  comfort texts.
                </div>
              </div>
              {/* Assistant turn */}
              <div className="max-w-[92%] text-[11px] leading-relaxed text-foreground/80">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gold">
                  Suggested outline
                </p>
                <ol className="mt-1 list-decimal space-y-1 pl-4 marker:text-gold">
                  <li>The shepherd who already knows you</li>
                  <li>Green pastures aren&apos;t just rest — they&apos;re trust</li>
                  <li>Walking through, not around, the valley</li>
                </ol>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Pulled from{" "}
                  <span className="underline decoration-gold/60 decoration-dotted underline-offset-2">
                    Sermon · Jan 14
                  </span>{" "}
                  and{" "}
                  <span className="underline decoration-gold/60 decoration-dotted underline-offset-2">
                    Devo · &ldquo;Quiet waters&rdquo;
                  </span>
                </p>
              </div>
            </div>
            {/* Input */}
            <div className="border-t px-3 py-2">
              <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
                <span className="flex-1 truncate text-[10px] text-muted-foreground/60">
                  Expand point 2 with a John 10 reference…
                </span>
                <div className="flex h-4 w-4 items-center justify-center rounded bg-primary">
                  <ArrowUp className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: editor pane */}
          <div className="col-span-3 flex h-[320px] flex-col">
            <div className="flex items-center justify-between border-b px-3 py-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold">
                <PenLine className="h-3 w-3 text-primary" />
                Editor
              </div>
              <button className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                Publish →
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-hidden px-4 py-3">
              {/* H1 */}
              <div
                className="font-heading text-[18px] leading-tight text-foreground transition-opacity duration-500"
                style={{ opacity: stage >= 1 ? 1 : 0 }}
              >
                The Shepherd Who Already Knows You
              </div>
              {/* Series + tag */}
              <div
                className="flex items-center gap-2 text-[10px] text-muted-foreground transition-opacity duration-500"
                style={{ opacity: stage >= 1 ? 1 : 0 }}
              >
                <span className="rounded border bg-muted px-1.5 py-0.5">
                  Series · Psalms of Comfort
                </span>
                <span>·</span>
                <span>Sunday, May 18</span>
              </div>
              {/* Paragraph */}
              <p
                className="text-[11px] leading-relaxed text-foreground/80 transition-opacity duration-500"
                style={{ opacity: stage >= 2 ? 1 : 0 }}
              >
                David doesn&apos;t open Psalm 23 with a request. He opens with a
                relationship — <em>the Lord is my shepherd</em>. Before any
                valley, before any table, there&apos;s a shepherd who already
                knows his name…
              </p>
              {/* Scripture blockquote */}
              <div
                className="flex gap-2 rounded-md border-l-2 border-gold bg-gold/5 px-2.5 py-2 transition-all duration-500"
                style={{
                  opacity: stage >= 3 ? 1 : 0,
                  transform: stage >= 3 ? "translateY(0)" : "translateY(6px)",
                }}
              >
                <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                <div className="text-[10.5px] leading-snug text-foreground/85">
                  <div className="italic">
                    &ldquo;Even though I walk through the darkest valley, I will
                    fear no evil, for you are with me.&rdquo;
                  </div>
                  <div className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                    Psalm 23:4 (NIV)
                  </div>
                </div>
              </div>
            </div>
            {/* Footer status */}
            <div
              className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-[9px] text-muted-foreground transition-opacity duration-500"
              style={{ opacity: stage >= 3 ? 1 : 0 }}
            >
              <span>3 citations · 612 words · 14 min</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                Drafting…
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Caption ribbon tying to member chat */}
      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-gold" />
        <span>
          Publish, and your members&apos; chat cites it the same day.
        </span>
      </div>
    </div>
  );
}
