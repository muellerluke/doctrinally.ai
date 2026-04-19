import { CheckCircle2, Quote, Sparkles, Video, Folder, Rss } from "lucide-react";
import { sermonAiTestimonial } from "@/content/marketing/data";

/**
 * "Why Doctrinally.AI" pane for the sign-up page. Warm, quiet, testimony-
 * first — leans on brand voice rather than feature bullets so new visitors
 * feel the product's personality before they type a password.
 */
export function SignUpAside() {
  const { quote, name, role, church, initial } = sermonAiTestimonial;
  return (
    <div className="space-y-8 animate-fade-up stagger-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
        <Sparkles className="h-3 w-3" />
        Built for churches
      </div>

      <blockquote className="space-y-4">
        <Quote className="h-8 w-8 text-primary/40" />
        <p className="font-heading text-xl leading-relaxed text-foreground/90">
          “{quote}”
        </p>
        <footer className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-heading text-primary">
            {initial}
          </div>
          <div>
            <div className="text-sm font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">
              {role} · {church}
            </div>
          </div>
        </footer>
      </blockquote>

      <div className="grid grid-cols-1 gap-3 pt-2">
        <FeatureRow
          icon={Video}
          title="Citations that play"
          body="Sermons embed inline. Videos jump to the exact moment. PDFs link to the page."
        />
        <FeatureRow
          icon={Rss}
          title="Your whole YouTube channel, synced"
          body="Paste one URL. We pull every sermon, short, live replay, and playlist — and keep it fresh every week."
          accent
        />
        <FeatureRow
          icon={CheckCircle2}
          title="Share with a QR code"
          body="Drop it on Sunday's bulletin. Members scan and ask — no login required."
        />
      </div>
    </div>
  );
}

/**
 * Onboarding step 1 aside: mini-browser preview of the church subdomain
 * so the URL choice feels real, not abstract.
 */
export function OnboardingChurchAside({
  name,
  slug,
  appDomain,
}: {
  name: string;
  slug: string;
  appDomain: string;
}) {
  const shown = slug || "yourchurch";
  const displayName = name || "Your Church";
  return (
    <div className="space-y-6 animate-fade-up stagger-1">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/80">
          Your church, online
        </div>
        <h3 className="mt-1 font-heading text-3xl leading-tight">
          {shown}.{appDomain}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This is the URL your members will see. You can wire up your own
          domain later on Enterprise.
        </p>
      </div>

      {/* Mini browser chrome */}
      <div className="overflow-hidden rounded-xl border bg-background shadow-2xl shadow-primary/[0.06]">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          <div className="ml-2 flex-1 truncate rounded-md bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
            {shown}.{appDomain}/chat
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10" />
            <div className="font-heading text-sm">{displayName}</div>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed">
              What does our church believe about communion?
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-relaxed">
              Pastor John taught on this in{" "}
              <span className="font-semibold text-primary">Luke 22 &nbsp;·&nbsp; Mar 3, 2025</span>
              . He emphasized…
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingPlanAside({ plan }: { plan: "standard" | "enterprise" }) {
  const isEnterprise = plan === "enterprise";
  return (
    <div className="space-y-6 animate-fade-up stagger-1">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/80">
          What you&rsquo;re picking
        </div>
        <h3 className="mt-1 font-heading text-3xl leading-tight">
          {isEnterprise ? "Enterprise" : "Standard"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          14-day free trial. No card charged today.
        </p>
      </div>

      <ul className="space-y-2.5 text-sm">
        {(isEnterprise
          ? [
              "Auto-sync your entire YouTube channel, weekly",
              "Custom domain + your own branding",
              "3,000 member questions / month",
              "Sermon AI — draft alongside you",
              "Priority support & onboarding",
            ]
          : [
              "Your own doctrinally.ai subdomain",
              "1,500 member questions / month",
              "Unlimited document uploads",
              "Analytics dashboard",
            ]
        ).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                isEnterprise ? "text-gold" : "text-primary"
              }`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OnboardingYouTubeAside() {
  return (
    <div className="space-y-6 animate-fade-up stagger-1">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          <Sparkles className="h-3 w-3" />
          Enterprise · auto-sync
        </div>
        <h3 className="mt-3 font-heading text-3xl leading-tight">
          Your whole channel, indexed overnight.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste one URL. We pull every sermon, short, and live replay into the
          right folders and keep them fresh every week.
        </p>
      </div>

      {/* Channel → folders visualization */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border bg-background/80 p-3 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
            <Rss className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-sm">
            <div className="font-medium">youtube.com/@yourchurch</div>
            <div className="text-xs text-muted-foreground">
              Every video on your channel
            </div>
          </div>
        </div>
        <div className="ml-6 h-4 w-px bg-border" />
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Videos", delay: "stagger-2" },
            { name: "Shorts", delay: "stagger-3" },
            { name: "Live Streams", delay: "stagger-4" },
            { name: "Playlists", delay: "stagger-5" },
          ].map((f) => (
            <div
              key={f.name}
              className={`flex items-center gap-2 rounded-lg border bg-background/60 p-3 text-sm animate-fade-up ${f.delay}`}
            >
              <Folder className="h-4 w-4 text-primary" />
              <span className="font-medium">{f.name}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Skippable — you can connect this anytime from Settings.
      </p>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        accent
          ? "border-gold/40 bg-gold/[0.05]"
          : "border-border/60 bg-background/60"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          accent ? "bg-gold/15 text-gold" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {body}
        </div>
      </div>
    </div>
  );
}
