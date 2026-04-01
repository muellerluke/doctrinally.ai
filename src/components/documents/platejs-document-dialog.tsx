"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createPlatejsDocument } from "@/lib/actions/documents";
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

interface PlatejsDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  churchId: string;
  folderId?: string | null;
}

export function PlatejsDocumentDialog({
  open,
  onOpenChange,
  churchId,
  folderId,
}: PlatejsDocumentDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [tags, setTags] = React.useState("");

  function resetForm() {
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

      const result = await createPlatejsDocument({
        title,
        content: "",
        tags: tagList.length > 0 ? tagList : null,
        folderId: folderId ?? null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Document created");
      resetForm();
      onOpenChange(false);
      router.push(`/documents/${result.documentId}/edit`);
    } catch {
      toast.error("Failed to create document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-blue-600" />
            New Document
          </DialogTitle>
          <DialogDescription>
            Create a new document using the rich text editor. You can write and
            format your content after setup.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="doc-title">Title *</Label>
            <Input
              id="doc-title"
              placeholder="Document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-tags">Tags</Label>
            <Input
              id="doc-tags"
              placeholder="devotional, prayer, worship (comma-separated)"
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
              Create & Edit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
