import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { threeProducts } from "@/content/marketing/data";
import { cn } from "@/lib/utils";

/**
 * Home + /features page primary framing: Website Chat is the flagship
 * product, with Member AI and Sermon AI as siblings sharing the same
 * content library. Website Chat (gold, first card) is the surface most
 * visitors will meet before Sunday — it's how a church gets prospects
 * from its existing website. Member AI and Sermon AI are also included
 * on every plan, framed here as additional places the same library
 * shows up.
 */
export function ThreeProductsSection() {
  return (
    <section className="relative overflow-hidden border-b py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-8 -z-10 h-[70%] w-[80%] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--gold) 0%, transparent 70%)",
        }}
      />
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
            One library, three places it shows up
          </p>
          <h2 className="mt-4 font-heading text-[1.75rem] tracking-tight sm:text-5xl">
            Built for the visitor who hasn&rsquo;t{" "}
            <span className="italic text-primary">walked in yet.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Your Website Chat is where most people will meet your church before
            Sunday. The same library powers Member AI for your congregation and
            Sermon AI for your pastor &mdash; all included on every plan.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
          {threeProducts.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-background p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                p.accent === "gold"
                  ? "border-gold/40 bg-gradient-to-br from-gold/[0.05] via-background to-primary/[0.03] shadow-lg shadow-gold/10"
                  : "hover:shadow-primary/[0.06]"
              )}
            >
              {p.accent === "gold" && (
                <span className="absolute right-5 top-5 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                  Flagship
                </span>
              )}
              <div
                className={cn(
                  "mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  p.accent === "gold"
                    ? "border border-gold/40 bg-gold/10 text-gold"
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                )}
              >
                <p.icon className="h-5 w-5" />
              </div>
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.22em]",
                  p.accent === "gold" ? "text-gold" : "text-muted-foreground"
                )}
              >
                {p.kicker}
              </p>
              <h3 className="mt-2 font-heading text-2xl leading-tight">
                {p.title}
              </h3>
              <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-muted-foreground">
                {p.description}
              </p>
              <div
                className={cn(
                  "mt-5 inline-flex items-center gap-1.5 text-sm font-semibold",
                  p.accent === "gold" ? "text-gold" : "text-primary"
                )}
              >
                Learn more
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
