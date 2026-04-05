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
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4">
        <img src="/logo-light-mode.png" alt="Doctrinally.AI" className="h-16 w-16 rounded-2xl dark:hidden" />
        <img src="/logo-dark-mode.png" alt="Doctrinally.AI" className="hidden h-16 w-16 rounded-2xl dark:block" />
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

  // Check if church has enterprise plan for custom branding
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });
  const isEnterprise = sub ? canUseCustomBranding(sub.plan) : false;

  // Build branding CSS for light and dark modes
  let brandingCss = "";
  if (isEnterprise) {
    const light = {
      primary: church.primaryColor,
      accent: church.accentColor,
      bg: church.backgroundColor,
      text: church.textColor,
    };
    const dark = {
      primary: church.darkPrimaryColor,
      accent: church.darkAccentColor,
      bg: church.darkBackgroundColor,
      text: church.darkTextColor,
    };

    const buildVars = (c: typeof light) => {
      const vars: string[] = [];
      if (c.primary) {
        vars.push(`--primary: ${c.primary}`);
        if (c.bg) vars.push(`--primary-foreground: ${c.bg}`);
      }
      if (c.accent) vars.push(`--accent: ${c.accent}`);
      if (c.bg) {
        vars.push(`--background: ${c.bg}`);
        vars.push(`--card: ${c.bg}`);
        vars.push(`--muted: color-mix(in srgb, ${c.bg} 90%, ${c.text || "#000"})`);
      }
      if (c.text) {
        vars.push(`--foreground: ${c.text}`);
        vars.push(`--card-foreground: ${c.text}`);
        vars.push(`--muted-foreground: color-mix(in srgb, ${c.text} 60%, ${c.bg || "#fff"})`);
        vars.push(`--border: color-mix(in srgb, ${c.text} 15%, transparent)`);
        vars.push(`--input: color-mix(in srgb, ${c.text} 15%, transparent)`);
      }
      return vars.join("; ");
    };

    const lightVars = buildVars(light);
    const darkVars = buildVars(dark);

    if (lightVars) brandingCss += `#church-chat { ${lightVars} }`;
    if (darkVars) brandingCss += ` .dark #church-chat { ${darkVars} }`;
  }

  // Only load custom Google Font for Enterprise
  const googleFontParam =
    isEnterprise && church.fontFamily
      ? GOOGLE_FONTS_URL_MAP[church.fontFamily]
      : null;

  return (
    <>
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
          className="flex h-screen"
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
