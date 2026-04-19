"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  Globe,
  Plus,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateWebsiteConfig,
  triggerManualRecrawl,
} from "@/lib/actions/website-crawling";

type CrawlStatus =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

interface WebsiteCrawlingFormProps {
  initial: {
    websiteDomain: string | null;
    additionalDomains: string[];
    includePatterns: string[];
    excludePatterns: string[];
    lastCrawlAt: Date | null;
    lastCrawlStatus: CrawlStatus;
    lastCrawlPagesIngested: number;
    lastCrawlError: string | null;
  };
  pageLimit: number;
  isEnterprise: boolean;
}

export function WebsiteCrawlingForm({
  initial,
  pageLimit,
  isEnterprise,
}: WebsiteCrawlingFormProps) {
  const router = useRouter();
  const [websiteDomain, setWebsiteDomain] = useState(initial.websiteDomain ?? "");
  const [additionalDomains, setAdditionalDomains] = useState<string[]>(
    initial.additionalDomains
  );
  const [includePatterns, setIncludePatterns] = useState<string[]>(
    initial.includePatterns
  );
  const [excludePatterns, setExcludePatterns] = useState<string[]>(
    initial.excludePatterns
  );
  const [saving, setSaving] = useState(false);
  const [crawling, setCrawling] = useState(
    initial.lastCrawlStatus === "queued" || initial.lastCrawlStatus === "running"
  );

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateWebsiteConfig({
        websiteDomain: websiteDomain.trim() || null,
        additionalDomains,
        includePatterns,
        excludePatterns,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Website settings saved");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecrawl() {
    setCrawling(true);
    try {
      const result = await triggerManualRecrawl();
      if (result.error) {
        toast.error(result.error);
        setCrawling(false);
      } else {
        toast.success("Crawl started — pages will appear in your library shortly");
        router.refresh();
      }
    } catch {
      toast.error("Failed to start crawl");
      setCrawling(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Church website</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="website-domain">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="website-domain"
                value={websiteDomain}
                onChange={(e) => setWebsiteDomain(e.target.value)}
                placeholder="mychurch.com"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll crawl up to{" "}
              <span className="font-medium text-foreground">{pageLimit} pages</span>{" "}
              on this site each month and feed them to your assistant. Pages
              show up in your document library so the AI can cite them in
              chat answers.
            </p>
            {!isEnterprise && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Want more?</span> Upgrade to
                Enterprise to crawl up to 100 pages each month.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <CrawlStatusCard
        status={initial.lastCrawlStatus}
        lastCrawlAt={initial.lastCrawlAt}
        pagesIngested={initial.lastCrawlPagesIngested}
        error={initial.lastCrawlError}
        onRecrawl={handleRecrawl}
        crawling={crawling}
        canRecrawl={!!websiteDomain.trim()}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Page filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PatternList
            label="Only crawl pages matching"
            description={
              <>
                Restrict the crawl to specific sections of your site. Leave
                empty to crawl everything. Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">*</code> as a wildcard.
              </>
            }
            placeholder="/sermons/*"
            patterns={includePatterns}
            onChange={setIncludePatterns}
          />

          <PatternList
            label="Skip pages matching"
            description={
              <>
                Pages matching these patterns will never be ingested. Useful
                for donation, login, or admin pages.
              </>
            }
            placeholder="/donate*"
            patterns={excludePatterns}
            onChange={setExcludePatterns}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            Additional domains
            <Badge variant="outline" className="text-xs">
              Advanced
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            By default we only crawl your church website above. Add other
            domains here if you have content elsewhere — for example, a
            sermon archive on a different platform.
          </p>
          <PatternList
            label=""
            placeholder="sermons.mychurch.com"
            patterns={additionalDomains}
            onChange={setAdditionalDomains}
            inputType="hostname"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}

interface CrawlStatusCardProps {
  status: CrawlStatus;
  lastCrawlAt: Date | null;
  pagesIngested: number;
  error: string | null;
  onRecrawl: () => void;
  crawling: boolean;
  canRecrawl: boolean;
}

function CrawlStatusCard({
  status,
  lastCrawlAt,
  pagesIngested,
  error,
  onRecrawl,
  crawling,
  canRecrawl,
}: CrawlStatusCardProps) {
  const live = crawling || status === "running" || status === "queued";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Last crawl</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onRecrawl}
          disabled={live || !canRecrawl}
        >
          {live ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          {live ? "Crawling…" : "Recrawl now"}
        </Button>
      </CardHeader>
      <CardContent>
        {live ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Visiting pages on your site… This usually takes a couple of
            minutes. Pages will appear in your document library as they&apos;re
            indexed.
          </div>
        ) : status === "succeeded" && lastCrawlAt ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1.5 border-none bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-3 w-3" />
                Indexed
              </Badge>
              <span className="text-sm text-muted-foreground">
                {pagesIngested} page{pagesIngested === 1 ? "" : "s"} ·{" "}
                {formatDistanceToNow(lastCrawlAt, { addSuffix: true })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              These pages are searchable in chat right now. We&apos;ll
              automatically refresh them next month.
            </p>
          </div>
        ) : status === "failed" ? (
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="gap-1.5 border-none bg-red-100 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              <AlertCircle className="h-3 w-3" />
              Failed
            </Badge>
            {error && (
              <p className="text-xs text-muted-foreground">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Try again, or check that your website is publicly reachable.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {canRecrawl
              ? "No crawl yet. Click \u201CRecrawl now\u201D to ingest your site."
              : "Add your church website above to start ingesting pages."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PatternListProps {
  label: string;
  description?: React.ReactNode;
  placeholder: string;
  patterns: string[];
  onChange: (next: string[]) => void;
  inputType?: "pattern" | "hostname";
}

function PatternList({
  label,
  description,
  placeholder,
  patterns,
  onChange,
  inputType = "pattern",
}: PatternListProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (patterns.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...patterns, value]);
    setDraft("");
  }

  function remove(index: number) {
    onChange(patterns.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputType === "pattern" ? "font-mono text-sm" : undefined}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {patterns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {patterns.map((pattern, i) => (
            <Badge
              key={`${pattern}-${i}`}
              variant="secondary"
              className="gap-1.5 pl-2.5 pr-1 font-mono text-xs"
            >
              {pattern}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
                aria-label={`Remove ${pattern}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
