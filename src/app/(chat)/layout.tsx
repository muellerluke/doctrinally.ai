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

  // Build CSS custom property overrides — map church colors to Tailwind theme vars
  // This makes all components (bg-primary, text-primary, etc.) use the church's colors
  const brandingVars: Record<string, string> = {};
  if (isEnterprise) {
    if (church.primaryColor) brandingVars["--primary"] = church.primaryColor;
    if (church.accentColor) brandingVars["--accent"] = church.accentColor;
    if (church.backgroundColor) {
      brandingVars["--background"] = church.backgroundColor;
      brandingVars["--card"] = church.backgroundColor;
    }
    if (church.textColor) {
      brandingVars["--foreground"] = church.textColor;
      brandingVars["--card-foreground"] = church.textColor;
    }
    // Derive primary-foreground (light text on primary bg)
    if (church.primaryColor && church.backgroundColor) {
      brandingVars["--primary-foreground"] = church.backgroundColor;
    }
    // Derive muted colors from the background
    if (church.backgroundColor) {
      brandingVars["--muted"] = `color-mix(in srgb, ${church.backgroundColor} 90%, ${church.textColor || '#000'})`;
      brandingVars["--muted-foreground"] = `color-mix(in srgb, ${church.textColor || '#000'} 60%, ${church.backgroundColor})`;
    }
    // Border and input colors
    if (church.textColor) {
      brandingVars["--border"] = `color-mix(in srgb, ${church.textColor} 15%, transparent)`;
      brandingVars["--input"] = `color-mix(in srgb, ${church.textColor} 15%, transparent)`;
    }
    if (church.logoHeight) brandingVars["--church-logo-height"] = `${church.logoHeight}px`;
  }

  // Only load custom Google Font for Enterprise
  const googleFontParam =
    isEnterprise && church.fontFamily
      ? GOOGLE_FONTS_URL_MAP[church.fontFamily]
      : null;

  return (
    <>
      {googleFontParam && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${googleFontParam}&display=swap`}
        />
      )}
      <ChatShell>
        <div
          className="flex h-screen"
          style={{
            ...brandingVars,
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
