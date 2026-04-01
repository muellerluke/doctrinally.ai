"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Play,
  FileUp,
  FileEdit,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createFolder } from "@/lib/actions/folders";
import { YouTubeUploadDialog } from "@/components/documents/youtube-upload-dialog";
import { FileUploadDialog } from "@/components/documents/file-upload-dialog";
import { PlatejsDocumentDialog } from "@/components/documents/platejs-document-dialog";

interface DocumentActionsProps {
  churchId: string;
  currentFolderId?: string | null;
}

export function DocumentActions({
  churchId,
  currentFolderId,
}: DocumentActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);

  async function handleCreateFolder() {
    if (!folderName.trim()) return;
    startTransition(async () => {
      const result = await createFolder({
        name: folderName,
        parentId: currentFolderId ?? null,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Folder created");
        setFolderName("");
        setNewFolderOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button />}>
            <Upload className="h-4 w-4" />
            Upload
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setYoutubeOpen(true)}>
              <Play />
              YouTube Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFileUploadOpen(true)}>
              <FileUp />
              Upload File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNewDocOpen(true)}>
              <FileEdit />
              New Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
          <FolderPlus className="h-4 w-4" />
          New Folder
        </Button>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>
              Add a new folder to organize your documents.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || isPending}
            >
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialogs */}
      <YouTubeUploadDialog
        open={youtubeOpen}
        onOpenChange={setYoutubeOpen}
        churchId={churchId}
        folderId={currentFolderId}
      />
      <FileUploadDialog
        open={fileUploadOpen}
        onOpenChange={setFileUploadOpen}
        churchId={churchId}
        folderId={currentFolderId}
      />
      <PlatejsDocumentDialog
        open={newDocOpen}
        onOpenChange={setNewDocOpen}
        churchId={churchId}
        folderId={currentFolderId}
      />
    </>
  );
}
