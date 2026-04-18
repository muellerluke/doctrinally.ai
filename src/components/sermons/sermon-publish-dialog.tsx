"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { publishSermon } from "@/lib/actions/sermons";

interface SermonPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  defaultTitle: string;
}

export function SermonPublishDialog({
  open,
  onOpenChange,
  documentId,
  defaultTitle,
}: SermonPublishDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [speaker, setSpeaker] = useState("");
  const [sermonDate, setSermonDate] = useState("");
  const [series, setSeries] = useState("");
  const [tags, setTags] = useState("");
  const [membersSearchable, setMembersSearchable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await publishSermon({
        documentId,
        title: title.trim() || defaultTitle,
        speaker: speaker.trim() || null,
        sermonDate: sermonDate.trim() || null,
        series: series.trim() || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        membersSearchable,
      });
      if (result && "error" in result) {
        setError(result.error ?? "Publish failed");
        return;
      }
      onOpenChange(false);
      router.push("/sermons");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish sermon to library</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1 text-sm">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Speaker</Label>
              <Input
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="h-9"
                placeholder="Pastor Jim"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input
                value={sermonDate}
                onChange={(e) => setSermonDate(e.target.value)}
                type="date"
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Series</Label>
            <Input
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              className="h-9"
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="h-9"
              placeholder="comma, separated"
            />
          </div>
          <div className="flex items-start justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex-1 pr-3">
              <div className="text-xs font-medium">Searchable by members</div>
              <p className="text-[11px] text-muted-foreground">
                When on, members find this sermon through the public chat.
                When off, only your sermon writer can see it.
              </p>
            </div>
            <Switch
              checked={membersSearchable}
              onCheckedChange={setMembersSearchable}
            />
          </div>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
