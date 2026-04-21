"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Code2,
  Copy,
  Check,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  generateEmbedPublicKey,
  setEmbedEnabled,
} from "@/lib/actions/embed";

interface Props {
  isEnterprise: boolean;
  initial: {
    embedPublicKey: string | null;
    embedEnabled: boolean;
    websiteDomain: string | null;
  };
  appUrl: string;
}

export function EmbedWidgetForm({ isEnterprise, initial, appUrl }: Props) {
  const router = useRouter();
  const [embedPublicKey, setEmbedPublicKey] = useState(initial.embedPublicKey);
  const [embedEnabled, setEmbedEnabledState] = useState(initial.embedEnabled);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (!isEnterprise) {
    return (
      <Card className="border-dashed">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
            <Lock className="h-5 w-5 text-gold" />
          </div>
          <div>
            <CardTitle className="text-lg">
              Embeddable chat widget
              <Badge
                variant="secondary"
                className="ml-2 border border-gold/40 bg-gold/10 text-[10px] font-semibold uppercase tracking-wider text-gold"
              >
                Enterprise
              </Badge>
            </CardTitle>
            <CardDescription>
              Drop a floating chat bubble onto your own church website. Your
              members ask questions right from your homepage — same docs,
              same branding, same AI.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/billing" />}>
            Upgrade to Enterprise
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scriptSnippet = embedPublicKey
    ? `<script src="${appUrl}/embed.js" data-church-key="${embedPublicKey}" async></script>`
    : "";

  async function handleGenerate() {
    const hadKey = !!embedPublicKey;
    if (
      hadKey &&
      !confirm(
        "Regenerating invalidates the current script snippet. You'll need to update the <script> tag on your site — any instances still using the old key will stop working. Continue?"
      )
    ) {
      return;
    }

    setGenerating(true);
    try {
      const result = await generateEmbedPublicKey();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEmbedPublicKey(result.embedPublicKey ?? null);
      setEmbedEnabledState(true);
      toast.success(
        hadKey ? "New embed key generated" : "Embed key generated"
      );
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggle(nextEnabled: boolean) {
    setToggling(true);
    try {
      const result = await setEmbedEnabled(nextEnabled);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEmbedEnabledState(nextEnabled);
      toast.success(nextEnabled ? "Embed widget enabled" : "Embed widget paused");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setToggling(false);
    }
  }

  async function handleCopy() {
    if (!scriptSnippet) return;
    try {
      await navigator.clipboard.writeText(scriptSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">
                Embeddable chat widget
              </CardTitle>
              <CardDescription>
                Paste a single script tag into your church website to add a
                floating chat bubble. Visitors can ask questions without
                leaving your site — answers come from the same library as
                your main chat.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {embedPublicKey ? (
            <>
              <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={embedEnabled}
                    onCheckedChange={handleToggle}
                    disabled={toggling}
                  />
                  <div className="text-sm">
                    <div className="font-medium">
                      {embedEnabled
                        ? "Widget live on your site"
                        : "Widget paused"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {embedEnabled
                        ? "Any page with your script tag shows the chat bubble."
                        : "The bubble is hidden from visitors until re-enabled."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Your embed script
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!scriptSnippet}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
                  <code>{scriptSnippet}</code>
                </pre>
                <p className="text-xs text-muted-foreground">
                  Place this just before the closing{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    &lt;/body&gt;
                  </code>{" "}
                  tag on every page where you want the chat to appear — or
                  drop it into a global template (Squarespace code injection,
                  WordPress footer, Webflow custom code, etc).
                </p>
              </div>

              <div className="rounded-md border border-amber-200/60 bg-amber-50/60 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                  <div className="text-amber-900 dark:text-amber-100">
                    <span className="font-medium">Keep this key safe-ish.</span>{" "}
                    It&rsquo;s a public identifier (it ships on every page of
                    your site), but if it leaks to an unauthorized site they
                    could embed your chat there. Regenerate below to rotate
                    the key if needed.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-xs text-muted-foreground">
                  Current key:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    {embedPublicKey}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  )}
                  Regenerate
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg">No embed key yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Generate a key to get your copy-paste script. You can rotate
                or disable it at any time.
              </p>
              <Button
                className="mt-4"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate embed key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {initial.websiteDomain && embedPublicKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview it yourself</CardTitle>
            <CardDescription>
              Drop the script into any HTML file and open it to see the
              launcher appear. We recommend testing on{" "}
              <span className="font-medium">{initial.websiteDomain}</span>{" "}
              first before pushing to all pages.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
