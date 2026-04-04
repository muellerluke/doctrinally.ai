"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
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

interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

interface DomainStatus {
  configured: boolean;
  verified: boolean;
  misconfigured: boolean;
  verification?: { type: string; domain: string; value: string }[];
  cnameRecord?: { value: string } | null;
  aRecords?: { value: string }[];
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function DnsInstructions({
  domain,
  status,
}: {
  domain: string;
  status: DomainStatus | null;
}) {
  if (!status) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking DNS configuration...
      </div>
    );
  }

  const records: DnsRecord[] = [];

  // Verification TXT records (if not yet verified)
  if (!status.verified && status.verification) {
    for (const v of status.verification) {
      records.push({
        type: v.type,
        name: v.domain,
        value: v.value,
      });
    }
  }

  // Check if it's a subdomain (has more than one dot) → CNAME, otherwise A record
  const isSubdomain = domain.split(".").length > 2;

  if (isSubdomain) {
    records.push({
      type: "CNAME",
      name: domain,
      value: "cname.vercel-dns.com",
    });
  } else {
    records.push({
      type: "A",
      name: "@",
      value: "76.76.21.21",
    });
  }

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        {status.verified && !status.misconfigured ? (
          <Badge
            variant="secondary"
            className="gap-1.5 border-none bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-3 w-3" />
            Domain verified
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="gap-1.5 border-none bg-amber-100 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          >
            <AlertCircle className="h-3 w-3" />
            Pending verification
          </Badge>
        )}
      </div>

      {/* DNS records table */}
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/50 px-3 py-2">
          <p className="text-xs font-medium">
            Add these DNS records at your domain registrar
          </p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                    {r.type}
                  </code>
                </td>
                <td className="px-3 py-2">
                  <code className="font-mono text-[11px]">{r.name}</code>
                  <CopyButton value={r.name} />
                </td>
                <td className="max-w-[200px] px-3 py-2">
                  <code className="break-all font-mono text-[11px]">
                    {r.value}
                  </code>
                  <CopyButton value={r.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground">
        DNS changes can take up to 48 hours to propagate. SSL will be
        provisioned automatically once DNS is verified.
      </p>
    </div>
  );
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
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Fetch domain status when a custom domain exists
  useEffect(() => {
    if (!customDomain) {
      setDomainStatus(null);
      return;
    }

    setLoadingStatus(true);
    fetch(`/api/domain/status?domain=${encodeURIComponent(customDomain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDomainStatus(data);
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [customDomain]);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateChurchDomain(domain || null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          domain
            ? "Domain saved — configure DNS records below"
            : "Custom domain removed"
        );
        router.refresh();
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleRefreshStatus() {
    if (!customDomain) return;
    setLoadingStatus(true);
    fetch(`/api/domain/status?domain=${encodeURIComponent(customDomain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDomainStatus(data);
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
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

              {isOwner && (
                <div className="flex justify-end gap-2">
                  {customDomain && (
                    <Button
                      variant="outline"
                      onClick={handleRefreshStatus}
                      disabled={loadingStatus}
                      size="sm"
                    >
                      {loadingStatus ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Check DNS
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save domain
                  </Button>
                </div>
              )}

              {customDomain && (
                <DnsInstructions
                  domain={customDomain}
                  status={loadingStatus ? null : domainStatus}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
