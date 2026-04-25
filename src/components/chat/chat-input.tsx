"use client";

import { useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { MAX_USER_MESSAGE_CHARS } from "@/lib/chat/limits";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "What would you like to know?",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  // Char-limit enforcement mirrors the server check in /api/chat. The
  // textarea uses `maxLength` as the first line of defense; the
  // counter + disabled submit give visible feedback; the server-side
  // check in the route handler is authoritative.
  const length = value.length;
  const overLimit = length > MAX_USER_MESSAGE_CHARS;
  const nearLimit = length > MAX_USER_MESSAGE_CHARS - 100;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim() && !overLimit) {
        onSubmit();
      }
    }
  }

  return (
    <div className="border-t bg-background/80 px-4 py-2 backdrop-blur-sm">
      <div className="relative mx-auto max-w-3xl">
        <div className="flex items-end rounded-2xl border bg-card shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/20">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            maxLength={MAX_USER_MESSAGE_CHARS}
            className="min-h-[52px] flex-1 resize-none bg-transparent px-4 py-3.5 pr-14 text-base outline-none scrollbar-none placeholder:text-muted-foreground/50"
            style={{ scrollbarWidth: "none" }}
            disabled={isLoading}
          />
          <button
            onClick={onSubmit}
            disabled={isLoading || !value.trim() || overLimit}
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[10px] leading-tight text-muted-foreground/40">
          <p>
            <a
              href="/privacy"
              target="_blank"
              className="underline hover:text-muted-foreground/60"
            >
              Privacy Policy
            </a>
            {" · "}
            <a
              href="/terms"
              target="_blank"
              className="underline hover:text-muted-foreground/60"
            >
              Terms of Use
            </a>
          </p>
          <p
            className={
              overLimit
                ? "font-semibold text-red-500"
                : nearLimit
                  ? "text-amber-500"
                  : "text-muted-foreground/40"
            }
            aria-live="polite"
          >
            {length}/{MAX_USER_MESSAGE_CHARS}
          </p>
        </div>
      </div>
    </div>
  );
}
