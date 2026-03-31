import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireMembership } from "@/lib/auth-guards";
import { canUseCustomBranding } from "@/lib/plan-gating";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralForm } from "@/components/settings/general-form";
import { BrandingForm } from "@/components/settings/branding-form";
import { DomainForm } from "@/components/settings/domain-form";

export default async function SettingsPage() {
  const { membership, church } = await requireMembership();

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.churchId, church.id),
  });

  const isEnterprise = sub ? canUseCustomBranding(sub.plan) : false;
  const isOwner = membership.role === "owner";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3000";

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
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralForm
            church={{
              name: church.name,
              description: church.description,
              phone: church.phone,
              address: church.address,
              logoUrl: church.logoUrl,
            }}
          />
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
              darkPrimaryColor: church.darkPrimaryColor,
              darkAccentColor: church.darkAccentColor,
              darkBackgroundColor: church.darkBackgroundColor,
              darkTextColor: church.darkTextColor,
              darkLogoUrl: church.darkLogoUrl,
              welcomeMessage: church.welcomeMessage,
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
      </Tabs>
    </div>
  );
}
