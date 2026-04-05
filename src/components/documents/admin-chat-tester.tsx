"use client";

import { useState } from "react";
import {
  MessageSquare,
  Minus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/hooks/use-chat";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

interface AdminChatTesterProps {
  churchId: string;
  churchName: string;
  indexedCount: number;
  processingCount: number;
}

export function AdminChatTester({
  churchId,
  churchName,
  indexedCount,
  processingCount,
}: AdminChatTesterProps) {
  const [open, setOpen] = useState(false);
  const { messages, input, setInput, isLoading, error, sendMessage, reset } =
    useChat({ churchId, churchName, isAdminTest: true });

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 gap-2 shadow-lg"
      >
        <MessageSquare className="h-4 w-4" />
        Chat Preview
      </Button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 z-40 flex h-[100dvh] w-full flex-col overflow-hidden border bg-background shadow-2xl sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[400px] sm:rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Chat Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={reset}
            title="New chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setOpen(false)}
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {indexedCount} indexed
        </span>
        {processingCount > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            {processingCount} processing
          </span>
        )}
      </div>

      {/* Messages or empty state */}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Preview your assistant</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask a question to see how the AI responds using your indexed
              documents.
            </p>
          </div>
        </div>
      ) : (
        <ChatMessages messages={messages} isStreaming={isLoading} />
      )}

      {error && (
        <div className="mx-3 mb-2 rounded border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-[10px] text-destructive">
          {error}
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        isLoading={isLoading}
        placeholder="Test a question..."
      />
    </div>
  );
}
