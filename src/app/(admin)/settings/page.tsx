import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  subscriptions,
  churchWebsiteConfigs,
  youtubeChannelSyncs,
  youtubeSyncPlaylists,
} from "@/db/schema";
import { requireMembership } from "@/lib/auth-guards";
import {
  canUseCustomBranding,
  canUseYouTubeSync,
  isEmbeddedChatAvailable,
} from "@/lib/plan-gating";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralForm } from "@/components/settings/general-form";
import { BrandingForm } from "@/components/settings/branding-form";
import { DomainForm } from "@/components/settings/domain-form";
import { QrCodeCard } from "@/components/settings/qr-code-card";
import { AiFallbackForm } from "@/components/settings/ai-fallback-form";
import { WebsiteCrawlingForm } from "@/components/settings/website-crawling-form";
import { YouTubeSyncForm } from "@/components/settings/youtube-sync-form";
import { EmbedWidgetForm } from "@/components/settings/embed-widget-form";
import { resolveEmbedAllowedOrigins } from "@/lib/actions/embed";

export default async function SettingsPage() {
  const { membership, church } = await requireMembership();

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });

  const isEnterprise = sub ? canUseCustomBranding(sub.plan) : false;
  const canYouTubeSync = sub ? canUseYouTubeSync(sub.plan) : false;
  // Combined plan + flag gate. Returning false hides the Website Chat
  // tab content behind the upgrade CTA even on Enterprise if the flag
  // is off — keeps admin-side settings in sync with what visitors see.
  const canEmbed = sub
    ? await isEmbeddedChatAvailable(church.id, sub.plan)
    : false;
  const isOwner = membership.role === "owner";

  const sync = await db.query.youtubeChannelSyncs.findFirst({
    where: eq(youtubeChannelSyncs.churchId, church.id),
  });
  const playlistRows = sync
    ? await db.query.youtubeSyncPlaylists.findMany({
        where: eq(youtubeSyncPlaylists.syncId, sync.id),
      })
    : [];
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";
  const protocol = appDomain.includes("localhost") ? "http" : "https";
  const embedScriptUrl = process.env.NEXT_PUBLIC_EMBED_SCRIPT_URL ?? "";

  // Resolve the widget's allowed origins so the settings card can
  // show admins exactly where their script will load. Same source as
  // the runtime /api/embed/* origin check — no divergence.
  const allowedOrigins = church.embedPublicKey
    ? (await resolveEmbedAllowedOrigins(church.embedPublicKey)) ?? []
    : [];

  // Build the chat URL: custom domain for Enterprise, subdomain otherwise
  const chatUrl =
    isEnterprise && church.customDomain
      ? `${protocol}://${church.customDomain}/chat`
      : `${protocol}://${church.slug}.${appDomain}/chat`;

  // Lazy-create the website config row so older churches that signed up
  // before this feature don't need a separate backfill migration.
  let [websiteConfig] = await db
    .select()
    .from(churchWebsiteConfigs)
    .where(eq(churchWebsiteConfigs.churchId, church.id))
    .limit(1);

  if (!websiteConfig) {
    [websiteConfig] = await db
      .insert(churchWebsiteConfigs)
      .values({ churchId: church.id })
      .returning();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your church's profile, branding, and domain configuration"
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="domain">Domain</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="member-ai">Member AI</TabsTrigger>
          <TabsTrigger value="embedded-ai">Website Chat</TabsTrigger>
          <TabsTrigger value="youtube">YouTube Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <GeneralForm
            church={{
              name: church.name,
              description: church.description,
              phone: church.phone,
              address: church.address,
              logoUrl: church.logoUrl,
            }}
          />
          <QrCodeCard chatUrl={chatUrl} />
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <BrandingForm
            church={{
              name: church.name,
              logoUrl: church.logoUrl,
              primaryColor: church.primaryColor,
              accentColor: church.accentColor,
              backgroundColor: church.backgroundColor,
              textColor: church.textColor,
              welcomeMessage: church.welcomeMessage,
              logoHeight: church.logoHeight,
              fontFamily: church.fontFamily,
            }}
            isEnterprise={isEnterprise}
          />
        </TabsContent>

        <TabsContent value="domain" className="mt-6">
          <DomainForm
            slug={church.slug}
            customDomain={church.customDomain}
            isEnterprise={isEnterprise}
            isOwner={isOwner}
            appDomain={appDomain}
          />
        </TabsContent>

        <TabsContent value="website" className="mt-6">
          <WebsiteCrawlingForm
            initial={{
              websiteDomain: church.websiteDomain,
              additionalDomains: websiteConfig.additionalDomains,
              includePatterns: websiteConfig.includePatterns,
              excludePatterns: websiteConfig.excludePatterns,
              lastCrawlAt: websiteConfig.lastCrawlAt,
              lastCrawlStatus: websiteConfig.lastCrawlStatus,
              lastCrawlPagesIngested: websiteConfig.lastCrawlPagesIngested,
              lastCrawlError: websiteConfig.lastCrawlError,
            }}
          />
        </TabsContent>

        <TabsContent value="member-ai" className="mt-6 space-y-6">
          <AiFallbackForm
            currentInstruction={church.aiFallbackInstruction}
          />
        </TabsContent>

        <TabsContent value="embedded-ai" className="mt-6">
          <EmbedWidgetForm
            isEnterprise={canEmbed}
            initial={{
              embedPublicKey: church.embedPublicKey,
              embedEnabled: church.embedEnabled,
              websiteDomain: church.websiteDomain,
              proactiveOutreachEnabled: church.embedProactiveOutreachEnabled,
            }}
            allowedOrigins={allowedOrigins}
            embedScriptUrl={embedScriptUrl}
          />
        </TabsContent>

        <TabsContent value="youtube" className="mt-6">
          <YouTubeSyncForm
            isEnterprise={canYouTubeSync}
            sync={
              sync
                ? {
                    id: sync.id,
                    channelUrl: sync.channelUrl,
                    channelId: sync.channelId,
                    channelHandle: sync.channelHandle,
                    channelTitle: sync.channelTitle,
                    channelThumbnail: sync.channelThumbnail,
                    status: sync.status,
                    enabled: sync.enabled,
                    dayOfWeek: sync.dayOfWeek,
                    hourLocal: sync.hourLocal,
                    timezone: sync.timezone,
                    lastSyncStartedAt: sync.lastSyncStartedAt,
                    lastSyncEndedAt: sync.lastSyncEndedAt,
                    lastSyncError: sync.lastSyncError,
                    lastSyncStats: sync.lastSyncStats,
                    lastCaptionScan: sync.lastCaptionScan,
                  }
                : null
            }
            playlists={playlistRows.map((p) => ({
              id: p.id,
              playlistId: p.playlistId,
              playlistTitle: p.playlistTitle,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
