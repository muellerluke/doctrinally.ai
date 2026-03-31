"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Globe, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateChurchDomain } from "@/lib/actions/settings";

interface DomainFormProps {
  slug: string;
  customDomain: string | null;
  isEnterprise: boolean;
  isOwner: boolean;
  appDomain: string;
}

export function DomainForm({
  slug,
  customDomain,
  isEnterprise,
  isOwner,
  appDomain,
}: DomainFormProps) {
  const router = useRouter();
  const [domain, setDomain] = useState(customDomain ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateChurchDomain(domain || null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Domain updated");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Subdomain — always shown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subdomain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-semibold text-foreground">{slug}</span>
              <span className="text-muted-foreground">.{appDomain}</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This is your church&apos;s default URL. Members can access your chat
            at this address.
          </p>
        </CardContent>
      </Card>

      {/* Custom domain — Enterprise only */}
      <Card className={!isEnterprise ? "opacity-75" : undefined}>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Custom Domain</CardTitle>
          {!isEnterprise && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Lock className="h-3 w-3" />
              Enterprise
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEnterprise ? (
            <p className="text-sm text-muted-foreground">
              Upgrade to Enterprise to use your own domain (e.g.
              ai.yourchurch.com) for the member-facing chat experience.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="custom-domain">Domain</Label>
                <Input
                  id="custom-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.toLowerCase())}
                  placeholder="ai.yourchurch.com"
                  disabled={!isOwner}
                />
                {!isOwner && (
                  <p className="text-xs text-muted-foreground">
                    Only the church owner can change the custom domain.
                  </p>
                )}
              </div>
              {customDomain && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">DNS Configuration</p>
                  <p className="mt-1">
                    Point a CNAME record for{" "}
                    <code className="rounded bg-muted px-1 font-mono">
                      {customDomain}
                    </code>{" "}
                    to{" "}
                    <code className="rounded bg-muted px-1 font-mono">
                      cname.doctrinally.ai
                    </code>
                  </p>
                </div>
              )}
              {isOwner && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save domain
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
