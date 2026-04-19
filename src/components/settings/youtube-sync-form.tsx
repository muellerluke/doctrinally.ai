"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Rss,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Plus,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  connectYouTubeChannel,
  updateYouTubeSyncSchedule,
  triggerManualYouTubeSync,
  disconnectYouTubeChannel,
  addPlaylistToSync,
  removePlaylistFromSync,
} from "@/lib/actions/youtube-sync";

type SyncSummary = {
  id: string;
  channelUrl: string;
  channelId: string | null;
  channelHandle: string | null;
  channelTitle: string | null;
  channelThumbnail: string | null;
  status: "pending" | "syncing" | "active" | "paused" | "failed";
  enabled: boolean;
  dayOfWeek: number;
  hourLocal: number;
  timezone: string;
  lastSyncStartedAt: Date | null;
  lastSyncEndedAt: Date | null;
  lastSyncError: string | null;
  lastSyncStats: {
    imported?: number;
    skipped?: number;
    playlistsDiscovered?: number;
  } | null;
};

type PlaylistRow = {
  id: string;
  playlistId: string;
  playlistTitle: string | null;
};

interface Props {
  sync: SyncSummary | null;
  playlists: PlaylistRow[];
  isEnterprise: boolean;
}

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: format12h(h),
}));

function format12h(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${suffix}`;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function YouTubeSyncForm({ sync, playlists, isEnterprise }: Props) {
  const router = useRouter();
  const [channelUrl, setChannelUrl] = useState("");
  const [connecting, setConnecting] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState(
    sync ? String(sync.dayOfWeek) : "1"
  );
  const [hourLocal, setHourLocal] = useState(
    sync ? String(sync.hourLocal) : "3"
  );
  // Lazy init: existing sync → saved zone; new sync → browser zone. Picks
  // up the user's locale without a set-state-in-effect bounce.
  const [timezone, setTimezone] = useState(
    () => sync?.timezone ?? detectTimezone()
  );
  const [enabled, setEnabled] = useState(sync?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [newPlaylistUrl, setNewPlaylistUrl] = useState("");
  const [addingPlaylist, setAddingPlaylist] = useState(false);

  if (!isEnterprise) {
    return (
      <Card className="border-dashed">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
            <Lock className="h-5 w-5 text-gold" />
          </div>
          <div>
            <CardTitle className="text-lg">
              YouTube channel auto-sync
              <Badge
                variant="secondary"
                className="ml-2 border border-gold/40 bg-gold/10 text-[10px] font-semibold uppercase tracking-wider text-gold"
              >
                Enterprise
              </Badge>
            </CardTitle>
            <CardDescription>
              Paste your YouTube channel once. We&rsquo;ll pull every sermon,
              short, live replay, and playlist into the right folders and
              re-run every week.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              Auto-generates <span className="font-medium text-foreground">Videos</span>, <span className="font-medium text-foreground">Shorts</span>, and <span className="font-medium text-foreground">Live Streams</span> folders
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              Picks up new uploads every week at a time you choose
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              Never re-imports videos you already have
            </li>
          </ul>
          <Button render={<Link href="/billing" />}>Upgrade to Enterprise</Button>
        </CardContent>
      </Card>
    );
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!channelUrl.trim()) return;
    setConnecting(true);
    try {
      const result = await connectYouTubeChannel({
        channelUrl,
        dayOfWeek: Number(dayOfWeek),
        hourLocal: Number(hourLocal),
        timezone,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Connected ${result.channel?.title ?? "your channel"}. Import started in the background.`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveSchedule() {
    setSaving(true);
    try {
      const result = await updateYouTubeSyncSchedule({
        dayOfWeek: Number(dayOfWeek),
        hourLocal: Number(hourLocal),
        timezone,
        enabled,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Sync schedule saved");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    try {
      const result = await triggerManualYouTubeSync();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Sync started. New videos will appear in a few minutes.");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (
      !confirm(
        "Disconnect this YouTube channel? Imported videos will stay in your library. The weekly sync will stop."
      )
    ) {
      return;
    }
    setDisconnecting(true);
    try {
      const result = await disconnectYouTubeChannel();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Channel disconnected");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleAddPlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistUrl.trim()) return;
    setAddingPlaylist(true);
    try {
      const result = await addPlaylistToSync({ playlistUrl: newPlaylistUrl });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Playlist added. It&rsquo;ll be synced on the next run.");
      setNewPlaylistUrl("");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setAddingPlaylist(false);
    }
  }

  async function handleRemovePlaylist(id: string) {
    const result = await removePlaylistFromSync(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Playlist removed");
    router.refresh();
  }

  if (!sync) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Rss className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">
                Connect your YouTube channel
              </CardTitle>
              <CardDescription>
                Paste your channel URL or handle. We&rsquo;ll pull every video,
                short, and live replay into your library on the schedule you set.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="channel-url">Channel URL or @handle</Label>
              <Input
                id="channel-url"
                placeholder="https://www.youtube.com/@yourchurch"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                disabled={connecting}
              />
              <p className="text-xs text-muted-foreground">
                e.g. <code>https://www.youtube.com/@gracechurch</code>,{" "}
                <code>@gracechurch</code>, or a full channel link.
              </p>
            </div>

            <ScheduleFields
              dayOfWeek={dayOfWeek}
              setDayOfWeek={setDayOfWeek}
              hourLocal={hourLocal}
              setHourLocal={setHourLocal}
              timezone={timezone}
              setTimezone={setTimezone}
              disabled={connecting}
            />

            <Button type="submit" disabled={connecting || !channelUrl.trim()}>
              {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect channel
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const statusColor =
    sync.status === "active"
      ? "text-emerald-600 dark:text-emerald-400"
      : sync.status === "failed"
        ? "text-destructive"
        : sync.status === "syncing"
          ? "text-primary"
          : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {sync.channelThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sync.channelThumbnail}
                  alt={sync.channelTitle ?? "Channel"}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Rss className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {sync.channelTitle ?? "YouTube channel"}
                  {sync.channelHandle && (
                    <span className="text-sm text-muted-foreground">
                      {sync.channelHandle}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className={`font-medium ${statusColor}`}>
                    {labelStatus(sync.status)}
                  </span>
                  {sync.lastSyncEndedAt && (
                    <span className="text-muted-foreground">
                      · last run{" "}
                      {formatDistanceToNow(new Date(sync.lastSyncEndedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={syncing || sync.status === "syncing"}
              >
                {syncing || sync.status === "syncing" ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                Sync now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sync.lastSyncStats && (
            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <Stat
                label="Imported last run"
                value={String(sync.lastSyncStats.imported ?? 0)}
              />
              <Stat
                label="Skipped (duplicates)"
                value={String(sync.lastSyncStats.skipped ?? 0)}
              />
              <Stat
                label="Playlists"
                value={String(sync.lastSyncStats.playlistsDiscovered ?? 0)}
              />
            </div>
          )}

          {sync.status === "failed" && sync.lastSyncError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <div className="font-medium text-destructive">
                  Last sync failed
                </div>
                <div className="text-xs text-muted-foreground">
                  {sync.lastSyncError}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={saving}
              />
              <div className="text-sm">
                <div className="font-medium">Weekly auto-sync</div>
                <div className="text-xs text-muted-foreground">
                  {enabled
                    ? "Pulling new videos on the schedule below"
                    : "Paused — no new videos will be imported"}
                </div>
              </div>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>

          <ScheduleFields
            dayOfWeek={dayOfWeek}
            setDayOfWeek={setDayOfWeek}
            hourLocal={hourLocal}
            setHourLocal={setHourLocal}
            timezone={timezone}
            setTimezone={setTimezone}
            disabled={saving || !enabled}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              Disconnect
            </Button>
            <Button onClick={handleSaveSchedule} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Specific playlists</CardTitle>
          <CardDescription>
            Attach playlist URLs to route their videos into dedicated folders
            under <span className="font-medium">YouTube / Playlists</span>.
            Optional — the full channel is always synced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddPlaylist} className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="playlist-url">Playlist URL</Label>
              <Input
                id="playlist-url"
                placeholder="https://www.youtube.com/playlist?list=PL..."
                value={newPlaylistUrl}
                onChange={(e) => setNewPlaylistUrl(e.target.value)}
                disabled={addingPlaylist}
              />
            </div>
            <Button
              type="submit"
              disabled={addingPlaylist || !newPlaylistUrl.trim()}
            >
              {addingPlaylist ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-2 h-3.5 w-3.5" />
              )}
              Add
            </Button>
          </form>

          {playlists.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {playlists.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {p.playlistTitle ?? p.playlistId}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {p.playlistId}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePlaylist(p.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No playlists attached yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleFields({
  dayOfWeek,
  setDayOfWeek,
  hourLocal,
  setHourLocal,
  timezone,
  setTimezone,
  disabled,
}: {
  dayOfWeek: string;
  setDayOfWeek: (v: string) => void;
  hourLocal: string;
  setHourLocal: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Day of week</Label>
        <Select
          value={dayOfWeek}
          onValueChange={(v) => v && setDayOfWeek(v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Hour</Label>
        <Select
          value={hourLocal}
          onValueChange={(v) => v && setHourLocal(v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Timezone</Label>
        <Input
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={disabled}
          placeholder="America/New_York"
        />
        <p className="text-[10px] text-muted-foreground">IANA timezone name</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-heading text-xl">{value}</div>
    </div>
  );
}

function labelStatus(status: SyncSummary["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "syncing":
      return "Syncing…";
    case "pending":
      return "Waiting for first run";
    case "paused":
      return "Paused";
    case "failed":
      return "Needs attention";
  }
}
