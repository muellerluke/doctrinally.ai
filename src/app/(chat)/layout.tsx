import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getCurrentChurch } from "@/lib/church-context";
import { canUseCustomBranding } from "@/lib/plan-gating";
import { getChats } from "@/lib/actions/chats";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatShell } from "@/components/chat/chat-shell";
import { VisitorTracker } from "@/components/chat/visitor-tracker";
import { ForceSingleTheme } from "@/components/chat/force-single-theme";
import type { ChatHistoryItem } from "@/components/chat/chat-sidebar";

const FONT_CSS_MAP: Record<string, string> = {
  "source-serif": "'Source Serif 4', serif",
  playfair: "'Playfair Display', serif",
  inter: "'Inter', sans-serif",
  lora: "'Lora', serif",
  merriweather: "'Merriweather', serif",
  "dm-sans": "'DM Sans', sans-serif",
  nunito: "'Nunito', sans-serif",
  "eb-garamond": "'EB Garamond', serif",
};

const GOOGLE_FONTS_URL_MAP: Record<string, string> = {
  inter: "Inter:wght@400;500;600;700",
  lora: "Lora:wght@400;500;600;700",
  merriweather: "Merriweather:wght@400;700",
  "dm-sans": "DM+Sans:wght@400;500;600;700",
  nunito: "Nunito:wght@400;500;600;700",
  "eb-garamond": "EB+Garamond:wght@400;500;600;700",
};

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const church = await getCurrentChurch();

  // No church found on this subdomain/domain
  if (!church) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-4">
        <img src="/logo-light-mode.png" alt="Doctrinally.AI" className="h-16 w-16 rounded-2xl" />
        <h1 className="font-heading text-2xl">Church not found</h1>
        <p className="text-muted-foreground">
          This church doesn&apos;t exist or hasn&apos;t been set up yet.
        </p>
      </div>
    );
  }

  // Fetch chat history for authenticated users
  let chatHistory: ChatHistoryItem[] = [];
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const result = await getChats(church.id);
    if ("chats" in result && result.chats) {
      chatHistory = result.chats.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
      }));
    }
  }

  // Check subscription status
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });

  // Block access if church has no active subscription
  const activeStatuses = ["active", "trialing", "past_due"];
  if (!church.isActive || !sub || !activeStatuses.includes(sub.status)) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-4">
        <img src="/logo-light-mode.png" alt="Doctrinally.AI" className="h-16 w-16 rounded-2xl" />
        <h1 className="font-heading text-2xl">Church not found</h1>
        <p className="text-muted-foreground">
          This church doesn&apos;t exist or hasn&apos;t been set up yet.
        </p>
      </div>
    );
  }

  const isEnterprise = canUseCustomBranding(sub.plan);

  // Chat renders in a single theme — no OS-driven dark/light switching.
  // Enterprise churches override the default theme tokens with their own
  // configured colors; Standard churches fall through to the global
  // defaults unchanged.
  let brandingCss = "";
  if (isEnterprise) {
    const c = {
      primary: church.primaryColor,
      accent: church.accentColor,
      bg: church.backgroundColor,
      text: church.textColor,
    };
    const rules: string[] = [];
    if (c.primary) {
      rules.push(`--primary: ${c.primary} !important`);
      if (c.bg) rules.push(`--primary-foreground: ${c.bg} !important`);
    }
    if (c.accent) rules.push(`--accent: ${c.accent} !important`);
    if (c.bg) {
      rules.push(`--background: ${c.bg} !important`);
      rules.push(`--card: ${c.bg} !important`);
      rules.push(`--popover: ${c.bg} !important`);
      rules.push(`--muted: color-mix(in srgb, ${c.bg} 90%, ${c.text || "#000"}) !important`);
    }
    if (c.text) {
      rules.push(`--foreground: ${c.text} !important`);
      rules.push(`--card-foreground: ${c.text} !important`);
      rules.push(`--popover-foreground: ${c.text} !important`);
      rules.push(`--muted-foreground: color-mix(in srgb, ${c.text} 60%, ${c.bg || "#fff"}) !important`);
      rules.push(`--border: color-mix(in srgb, ${c.text} 12%, ${c.bg || "#fff"}) !important`);
      rules.push(`--input: color-mix(in srgb, ${c.text} 12%, ${c.bg || "#fff"}) !important`);
    }
    const vars = rules.join("; ");

    // Apply to both #church-chat (the main container) AND html/body so the
    // background color extends into iOS safe areas and any pixels outside
    // the chat container (status bar, home indicator bar).
    if (vars) {
      brandingCss += `#church-chat { ${vars} }`;
      if (c.bg) {
        brandingCss += ` body { background: ${c.bg} !important; }`;
      }
    }
  }

  // Only load custom Google Font for Enterprise
  const googleFontParam =
    isEnterprise && church.fontFamily
      ? GOOGLE_FONTS_URL_MAP[church.fontFamily]
      : null;

  return (
    <>
      <ForceSingleTheme />
      {brandingCss && (
        <style dangerouslySetInnerHTML={{ __html: brandingCss }} />
      )}
      {googleFontParam && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${googleFontParam}&display=swap`}
        />
      )}
      <ChatShell>
        <div
          id="church-chat"
          className="flex h-dvh bg-background text-foreground overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          style={{
            fontFamily:
              isEnterprise && church.fontFamily && FONT_CSS_MAP[church.fontFamily]
                ? FONT_CSS_MAP[church.fontFamily]
                : undefined,
          } as React.CSSProperties}
        >
          <ChatSidebar
            churchName={church.name}
            churchLogoUrl={isEnterprise ? church.logoUrl : null}
            chats={chatHistory}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
          <VisitorTracker churchId={church.id} />
        </div>
      </ChatShell>
    </>
  );
}
