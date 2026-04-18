"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookDemoModal } from "./book-demo-modal";

export function BookDemoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        className="h-12 px-5 text-[0.95rem]"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        Book a demo
      </Button>
      <BookDemoModal open={open} onOpenChange={setOpen} />
    </>
  );
}
