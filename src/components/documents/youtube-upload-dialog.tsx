"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { createYouTubeDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface YouTubeUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: string;
  folderId?: string | null;
  onSuccess?: () => void;
}

export function YouTubeUploadDialog({
  open,
  onOpenChange,
  churchId,
  folderId,
  onSuccess,
}: YouTubeUploadDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [tags, setTags] = React.useState("");

  function resetForm() {
    setUrl("");
    setTitle("");
    setTags("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const result = await createYouTubeDocument({
        title,
        sourceUrl: url,
        tags: tagList.length > 0 ? tagList : null,
        folderId: folderId ?? null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      window.plausible?.("Document Upload", { props: { type: "youtube" } });
      toast.success("YouTube video added successfully");
      resetForm();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Failed to add YouTube video");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="size-5 text-red-500" />
            Add YouTube Video
          </DialogTitle>
          <DialogDescription>
            Paste a YouTube URL to add a video to your library. The transcript
            will be extracted and indexed for AI retrieval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="yt-url">YouTube URL *</Label>
            <Input
              id="yt-url"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="yt-title">Title *</Label>
            <Input
              id="yt-title"
              placeholder="Sermon title or video name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="yt-tags">Tags</Label>
            <Input
              id="yt-tags"
              placeholder="sermon, faith, grace (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Add Video
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
