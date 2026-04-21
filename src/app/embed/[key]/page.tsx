import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { churches, subscriptions } from "@/db/schema";
import { canUseCustomBranding, canUseEmbedWidget } from "@/lib/plan-gating";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ChatShell } from "@/components/chat/chat-shell";
import { ForceSingleTheme } from "@/components/chat/force-single-theme";

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

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  if (!key || !key.startsWith("dai_pk_")) {
    notFound();
  }

  const [row] = await db
    .select({
      church: churches,
      subscription: subscriptions,
    })
    .from(churches)
    .leftJoin(subscriptions, eq(subscriptions.churchId, churches.id))
    .where(eq(churches.embedPublicKey, key))
    .limit(1);

  if (!row?.church) notFound();
  const { church, subscription } = row;

  if (!church.isActive || !church.embedEnabled) notFound();
  if (!subscription) notFound();
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)) notFound();
  if (!canUseEmbedWidget(subscription.plan)) notFound();

  const isEnterprise = canUseCustomBranding(subscription.plan);

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
      rules.push(
        `--muted: color-mix(in srgb, ${c.bg} 90%, ${c.text || "#000"}) !important`
      );
    }
    if (c.text) {
      rules.push(`--foreground: ${c.text} !important`);
      rules.push(`--card-foreground: ${c.text} !important`);
      rules.push(`--popover-foreground: ${c.text} !important`);
      rules.push(
        `--muted-foreground: color-mix(in srgb, ${c.text} 60%, ${c.bg || "#fff"}) !important`
      );
      rules.push(
        `--border: color-mix(in srgb, ${c.text} 12%, ${c.bg || "#fff"}) !important`
      );
      rules.push(
        `--input: color-mix(in srgb, ${c.text} 12%, ${c.bg || "#fff"}) !important`
      );
    }
    const vars = rules.join("; ");
    if (vars) {
      brandingCss += `#church-chat-embed { ${vars} }`;
      if (c.bg) {
        brandingCss += ` body { background: ${c.bg} !important; }`;
      }
    }
  }

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
          id="church-chat-embed"
          className="flex h-dvh flex-col bg-background text-foreground overflow-hidden"
          style={
            {
              fontFamily:
                isEnterprise &&
                church.fontFamily &&
                FONT_CSS_MAP[church.fontFamily]
                  ? FONT_CSS_MAP[church.fontFamily]
                  : undefined,
            } as React.CSSProperties
          }
        >
          <ChatInterface
            churchId={church.id}
            churchName={church.name}
            churchLogoUrl={isEnterprise ? church.logoUrl : null}
            welcomeMessage={church.welcomeMessage ?? undefined}
            isAuthenticated={false}
            embed
          />
        </div>
      </ChatShell>
    </>
  );
}
