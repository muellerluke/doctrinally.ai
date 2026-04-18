"use client";

import { useState } from "react";
import { Download, FileText, FileType, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SermonPublishDialog } from "./sermon-publish-dialog";

interface SermonExportMenuProps {
  documentId: string;
  title: string;
}

export function SermonExportMenu({ documentId, title }: SermonExportMenuProps) {
  const [publishOpen, setPublishOpen] = useState(false);

  function downloadMarkdown(withVerses: boolean) {
    const params = new URLSearchParams({ documentId });
    if (withVerses) params.set("includeVerses", "1");
    const url = `/api/sermons/export?${params.toString()}`;
    window.open(url, "_blank");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => downloadMarkdown(false)}>
            <FileText className="mr-2 h-4 w-4" />
            Download as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadMarkdown(true)}>
            <FileType className="mr-2 h-4 w-4" />
            Markdown + inline verses
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPublishOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Publish to library…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SermonPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        documentId={documentId}
        defaultTitle={title}
      />
    </>
  );
}
